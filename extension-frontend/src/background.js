// --- Imports and Configuration ---
const BACKEND_URL = "https://alturaai-production.up.railway.app";
const firebaseConfig = {
  apiKey: "AIzaSyAB48C7SlqETYyg-j_qauSTJg0x9SbK_wY",
  authDomain: "alturaai-v2.firebaseapp.com",
  projectId: "alturaai-v2",
  storageBucket: "alturaai-v2.firebasestorage.app",
  messagingSenderId: "288044690778",
  appId: "1:288044690778:web:b7623518ac26ead4b4d763",
  measurementId: "G-W4JPR4DMBL",
};

// State management
const injectedTabs = new Set();

// --- Authentication Listeners ---
chrome.identity.onSignInChanged.addListener(async (account, signedIn) => {
  console.log("🔐 Chrome Identity state changed:", signedIn);

  if (signedIn) {
    try {
      // Just check if we have authentication state
      const result = await chrome.storage.local.get(["isAuthenticated"]);
      if (result.isAuthenticated) {
        console.log("🔐 Auth state changed: logged in.");
        await checkAuthStatus();
      }
    } catch (error) {
      console.error("❌ Error checking auth state:", error);
    }
  } else {
    await chrome.storage.local.clear();
    console.log("🔐 Auth state changed: logged out, data cleared.");

    await chrome.storage.local.set({
      isGoogleLoggedIn: false,
      isGithubAppInstalled: false,
      isNotionConnected: false,
    });
  }
});

// --- Content Script Management ---
async function isContentScriptReady(tabId) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 1000);

    chrome.tabs.sendMessage(tabId, { action: "ping" }, (response) => {
      clearTimeout(timeout);
      if (chrome.runtime.lastError) {
        resolve(false);
      } else {
        resolve(response?.status === "ready");
      }
    });
  });
}

async function ensureContentScript(tabId, url) {
  // Check if already injected
  if (injectedTabs.has(tabId)) {
    const isReady = await isContentScriptReady(tabId);
    if (isReady) return true;
    // If not ready, remove from set and try to inject again
    injectedTabs.delete(tabId);
  }

  // Don't inject on restricted pages
  if (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("about:") ||
    url.startsWith("file://")
  ) {
    throw new Error("Cannot access this page type");
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });

    // Wait for script to initialize
    await new Promise((resolve) => setTimeout(resolve, 300));

    const isReady = await isContentScriptReady(tabId);
    if (!isReady) {
      throw new Error("Content script failed to initialize");
    }

    // Only add to set if injection was successful
    injectedTabs.add(tabId);
    return true;
  } catch (error) {
    throw new Error(`Cannot access this page: ${error.message}`);
  }
}

async function sendMessageToContentScript(tabId, message) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Content script response timeout"));
    }, 5000);

    chrome.tabs.sendMessage(tabId, message, (response) => {
      clearTimeout(timeout);
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (!response) {
        reject(new Error("No response from content script"));
      } else if (response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
}

// --- API Authentication ---
async function makeAuthenticatedAPICall(endpoint, options = {}) {
  try {
    // Use Chrome Identity API to get fresh token
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(token);
        }
      });
    });

    if (!token) {
      throw new Error("No authentication token available - please log in");
    }

    console.log("🔑 Using Chrome Identity token for API call to:", endpoint);

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API call failed:", response.status, errorText);

      if (response.status === 401) {
        // Clear Chrome's cached token if unauthorized
        chrome.identity.removeCachedAuthToken({ token });
        throw new Error("Authentication expired - please log in again");
      }

      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    return response;
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

