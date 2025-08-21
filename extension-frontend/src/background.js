// // A central place for the backend URL
// const BACKEND_URL = "http://localhost:3001";

// // Your Firebase configuration details
// const firebaseConfig = {
//   apiKey: "AIzaSyAB48C7SlqETYyg-j_qauSTJg0x9SbK_wY",
//   authDomain: "alturaai-v2.firebaseapp.com",
//   projectId: "alturaai-v2",
//   storageBucket: "alturaai-v2.firebasestorage.app",
//   messagingSenderId: "288044690778",
//   appId: "1:288044690778:web:b7623518ac26ead4b4d763",
//   measurementId: "G-W4JPR4DMBL",
// };

// // Use Firebase's standalone CDN scripts in the background script.
// import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
// import {
//   getAuth,
//   onIdTokenChanged,
// } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);
// // A central function to handle token errors and prompt re-authentication.
// function handleAuthError() {
//   console.log("🔄 Handling authentication error...");
//   chrome.notifications.create(
//     {
//       type: "basic",
//       iconUrl: "icon.png",
//       title: "AlturaAI Authentication",
//       message: "Your session has expired. Please click to re-authenticate.",
//       requireInteraction: true,
//     },
//     (notificationId) => {
//       chrome.notifications.onClicked.addListener((clickedId) => {
//         if (clickedId === notificationId) {
//           chrome.tabs.create({
//             url: chrome.runtime.getURL("popup.html"),
//           });
//         }
//       });
//     }
//   );
// }

// // Our core API call function. It retrieves the token from storage for each request.
// async function makeAuthenticatedRequest(endpoint, options = {}) {
//   const maxRetries = 3;
//   const retryDelay = 200; // ms

//   for (let i = 0; i < maxRetries; i++) {
//     try {
//       const { idToken } = await chrome.storage.local.get("idToken");

//       // If we don't have a token yet, wait and retry.
//       if (!idToken) {
//         if (i < maxRetries - 1) {
//           console.log(`Token not found on attempt ${i + 1}, retrying...`);
//           await new Promise((resolve) => setTimeout(resolve, retryDelay));
//           continue; // Move to the next loop iteration
//         }
//         throw new Error("User not authenticated.");
//       }

//       // If a token is found, proceed with the fetch call
//       const response = await fetch(`${BACKEND_URL}${endpoint}`, {
//         ...options,
//         headers: {
//           ...options.headers,
//           Authorization: `Bearer ${idToken}`,
//           "Content-Type": "application/json",
//         },
//       });

//       if (!response.ok) {
//         if (response.status === 401) {
//           handleAuthError();
//           throw new Error("Session expired. Please log in again.");
//         }
//         throw new Error(
//           `API Error: ${response.status} ${await response.text()}`
//         );
//       }
//       return response;
//     } catch (error) {
//       console.error(`API call failed on attempt ${i + 1}:`, error);
//       if (i === maxRetries - 1) {
//         throw error;
//       }
//       await new Promise((resolve) => setTimeout(resolve, retryDelay));
//     }
//   }
// }

// // A helper function to check if the backend is running.
// async function checkBackendHealth() {
//   try {
//     const response = await fetch(`${BACKEND_URL}/health`, {
//       method: "GET",
//       timeout: 5000,
//     });
//     return response.ok;
//   } catch (error) {
//     console.error("Backend health check failed:", error);
//     return false;
//   }
// }

// // The main authentication check function.
// const checkAuthStatus = async () => {
//   try {
//     const { idToken } = await chrome.storage.local.get("idToken");
//     if (!idToken) {
//       console.warn("No authentication token found. User needs to log in.");
//       return;
//     }

//     const response = await makeAuthenticatedRequest("/api/auth/status", {
//       headers: {
//         Authorization: `Bearer ${idToken}`,
//         "Content-Type": "application/json",
//       },
//     });

//     const data = await response.json();
//     console.log("Auth status response:", data);
//     chrome.storage.local.set({
//       isGithubAppInstalled: data.connections.isGithubAppInstalled || false,
//       isNotionConnected: data.connections.isNotionConnected || false,
//       isGoogleLoggedIn: data.connections.isGoogleLoggedIn || false,
//     });
//     console.log("Auth status updated successfully");
//   } catch (error) {
//     console.error("Could not check auth status:", error);
//     if (error.message.includes("fetch")) {
//       console.error("Backend server might not be running on", BACKEND_URL);
//     }
//     chrome.storage.local.set({
//       isGoogleLoggedIn: false,
//       isGithubAppInstalled: false,
//       isNotionConnected: false,
//     });
//   }
// };

