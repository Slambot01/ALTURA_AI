// --- Imports and Firebase Initialization ---
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

// import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
// import {
//   getAuth,
//   onIdTokenChanged,
// } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);

// State management
const injectedTabs = new Set();

// SINGLE auth listener - onIdTokenChanged is the single source of truth
chrome.identity.onSignInChanged.addListener(async (account, signedIn) => {
  console.log("🔐 Chrome Identity state changed:", signedIn);

  if (signedIn) {
    try {
      const result = await chrome.storage.local.get(["authToken"]);
      if (result.authToken) {
        console.log("🔐 Auth state changed: logged in, token found.");
        await checkAuthStatus();
      }
    } catch (error) {
      console.error("❌ Error checking stored token:", error);
    }
  } else {
    await chrome.storage.local.remove([
      "authToken",
      "userInfo",
      "isAuthenticated",
    ]);
    console.log("🔐 Auth state changed: logged out, token removed.");

    await chrome.storage.local.set({
      isGoogleLoggedIn: false,
      isGithubAppInstalled: false,
      isNotionConnected: false,
    });
  }
});

// Simplified auth error handling
function handleAuthError() {
  console.log("🔄 Handling authentication error...");
  chrome.storage.local.remove("idToken");

  chrome.notifications.create(
    {
      type: "basic",
      iconUrl: "icon.png",
      title: "AlturaAI Authentication",
      message: "Your session has expired. Please click to re-authenticate.",
      requireInteraction: true,
    },
    (notificationId) => {
      chrome.notifications.onClicked.addListener((clickedId) => {
        if (clickedId === notificationId) {
          chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
        }
      });
    }
  );
}

// Simplified API call function - token comes from storage only
async function makeAuthenticatedRequest(endpoint, options = {}) {
  const storage = await chrome.storage.local.get(["idToken", "authToken"]);
  // Try Firebase first, then Chrome Identity
  const token = storage.authToken || storage.idToken;
  if (!token) {
    handleAuthError();
    throw new Error(
      "Please log in through the AlturaAI extension popup to use this feature."
    );
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      handleAuthError();
      throw new Error("Session expired. Please log in again.");
    }

    const responseText = await response.text();
    throw new Error(`API Error: ${response.status} ${responseText}`);
  }

  return response;
}

// Content script management
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
// Add this function to your Chrome extension's background.js