// --- Message Handler ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(
    "📨 Background script received message:",
    request.action,
    request
  );

  const handleMessage = async () => {
    try {
      let endpoint = "";
      let body = {};
      let responseData = {};
      let pageContent = null;
      let activeTab = null;

      // Handle debug_page
      if (request.action === "debug_page") {
        const debugTabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

        if (!debugTabs || debugTabs.length === 0) {
          throw new Error("No active tab found for debugging.");
        }

        const debugTab = debugTabs[0];
        await ensureContentScript(debugTab.id, debugTab.url);
        const debugResponse = await sendMessageToContentScript(debugTab.id, {
          action: "debug_page",
        });

        if (!debugResponse?.success) {
          throw new Error(debugResponse?.error || "Failed to get debug info.");
        }

        endpoint = "/api/debug/webpage";
        body = {
          pageHtml: debugResponse.pageHtml,
          consoleErrors: debugResponse.consoleErrors,
          url: debugResponse.url,
          title: debugResponse.title,
          userAgent: debugResponse.userAgent,
          viewport: debugResponse.viewport,
        };
      }
      // Handle Notion auth
      else if (request.action === "notion_auth_start") {
        const notionCallbackUrl = `${BACKEND_URL}/auth-success.html?provider=notion`;
        const listener = (tabId, changeInfo, tab) => {
          if (
            tab.url === notionCallbackUrl &&
            changeInfo.status === "complete"
          ) {
            console.log(
              "Notion callback page loaded. Re-checking auth status..."
            );
            checkAuthStatus();
            chrome.tabs.onUpdated.removeListener(listener);
          }
        };

        chrome.tabs.onUpdated.addListener(listener);
        sendResponse({ success: true });
        return;
      }
      // Handle get_next_action
      else if (request.action === "get_next_action") {
        const historyItems = await chrome.history.search({
          text: "",
          maxResults: 5,
          startTime: Date.now() - 3600000,
        });
        const history = historyItems.map((item) => ({
          title: item.title,
          url: item.url,
        }));

        const response = await makeAuthenticatedAPICall("/api/ai/momentum", {
          method: "POST",
          body: JSON.stringify({ history }),
          headers: { "Content-Type": "application/json" },
        });

        responseData = await response.json();
      }
      // Handle authentication success
      else if (request.action === "AUTH_SUCCESS") {
        console.log("✅ Chrome Identity authentication successful!");
        console.log("User Info:", request.userInfo);

        // Only store user info and auth state - Chrome Identity manages tokens
        await chrome.storage.local.set({
          userInfo: request.userInfo,
          isAuthenticated: true,
        });

        chrome.action.setBadgeText({ text: "✓" });
        chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });

        // Check auth status after a brief delay
        setTimeout(async () => {
          await checkAuthStatus();
        }, 100);

        console.log("🔐 Chrome Identity auth data stored successfully");
        responseData = { success: true, message: "Authentication successful" };
      }
      // Handle page content actions
      else if (
        [
          "summarize_page",
          "draft_email",
          "create_notion_doc",
          "compose_content",
        ].includes(request.action)
      ) {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        activeTab = tabs[0];
        if (!activeTab) throw new Error("No active tab found.");

        await ensureContentScript(activeTab.id, activeTab.url);
        const pageResponse = await sendMessageToContentScript(activeTab.id, {
          action: "get_page_content",
        });

        if (!pageResponse?.success) {
          throw new Error(pageResponse?.error || "Failed to get page content.");
        }
        pageContent = pageResponse.content;

        switch (request.action) {
          case "summarize_page":
            endpoint = "/api/summarize";
            body = { text: pageContent };
            break;
          case "draft_email":
            endpoint = "/api/gmail/draft";
            body = { pageContent };
            break;
          case "create_notion_doc":
            endpoint = "/api/notion/create";
            body = { pageContent };
            break;
          case "compose_content":
            if (!request.userRequest || request.userRequest.trim() === "") {
              throw new Error(
                "User request is required for compose_content action."
              );
            }
            endpoint = "/api/ai/compose";
            body = {
              pageContent,
              userRequest: request.userRequest.trim(),
            };
            break;
        }
      }
      // Handle logout
      else if (request.action === "LOGOUT") {
        console.log("Logout request received. Clearing auth data.");

        // Get current token to remove it from Chrome's cache
        try {
          const token = await new Promise((resolve) => {
            chrome.identity.getAuthToken({ interactive: false }, (token) => {
              resolve(token);
            });
          });

          if (token) {
            chrome.identity.removeCachedAuthToken({ token });
          }
        } catch (error) {
          console.log("No token to remove:", error.message);
        }

        // Clear all stored data
        await chrome.storage.local.clear();
        await chrome.storage.local.set({
          isAuthenticated: false,
          isGoogleLoggedIn: false,
          isGithubAppInstalled: false,
          isNotionConnected: false,
        });

        responseData = { success: true };
      } else {
        throw new Error(`Unrecognized action: ${request.action}`);
      }

      // Make API request if endpoint is set
      if (endpoint) {
        console.log("🌐 Making API request to:", endpoint);

        const response = await makeAuthenticatedAPICall(endpoint, {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        });
        responseData = await response.json();
        console.log("✅ API response received:", responseData);
      }

      sendResponse(responseData);
    } catch (err) {
      console.error("❌ Error handling message:", err);
      sendResponse({ error: err.message || "An unexpected error occurred." });
    }
  };

  handleMessage();
  return true;
});

// --- Extension Lifecycle ---
chrome.runtime.onInstalled.addListener(async () => {
  console.log("🚀 AlturaAI extension installed/updated. Initializing...");

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "save-snippet",
      title: "Save Snippet to AlturaAI",
      contexts: ["selection"],
      documentUrlPatterns: ["http://*/*", "https://*/*"],
    });
  });

  // Check auth status after initialization
  setTimeout(checkAuthStatus, 1000);
});