// // A helper function for the proactive assistant.
// function isProductPage(url) {
//   if (!url) return false;
//   const productIndicators = [
//     "/dp/",
//     "/gp/product/",
//     "/p/",
//     "/product/",
//     "/item/",
//     "product-",
//   ];
//   const productKeywords = ["buy", "shop", "product", "item"];
//   return (
//     productIndicators.some((indicator) => url.includes(indicator)) ||
//     productKeywords.some((keyword) => url.includes(keyword))
//   );
// }

// // --- CORE LISTENERS ---

// chrome.runtime.onInstalled.addListener(async (details) => {
//   console.log("🚀 AlturaAI extension installed/updated. Initializing...");
//   console.log("Install reason:", details.reason);
//   chrome.contextMenus.removeAll(() => {
//     console.log("🧹 Cleared existing context menus");
//     chrome.contextMenus.create(
//       {
//         id: "save-snippet",
//         title: "Save Snippet to AlturaAI",
//         contexts: ["selection"],
//         documentUrlPatterns: ["http://*/*", "https://*/*"],
//       },
//       () => {
//         if (chrome.runtime.lastError) {
//           console.error(
//             "❌ Context menu creation error:",
//             chrome.runtime.lastError.message
//           );
//         } else {
//           console.log(
//             "✅ Context menu 'Save Snippet to AlturaAI' created successfully!"
//           );
//         }
//       }
//     );
//   });
//   const isBackendHealthy = await checkBackendHealth();
//   if (!isBackendHealthy) {
//     console.warn(
//       "Backend server appears to be down. Please start your backend server on",
//       BACKEND_URL
//     );
//   }
//   checkAuthStatus();
// });

// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//   if (changeInfo.status === "complete" && tab.url) {
//     chrome.action.setBadgeText({
//       text: "",
//       tabId: tabId,
//     });
//     chrome.storage.local.get(
//       ["isProactiveAssistantOn", "idToken"],
//       (result) => {
//         if (
//           result.isProactiveAssistantOn &&
//           result.idToken &&
//           isProductPage(tab.url)
//         ) {
//           console.log(`Proactive trigger: Detected product page at ${tab.url}`);
//           chrome.action.setBadgeText({
//             text: "...",
//             tabId: tabId,
//           });
//           chrome.action.setBadgeBackgroundColor({
//             color: "#3B82F6",
//             tabId: tabId,
//           });

//           // This callback function must be async
//           chrome.tabs.sendMessage(
//             tabId,
//             {
//               action: "get_product_details",
//             },
//             {
//               frameId: 0,
//             },
//             async (response) => {
//               if (
//                 chrome.runtime.lastError ||
//                 !response ||
//                 !response.success ||
//                 !response.content
//               ) {
//                 console.error(
//                   "Proactive assistant failed to get product details:",
//                   chrome.runtime.lastError?.message || response?.error
//                 );
//                 chrome.action.setBadgeText({
//                   text: "!",
//                   tabId: tabId,
//                 });
//                 chrome.action.setBadgeBackgroundColor({
//                   color: "#EF4444",
//                   tabId: tabId,
//                 });
//                 return;
//               }
//               try {
//                 console.log(`Product detected: ${response.productName}`);
//                 const apiResponse = await makeAuthenticatedRequest(
//                   "/api/products/analyze",
//                   {
//                     method: "POST",
//                     body: JSON.stringify({
//                       productName: response.productName,
//                     }),
//                   }
//                 );
//                 const analysis = await apiResponse.json();
//                 if (analysis.success) {
//                   chrome.storage.local.set({
//                     [`analysis_for_${tabId}`]: {
//                       productName: analysis.productName,
//                       analysis: analysis.data.analysis,
//                       url: tab.url,
//                       timestamp: Date.now(),
//                     },
//                   });
//                   chrome.action.setBadgeText({
//                     text: "✓",
//                     tabId: tabId,
//                   });
//                   chrome.action.setBadgeBackgroundColor({
//                     color: "#22C55E",
//                     tabId: tabId,
//                   });
//                 } else {
//                   throw new Error(analysis.error || "Analysis failed");
//                 }
//               } catch (error) {
//                 console.error("Proactive analysis API call failed:", error);
//                 chrome.action.setBadgeText({
//                   text: "!",
//                   tabId: tabId,
//                 });
//                 chrome.action.setBadgeBackgroundColor({
//                   color: "#EF4444",
//                   tabId: tabId,
//                 });
//               }
//             }
//           );
//         }
//       }
//     );
//   }
// });