async function getValidToken() {
  try {
    // First, try to get cached token
    let token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(token);
        }
      });
    });

    if (!token) {
      // No cached token, get new one interactively
      token = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(token);
          }
        });
      });
    }

    // Test token validity by making a quick API call
    const response = await fetch(`${BACKEND_URL}/api/auth/status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401) {
      console.log("Token expired, refreshing...");

      // Remove expired token from cache
      chrome.identity.removeCachedAuthToken({ token: token });

      // Get fresh token
      token = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (newToken) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(newToken);
          }
        });
      });
    }

    return token;
  } catch (error) {
    console.error("Error getting valid token:", error);

    // Last resort: clear all cached tokens and get fresh one
    chrome.identity.clearAllCachedAuthTokens(() => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        return token;
      });
    });
  }
}

// Replace your existing API call functions with this pattern:
async function makeAuthenticatedAPICall(endpoint, options = {}) {
  const token = await getValidToken();
  console.log(`Sending token to ${endpoint}:`, token);
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // If still getting 401, try one more time with fresh token
  if (response.status === 401) {
    chrome.identity.removeCachedAuthToken({ token: token });
    const newToken = await getValidToken();

    return fetch(`${BACKEND_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${newToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  }

  return response;
}

// Example usage - replace your direct fetch calls with this:
// OLD: fetch(`${BACKEND_URL}/api/notifications`, {headers: {Authorization: `Bearer ${token}`}})
// NEW: makeAuthenticatedAPICall('/api/notifications')
// In background.js, replace your entire chrome.runtime.onMessage.addListener block with this:
// Replace your chrome.runtime.onMessage.addListener block with this fixed version:
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

      // Handle debug_page separately since it needs special handling
      if (request.action === "debug_page") {
        const debugTabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

        if (!debugTabs || debugTabs.length === 0) {
          throw new Error("No active tab found for debugging.");
        }

        const debugTab = debugTabs[0];

        // Ensure content script is injected
        await ensureContentScript(debugTab.id, debugTab.url);

        // Get debug info from content script
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
      // Handle notion auth separately
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
        return true;
      }
      // Handle get_next_action separately
      // Handle get_next_action separately
      else if (request.action === "get_next_action") {
        try {
          const historyItems = await chrome.history.search({
            text: "",
            maxResults: 5,
            startTime: Date.now() - 3600000,
          });
          const history = historyItems.map((item) => ({
            title: item.title,
            url: item.url,
          }));

          const response = await makeAuthenticatedRequest("/api/ai/momentum", {
            method: "POST",
            body: JSON.stringify({ history }),
            headers: { "Content-Type": "application/json" },
          });

          const data = await response.json();
          sendResponse(data);
        } catch (err) {
          sendResponse({
            error: err.message || "An unexpected error occurred.",
          });
        }
        return true;
      }
      // ADD THIS NEW SECTION HERE:
      // Handle Chrome Identity API authentication success
      else if (request.action === "AUTH_SUCCESS") {
        console.log("✅ Chrome Identity authentication successful!");
        console.log("User Info:", request.userInfo);

        try {
          // Store authentication data
          await chrome.storage.local.set({
            authToken: request.token,
            userInfo: request.userInfo,
            isAuthenticated: true,
          });

          // Update extension badge to show success
          chrome.action.setBadgeText({ text: "✓" });
          chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });

          // Check auth status to update connection states
          await checkAuthStatus();

          console.log("🔐 Chrome Identity auth data stored successfully");
          sendResponse({ success: true, message: "Authentication successful" });
        } catch (error) {
          console.error("Error storing Chrome Identity auth data:", error);
          sendResponse({ success: false, error: error.message });
        }
        return true;
      }
      // Handle actions that require page content
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

        // Ensure content script is injected for these actions too
        await ensureContentScript(activeTab.id, activeTab.url);

        const pageResponse = await new Promise((resolve, reject) => {
          chrome.tabs.sendMessage(
            activeTab.id,
            { action: "get_page_content" },
            (res) => {
              if (chrome.runtime.lastError) {
                reject(
                  new Error(
                    res?.error ||
                      "Content script error. Try refreshing the page."
                  )
                );
              } else {
                resolve(res);
              }
            }
          );
        });

        if (!pageResponse?.success) {
          throw new Error(pageResponse?.error || "Failed to get page content.");
        }

        pageContent = pageResponse.content;

        // Set endpoint and body for each action
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
            console.log("📝 Compose content request:", {
              pageContentLength: pageContent?.length || 0,
              userRequest: request.userRequest,
            });
            break;
        }
      } else if (request.action === "AUTH_SUCCESS") {
        console.log("✅ Auth success received");
        sendResponse({ success: true });
        return true;
      } else if (request.action === "LOGOUT") {
        (async () => {
          console.log("Logout request received. Clearing auth data.");
          // Get the token so we can remove it from Chrome's cache
          const { authToken } = await chrome.storage.local.get("authToken");
          if (authToken) {
            chrome.identity.removeCachedAuthToken({ token: authToken });
          }
          // Clear our authentication state from storage.
          // Your React UI's listener will detect this change and update the screen.
          await chrome.storage.local.set({
            isAuthenticated: false,
            userInfo: null,
            authToken: null,
          });
          sendResponse({ success: true });
        })();
        return true; // Required for async operations
      } else {
        throw new Error(`Unrecognized action: ${request.action}`);
      }
      // Make API request if endpoint is set
      if (endpoint) {
        console.log(
          "🌐 Making API request to:",
          endpoint,
          "with body keys:",
          Object.keys(body)
        );

        const response = await makeAuthenticatedRequest(endpoint, {
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
// Core listeners
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

  // Check auth status after Firebase has had time to initialize
  setTimeout(checkAuthStatus, 1000);
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "save-snippet" && info.selectionText) {
    try {
      await makeAuthenticatedRequest("/api/snippets/save", {
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

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    chrome.action.setBadgeText({ text: "", tabId });

    chrome.storage.local.get(
      ["isProactiveAssistantOn", "idToken"],
      (result) => {
        if (
          result.isProactiveAssistantOn &&
          result.idToken &&
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
                const apiResponse = await makeAuthenticatedRequest(
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

// FIXED: Properly clean up both analysis data AND injected tabs set
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove(`analysis_for_${tabId}`);
  injectedTabs.delete(tabId); // This fixes the memory leak!
});

// Utility functions
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
    // Use the strong function that can get or refresh a token.
    const response = await makeAuthenticatedAPICall("/api/auth/status");
    const data = await response.json();

    await chrome.storage.local.set({
      isGoogleLoggedIn: data.connections?.isGoogleLoggedIn || false,
      isGithubAppInstalled: data.connections?.isGithubAppInstalled || false,
      isNotionConnected: data.connections?.isNotionConnected || false,
    });
    console.log("✅ Auth status updated successfully");
  } catch (error) {
    console.error("Could not check auth status:", error);
    await chrome.storage.local.set({
      isGoogleLoggedIn: false,
      isGithubAppInstalled: false,
      isNotionConnected: false,
    });
  }
}
// Cleanup old analysis data periodically
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