// --- Context Menu Handler ---
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "save-snippet" && info.selectionText) {
    try {
      await makeAuthenticatedAPICall("/api/snippets/save", {
        method: "POST",
        body: JSON.stringify({
          snippetText: info.selectionText,
          sourceUrl: tab.url,
        }),
      });
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon.png",
        title: "Snippet Saved",
        message: "Your text snippet has been saved successfully!",
      });
    } catch (error) {
      console.error("❌ Error saving snippet:", error);
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon.png",
        title: "Error",
        message: error.message || "Failed to save snippet",
      });
    }
  }
});

// --- Tab Management ---
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    chrome.action.setBadgeText({ text: "", tabId });

    chrome.storage.local.get(
      ["isProactiveAssistantOn", "isAuthenticated"],
      (result) => {
        if (
          result.isProactiveAssistantOn &&
          result.isAuthenticated &&
          isProductPage(tab.url)
        ) {
          console.log(`Proactive trigger: Detected product page at ${tab.url}`);
          chrome.action.setBadgeText({ text: "...", tabId });
          chrome.action.setBadgeBackgroundColor({ color: "#3B82F6", tabId });

          chrome.tabs.sendMessage(
            tabId,
            { action: "get_product_details" },
            { frameId: 0 },
            async (response) => {
              if (chrome.runtime.lastError || !response?.success) {
                console.error(
                  "Proactive assistant failed:",
                  chrome.runtime.lastError?.message || response?.error
                );
                chrome.action.setBadgeText({ text: "!", tabId });
                chrome.action.setBadgeBackgroundColor({
                  color: "#EF4444",
                  tabId,
                });
                return;
              }

              try {
                const apiResponse = await makeAuthenticatedAPICall(
                  "/api/products/analyze",
                  {
                    method: "POST",
                    body: JSON.stringify({ productName: response.productName }),
                  }
                );

                const analysis = await apiResponse.json();
                if (analysis.success) {
                  chrome.storage.local.set({
                    [`analysis_for_${tabId}`]: {
                      ...analysis.data,
                      timestamp: Date.now(),
                      url: tab.url,
                    },
                  });
                  chrome.action.setBadgeText({ text: "✓", tabId });
                  chrome.action.setBadgeBackgroundColor({
                    color: "#22C55E",
                    tabId,
                  });
                } else {
                  throw new Error(analysis.error || "Analysis failed");
                }
              } catch (error) {
                console.error("Proactive analysis failed:", error);
                chrome.action.setBadgeText({ text: "!", tabId });
                chrome.action.setBadgeBackgroundColor({
                  color: "#EF4444",
                  tabId,
                });
              }
            }
          );
        }
      }
    );
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove(`analysis_for_${tabId}`);
  injectedTabs.delete(tabId);
});

// --- Utility Functions ---
function isProductPage(url) {
  if (!url) return false;
  const productIndicators = [
    "/dp/",
    "/gp/product/",
    "/p/",
    "/product/",
    "/item/",
    "product-",
  ];
  const productKeywords = ["buy", "shop", "product", "item"];
  return (
    productIndicators.some((indicator) => url.includes(indicator)) ||
    productKeywords.some((keyword) => url.includes(keyword))
  );
}

async function checkAuthStatus() {
  try {
    // First check if we're authenticated
    const result = await chrome.storage.local.get(["isAuthenticated"]);

    if (!result.isAuthenticated) {
      console.log("Not authenticated, skipping auth status check");
      await chrome.storage.local.set({
        isGoogleLoggedIn: false,
        isGithubAppInstalled: false,
        isNotionConnected: false,
      });
      return;
    }

    console.log("Checking auth status...");
    const response = await makeAuthenticatedAPICall("/api/auth/status");

    const data = await response.json();

    await chrome.storage.local.set({
      isGoogleLoggedIn: data.connections?.isGoogleLoggedIn || false,
      isGithubAppInstalled: data.connections?.isGithubAppInstalled || false,
      isNotionConnected: data.connections?.isNotionConnected || false,
    });

    console.log("✅ Auth status updated successfully");
  } catch (error) {
    console.error("Could not check auth status:", error.message);
    // Set defaults on error
    await chrome.storage.local.set({
      isGoogleLoggedIn: false,
      isGithubAppInstalled: false,
      isNotionConnected: false,
    });
  }
}

// --- Cleanup ---
setInterval(() => {
  chrome.storage.local.get(null, (items) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    Object.keys(items).forEach((key) => {
      if (key.startsWith("analysis_for_") && items[key]?.timestamp < cutoff) {
        chrome.storage.local.remove(key);
      }
    });
  });
}, 60 * 60 * 1000); // Run every hour