// // Listener for tab removal to clear up storage.
// chrome.tabs.onRemoved.addListener((tabId) => {
//   chrome.storage.local.remove(`analysis_for_${tabId}`);
// });

// // Listener for the "Save Snippet" context menu action.
// chrome.contextMenus.onClicked.addListener(async (info, tab) => {
//   console.log("🖱️ Context menu clicked:", info.menuItemId);
//   console.log("Selected text:", info.selectionText);

//   if (info.menuItemId === "save-snippet" && info.selectionText) {
//     handleSnippetSave(info, tab);
//   }
// });

// // Move your snippet saving logic to a separate function for better debugging
// async function handleSnippetSave(info, tab) {
//   console.log("💾 Starting snippet save process...");
//   console.log("Text to save:", info.selectionText);
//   console.log("Source URL:", tab.url);

//   try {
//     const response = await makeAuthenticatedRequest("/api/snippets/save", {
//       method: "POST",
//       body: JSON.stringify({
//         snippetText: info.selectionText,
//         sourceUrl: tab.url,
//       }),
//     });

//     const data = await response.json();
//     console.log("📤 API response:", data);

//     if (data.success) {
//       console.log("✅ Snippet saved successfully!");
//       chrome.notifications.create({
//         type: "basic",
//         iconUrl: "icon.png",
//         title: "Snippet Saved",
//         message: "Your text snippet has been saved successfully!",
//       });
//     } else {
//       throw new Error(data.error || "Failed to save snippet");
//     }
//   } catch (error) {
//     console.error("❌ Error saving snippet:", error);
//     if (!error.message.includes("Session expired")) {
//       chrome.notifications.create({
//         type: "basic",
//         iconUrl: "icon.png",
//         title: "Error",
//         message: error.message || "Failed to save snippet",
//       });
//     }
//   }
// }

// // In background.js, replace your existing chrome.runtime.onMessage.addListener with this:
// chrome.tabs.onRemoved.addListener((tabId) => {
//   chrome.storage.local.remove(`analysis_for_${tabId}`);
// });

// // Listener for the "Save Snippet" context menu action.
// chrome.contextMenus.onClicked.addListener(async (info, tab) => {
//   console.log("🖱️ Context menu clicked:", info.menuItemId);
//   console.log("Selected text:", info.selectionText);

//   if (info.menuItemId === "save-snippet" && info.selectionText) {
//     handleSnippetSave(info, tab);
//   }
// });

// // Move your snippet saving logic to a separate function for better debugging
// async function handleSnippetSave(info, tab) {
//   console.log("💾 Starting snippet save process...");
//   console.log("Text to save:", info.selectionText);
//   console.log("Source URL:", tab.url);

//   try {
//     const response = await makeAuthenticatedRequest("/api/snippets/save", {
//       method: "POST",
//       body: JSON.stringify({
//         snippetText: info.selectionText,
//         sourceUrl: tab.url,
//       }),
//     });

//     const data = await response.json();
//     console.log("📤 API response:", data);

//     if (data.success) {
//       console.log("✅ Snippet saved successfully!");
//       chrome.notifications.create({
//         type: "basic",
//         iconUrl: "icon.png",
//         title: "Snippet Saved",
//         message: "Your text snippet has been saved successfully!",
//       });
//     } else {
//       throw new Error(data.error || "Failed to save snippet");
//     }
//   } catch (error) {
//     console.error("❌ Error saving snippet:", error);
//     if (!error.message.includes("Session expired")) {
//       chrome.notifications.create({
//         type: "basic",
//         iconUrl: "icon.png",
//         title: "Error",
//         message: error.message || "Failed to save snippet",
//       });
//     }
//   }
// }

// // Helper function to inject content script if needed
// async function ensureContentScriptInjected(tabId) {
//   try {
//     // Try to ping the content script first
//     const response = await chrome.tabs.sendMessage(tabId, { action: "ping" });
//     return true;
//   } catch (error) {
//     // Content script not injected, inject it
//     try {
//       await chrome.scripting.executeScript({
//         target: { tabId: tabId },
//         files: ["content.js"],
//       });
//       return true;
//     } catch (injectionError) {
//       console.error("Failed to inject content script:", injectionError);
//       return false;
//     }
//   }
// }

// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   console.log("Background script received a message:", request);

//   // Handle async operations properly
//   const handleAsync = async () => {
//     switch (request.action) {
//       case "summarize_page":
//       case "draft_email":
//       case "create_notion_doc": {
//         try {
//           const tabs = await chrome.tabs.query({
//             active: true,
//             currentWindow: true,
//           });
//           const activeTab = tabs[0];

//           if (!activeTab) {
//             return { error: "No active tab found." };
//           }

//           // Ensure content script is injected
//           const scriptInjected = await ensureContentScriptInjected(
//             activeTab.id
//           );
//           if (!scriptInjected) {
//             return {
//               error:
//                 "Could not inject content script. Please refresh the page and try again.",
//             };
//           }

//           // Add timeout to prevent hanging
//           const pageResponse = await new Promise((resolve, reject) => {
//             const timeout = setTimeout(() => {
//               reject(new Error("Timeout waiting for page content"));
//             }, 10000); // 10 second timeout

//             chrome.tabs.sendMessage(
//               activeTab.id,
//               { action: "get_page_content" },
//               (response) => {
//                 clearTimeout(timeout);
//                 if (chrome.runtime.lastError) {
//                   reject(new Error(chrome.runtime.lastError.message));
//                 } else {
//                   resolve(response);
//                 }
//               }
//             );
//           });

//           if (!pageResponse || !pageResponse.content) {
//             return {
//               error:
//                 "Could not get page content. Try refreshing the page and ensuring the content script is loaded.",
//             };
//           }

//           let endpoint = "";
//           let body = {};
//           if (request.action === "summarize_page") {
//             endpoint = "/api/summarize";
//             body = { text: pageResponse.content };
//           } else if (request.action === "draft_email") {
//             endpoint = "/api/gmail/draft";
//             body = { pageContent: pageResponse.content };
//           } else if (request.action === "create_notion_doc") {
//             endpoint = "/api/notion/create";
//             body = { pageContent: pageResponse.content };
//           }

//           const response = await makeAuthenticatedRequest(endpoint, {
//             method: "POST",
//             body: JSON.stringify(body),
//           });

//           const data = await response.json();
//           return data;
//         } catch (err) {
//           console.error("Error in page content operation:", err);
//           return {
//             error: err.message || "An authenticated request failed.",
//           };
//         }
//       }

//       case "debug_page": {
//         try {
//           const tabs = await chrome.tabs.query({
//             active: true,
//             currentWindow: true,
//           });
//           const activeTab = tabs[0];

//           if (!activeTab) {
//             return { error: "No active tab found." };
//           }

//           // Ensure content script is injected
//           const scriptInjected = await ensureContentScriptInjected(
//             activeTab.id
//           );
//           if (!scriptInjected) {
//             return {
//               error:
//                 "Could not inject content script. Please refresh the page and try again.",
//             };
//           }

//           const pageResponse = await new Promise((resolve, reject) => {
//             const timeout = setTimeout(() => {
//               reject(new Error("Timeout waiting for page debug info"));
//             }, 10000);

//             chrome.tabs.sendMessage(
//               activeTab.id,
//               { action: "debug_page" },
//               (response) => {
//                 clearTimeout(timeout);
//                 if (chrome.runtime.lastError) {
//                   reject(new Error(chrome.runtime.lastError.message));
//                 } else {
//                   resolve(response);
//                 }
//               }
//             );
//           });

//           if (!pageResponse || !pageResponse.pageHtml) {
//             return {
//               error: "Failed to get page HTML for debugging.",
//             };
//           }

//           const endpoint = "/api/debug/webpage";
//           const body = {
//             pageHtml: pageResponse.pageHtml,
//             consoleErrors: pageResponse.consoleErrors,
//           };

//           const response = await makeAuthenticatedRequest(endpoint, {
//             method: "POST",
//             body: JSON.stringify(body),
//           });

//           const data = await response.json();
//           return data;
//         } catch (err) {
//           console.error("Error in debug page operation:", err);
//           return {
//             error: err.message || "Debug request failed.",
//           };
//         }
//       }

//       case "compose_content": {
//         try {
//           const endpoint = "/api/ai/compose";
//           const body = { userRequest: request.userRequest };

//           const response = await makeAuthenticatedRequest(endpoint, {
//             method: "POST",
//             body: JSON.stringify(body),
//           });

//           const data = await response.json();
//           return data;
//         } catch (err) {
//           console.error("Error in compose content:", err);
//           return {
//             error: err.message || "Compose request failed.",
//           };
//         }
//       }

//       default:
//         console.error("Unrecognized action received:", request.action);
//         return { error: `Unrecognized action: ${request.action}` };
//     }
//   };

//   // Execute async handler and send response
//   handleAsync()
//     .then((result) => {
//       sendResponse(result);
//     })
//     .catch((error) => {
//       console.error("Async handler error:", error);
//       sendResponse({ error: error.message || "Unknown error occurred" });
//     });

//   // Return true to indicate we will respond asynchronously
//   return true;
// });
// --- Imports and Firebase Initialization ---
const BACKEND_URL = "http://localhost:3001";
const firebaseConfig = {
  apiKey: "AIzaSyAB48C7SlqETYyg-j_qauSTJg0x9SbK_wY",
  authDomain: "alturaai-v2.firebaseapp.com",
  projectId: "alturaai-v2",
  storageBucket: "alturaai-v2.firebasestorage.app",
  messagingSenderId: "288044690778",
  appId: "1:288044690778:web:b7623518ac26ead4b4d763",
  measurementId: "G-W4JPR4DMBL",
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getAuth,
  onIdTokenChanged,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// State management
const injectedTabs = new Set();

// SINGLE auth listener - onIdTokenChanged is the single source of truth
onIdTokenChanged(auth, async (user) => {
  if (user) {
    try {
      const idToken = await user.getIdToken();
      await chrome.storage.local.set({ idToken });
      console.log("🔐 Auth state changed: logged in, token stored.");
      await checkAuthStatus();
    } catch (error) {
      console.error("❌ Error storing token:", error);
      await chrome.storage.local.remove("idToken");
    }
  } else {
    await chrome.storage.local.remove("idToken");
    console.log("🔐 Auth state changed: logged out, token removed.");
    // Clear connection status when logged out
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
  const { idToken } = await chrome.storage.local.get("idToken");

  if (!idToken) {
    handleAuthError();
    throw new Error(
      "Please log in through the AlturaAI extension popup to use this feature."
    );
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${idToken}`,
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

      // Handle actions that require page content
      if (
        [
          "summarize_page",
          "draft_email",
          "create_notion_doc",
          "debug_page",
          "compose_content",
        ].includes(request.action)
      ) {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        activeTab = tabs[0];
        if (!activeTab) throw new Error("No active tab found.");

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
        if (!pageResponse?.success)
          throw new Error(pageResponse?.error || "Failed to get page content.");
        pageContent = pageResponse.content;
      }
      if (request.action === "notion_auth_start") {
        const notionCallbackUrl =
          "http://localhost:3001/auth-success.html?provider=notion";

        // Listen for the tab to close. This is a robust way to handle the callback.
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
        return true;
      }
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
        case "debug_page":
          endpoint = "/api/debug/webpage";
          body = { pageHtml: pageContent, consoleErrors: [] }; // consoleErrors handled in content.js
          break;
        // ------------------------------------------
        case "get_next_action":
          try {
            // Get the user's last 5 visited sites from Chrome history
            const historyItems = await chrome.history.search({
              text: "",
              maxResults: 5,
              startTime: Date.now() - 3600000, // Last 1 hour
            });
            const history = historyItems.map((item) => ({
              title: item.title,
              url: item.url,
            }));

            const response = await makeAuthenticatedRequest(
              "/api/ai/momentum",
              {
                method: "POST",
                body: JSON.stringify({ history }),
                headers: { "Content-Type": "application/json" },
              }
            );

            const data = await response.json();
            sendResponse(data);
          } catch (err) {
            sendResponse({
              error: err.message || "An unexpected error occurred.",
            });
          }
          return true; // Keep the message port open

        // --------------------------------------
        case "compose_content":
          // Add validation for required fields
          if (!pageContent) {
            throw new Error(
              "Page content is required for compose_content action."
            );
          }
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
        default:
          throw new Error(`Unrecognized action: ${request.action}`);
      }

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
      } else {
        throw new Error("Invalid action provided.");
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
    const response = await makeAuthenticatedRequest("/api/auth/status");
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
