// // *******************
// // The URL of your backend server
// const BACKEND_URL = "http://localhost:3001";

// // This function checks if the user is logged in by asking our backend.
// const checkAuthStatus = async () => {
//   try {
//     const response = await fetch(`${BACKEND_URL}/api/auth/status`);
//     if (!response.ok) {
//       throw new Error(`Server responded with status: ${response.status}`);
//     }
//     const data = await response.json();
//     chrome.storage.local.set({
//       isGoogleLoggedIn: data.isGoogleLoggedIn,
//       isGithubLoggedIn: data.isGithubLoggedIn,
//       isNotionConnected: data.isNotionConnected,
//       isGithubAppInstalled: data.isGithubAppInstalled,
//     });
//     console.log("Auth status checked and updated:", data);
//   } catch (error) {
//     console.error("Could not check auth status:", error);
//     chrome.storage.local.set({
//       isGoogleLoggedIn: false,
//       isGithubLoggedIn: false,
//       isNotionConnected: false,
//       isGithubAppInstalled: false,
//     });
//   }
// };

// // --- Listeners to Trigger Initial Setup and Auth Checks ---

// // Fired when the extension is first installed, updated, or reloaded.
// chrome.runtime.onInstalled.addListener(() => {
//   console.log("AlturaAI extension installed/updated. Initializing...");

//   // 1. Check authentication status on startup
//   checkAuthStatus();

//   // 2. Create the right-click "Save Snippet" menu item
//   chrome.contextMenus.create({
//     id: "save-snippet",
//     title: "Save Snippet to AlturaAI",
//     contexts: ["selection"], // This makes it appear only when you've selected text
//   });
// });

// // Checks auth status after a successful login redirect from the server.
// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//   if (
//     changeInfo.status === "complete" &&
//     tab.url &&
//     (tab.url.includes("localhost:3001/api/auth/google/callback") ||
//       tab.url.includes("localhost:3001/api/auth/github/callback"))
//   ) {
//     console.log("Auth callback tab finished loading. Checking auth status.");
//     // Close the auth tab automatically for a better user experience
//     setTimeout(() => {
//       chrome.tabs.remove(tabId);
//     }, 2000); // Wait 2 seconds before closing
//     checkAuthStatus();
//   }
// });

// // --- Listener for the "Save Snippet" Right-Click Action ---

// chrome.contextMenus.onClicked.addListener((info, tab) => {
//   // Ensure the click was on our "save-snippet" menu item
//   if (info.menuItemId === "save-snippet" && info.selectionText) {
//     const snippetText = info.selectionText;
//     const sourceUrl = tab.url;

//     // Send the data to your backend server
//     fetch(`${BACKEND_URL}/api/snippets/save`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         snippetText: snippetText,
//         sourceUrl: sourceUrl,
//       }),
//     })
//       .then((response) => response.json())
//       .then((data) => {
//         if (data.success) {
//           console.log("Snippet saved successfully!");
//         } else {
//           console.error("Failed to save snippet:", data.error);
//         }
//       })
//       .catch((error) => {
//         console.error("Error sending snippet to backend:", error);
//       });
//   }
// });

// // --- Listener for Messages from the Extension Popup ---

// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   console.log("Background script received a message:", request);

//   if (request.action === "check_auth_status") {
//     checkAuthStatus();
//     sendResponse({ status: "checking" });
//   }
//   // Handle actions that require the full page content
//   else if (
//     [
//       "summarize_page",
//       "draft_email",
//       "create_notion_doc",
//       "compose_content",
//     ].includes(request.action)
//   ) {
//     chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//       const activeTab = tabs[0];
//       if (!activeTab) {
//         sendResponse({ error: "Could not find an active tab." });
//         return;
//       }
//       chrome.tabs.sendMessage(
//         activeTab.id,
//         { action: "get_page_content" },
//         (pageResponse) => {
//           if (
//             chrome.runtime.lastError ||
//             !pageResponse ||
//             !pageResponse.content
//           ) {
//             sendResponse({
//               error: "Could not get page content. Try refreshing the page.",
//             });
//             return;
//           }

//           let endpoint = "";
//           let body = {};
//           if (request.action === "summarize_page") {
//             endpoint = `${BACKEND_URL}/api/summarize`;
//             body = { text: pageResponse.content };
//           } else if (request.action === "draft_email") {
//             endpoint = `${BACKEND_URL}/api/gmail/draft`;
//             body = { pageContent: pageResponse.content };
//           } else if (request.action === "create_notion_doc") {
//             endpoint = `${BACKEND_URL}/api/notion/create`;
//             body = { pageContent: pageResponse.content };
//           } else if (request.action === "compose_content") {
//             endpoint = `${BACKEND_URL}/api/ai/compose`;
//             body = {
//               pageContent: pageResponse.content,
//               userRequest: request.userRequest, // Pass the user's specific request
//             };
//           }

//           fetch(endpoint, {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify(body),
//           })
//             .then((res) => res.json())
//             .then((data) => sendResponse(data))
//             .catch((err) =>
//               sendResponse({
//                 error: "Failed to connect to the backend service.",
//               })
//             );
//         }
//       );
//     });
//   }
//   return true; // Indicates that the response will be sent asynchronously
// });
// The URL of your backend server
const BACKEND_URL = "http://localhost:3001";
// let monitoredTabs = {};

// This function checks if the user is logged in by asking our backend.
const checkAuthStatus = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/status`);
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    const data = await response.json();
    chrome.storage.local.set({
      isGoogleLoggedIn: data.isGoogleLoggedIn,
      isGithubLoggedIn: data.isGithubLoggedIn,
      isNotionConnected: data.isNotionConnected,
      isGithubAppInstalled: data.isGithubAppInstalled,
    });
    console.log("Auth status checked and updated:", data);
  } catch (error) {
    console.error("Could not check auth status:", error);
    chrome.storage.local.set({
      isGoogleLoggedIn: false,
      isGithubLoggedIn: false,
      isNotionConnected: false,
      isGithubAppInstalled: false,
    });
  }
};

// Helper function for the proactive assistant

function isProductPage(url) {
  if (!url) return false;

  const productIndicators = [
    "/dp/", // Amazon product pages
    "/gp/product/", // Amazon
    "/p/", // Flipkart and others
    "/product/", // General
    "/item/", // Some sites
    "product-", // Product in URL
  ];

  const productKeywords = ["buy", "shop", "product", "item"];

  return (
    productIndicators.some((indicator) => url.includes(indicator)) ||
    productKeywords.some((keyword) => url.includes(keyword))
  );
}

// --- Listeners to Trigger Initial Setup and Auth Checks ---

chrome.runtime.onInstalled.addListener(() => {
  console.log("AlturaAI extension installed/updated. Initializing...");
  checkAuthStatus();
  chrome.contextMenus.create({
    id: "save-snippet",
    title: "Save Snippet to AlturaAI",
    contexts: ["selection"],
  });
});

// MERGED: Single listener for all tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    console.log(`Tab updated: ${tab.url}`);

    // Clear any existing badge for this tab first
    chrome.action.setBadgeText({ text: "", tabId: tabId });

    chrome.storage.local.get("isProactiveAssistantOn", (result) => {
      if (result.isProactiveAssistantOn && isProductPage(tab.url)) {
        console.log(`Proactive trigger: Detected product page at ${tab.url}`);

        // Set loading badge
        chrome.action.setBadgeText({ text: "...", tabId: tabId });
        chrome.action.setBadgeBackgroundColor({
          color: "#3B82F6",
          tabId: tabId,
        });

        // Send message to content script with timeout
        chrome.tabs.sendMessage(
          tabId,
          { action: "get_product_details" },
          { frameId: 0 }, // Ensure we're talking to the main frame
          (response) => {
            // Handle chrome.runtime.lastError
            if (chrome.runtime.lastError) {
              console.error(
                "Content script error:",
                chrome.runtime.lastError.message
              );
              chrome.action.setBadgeText({ text: "!", tabId: tabId });
              chrome.action.setBadgeBackgroundColor({
                color: "#EF4444",
                tabId: tabId,
              });
              return;
            }

            if (!response || !response.success) {
              console.log(
                "Failed to get product details:",
                response?.error || "Unknown error"
              );
              chrome.action.setBadgeText({ text: "!", tabId: tabId });
              chrome.action.setBadgeBackgroundColor({
                color: "#EF4444",
                tabId: tabId,
              });
              return;
            }

            console.log(`Product detected: ${response.productName}`);

            // Make API call to analyze product
            fetch(`${BACKEND_URL}/api/products/analyze`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productName: response.productName,
              }),
            })
              .then((res) => {
                if (!res.ok) {
                  throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
                return res.json();
              })
              .then((analysis) => {
                console.log("Analysis received:", analysis);

                if (analysis.success) {
                  // Store the analysis for this tab
                  chrome.storage.local.set({
                    [`analysis_for_${tabId}`]: {
                      productName: response.productName,
                      analysis: analysis.analysis,
                      url: tab.url,
                      timestamp: Date.now(),
                    },
                  });

                  // Set success badge
                  chrome.action.setBadgeText({ text: "✓", tabId: tabId });
                  chrome.action.setBadgeBackgroundColor({
                    color: "#22C55E",
                    tabId: tabId,
                  });
                } else {
                  throw new Error(analysis.error || "Analysis failed");
                }
              })
              .catch((error) => {
                console.error("API call failed:", error);
                chrome.action.setBadgeText({ text: "!", tabId: tabId });
                chrome.action.setBadgeBackgroundColor({
                  color: "#EF4444",
                  tabId: tabId,
                });
              });
          }
        );
      }
    });
  }
});
// Add this listener to clear badge when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove(`analysis_for_${tabId}`);
});

// Add this function to retrieve analysis when popup opens
function getAnalysisForCurrentTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      const tabId = tabs[0].id;
      chrome.storage.local.get(`analysis_for_${tabId}`, (result) => {
        const analysis = result[`analysis_for_${tabId}`];
        callback(analysis || null);
      });
    } else {
      callback(null);
    }
  });
}
// --- Listener for the "Save Snippet" Right-Click Action ---

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "save-snippet" && info.selectionText) {
    const snippetText = info.selectionText;
    const sourceUrl = tab.url;
    fetch(`${BACKEND_URL}/api/snippets/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        snippetText: snippetText,
        sourceUrl: sourceUrl,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          console.log("Snippet saved successfully!");
        } else {
          console.error("Failed to save snippet:", data.error);
        }
      })
      .catch((error) => {
        console.error("Error sending snippet to backend:", error);
      });
  }
});

// --- Listener for Messages from the Extension Popup ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background script received a message:", request);

  if (request.action === "check_auth_status") {
    checkAuthStatus();
    sendResponse({ status: "checking" });
  } else if (
    [
      "summarize_page",
      "draft_email",
      "create_notion_doc",
      "compose_content",
    ].includes(request.action)
  ) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab) {
        sendResponse({ error: "Could not find an active tab." });
        return;
      }
      chrome.tabs.sendMessage(
        activeTab.id,
        { action: "get_page_content" },
        (pageResponse) => {
          if (
            chrome.runtime.lastError ||
            !pageResponse ||
            !pageResponse.content
          ) {
            sendResponse({
              error: "Could not get page content. Try refreshing the page.",
            });
            return;
          }

          let endpoint = "";
          let body = {};
          if (request.action === "summarize_page") {
            endpoint = `${BACKEND_URL}/api/summarize`;
            body = { text: pageResponse.content };
          } else if (request.action === "draft_email") {
            endpoint = `${BACKEND_URL}/api/gmail/draft`;
            body = { pageContent: pageResponse.content };
          } else if (request.action === "create_notion_doc") {
            endpoint = `${BACKEND_URL}/api/notion/create`;
            body = { pageContent: pageResponse.content };
          } else if (request.action === "compose_content") {
            endpoint = `${BACKEND_URL}/api/ai/compose`;
            body = {
              pageContent: pageResponse.content,
              userRequest: request.userRequest,
            };
          }

          fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
            .then((res) => res.json())
            .then((data) => sendResponse(data))
            .catch((err) =>
              sendResponse({
                error: "Failed to connect to the backend service.",
              })
            );
        }
      );
    });
  } else if (request.action === "debug_page") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) {
        sendResponse({ error: "No active tab found." });
        return;
      }
      const target = { tabId: tab.id };
      let consoleErrors = [];
      const onDebuggerEvent = (debuggeeId, message, params) => {
        if (message === "Log.entryAdded" && params.entry.level === "error") {
          consoleErrors.push({
            level: params.entry.level,
            text: params.entry.text,
            url: params.entry.url,
            lineNumber: params.entry.lineNumber,
          });
        }
      };
      chrome.debugger.attach(target, "1.3", () => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
          return;
        }
        chrome.debugger.onEvent.addListener(onDebuggerEvent);
        chrome.debugger.sendCommand(target, "Log.enable", {}, () => {
          chrome.tabs.reload(tab.id, {}, () => {
            setTimeout(() => {
              chrome.debugger.onEvent.removeListener(onDebuggerEvent);
              chrome.debugger.detach(target);
              chrome.tabs.sendMessage(
                tab.id,
                { action: "get_page_content" },
                (pageResponse) => {
                  if (
                    chrome.runtime.lastError ||
                    !pageResponse ||
                    !pageResponse.content
                  ) {
                    sendResponse({
                      error: "Could not get page content for debugging.",
                    });
                    return;
                  }
                  fetch(`${BACKEND_URL}/api/debug/webpage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      consoleErrors: consoleErrors,
                      pageHtml: pageResponse.content,
                    }),
                  })
                    .then((res) => res.json())
                    .then((data) => sendResponse(data))
                    .catch((err) =>
                      sendResponse({
                        error: "Failed to connect to the debug service.",
                      })
                    );
                }
              );
            }, 3000);
          });
        });
      });
    });
  } else {
    console.error("Unrecognized action received:", request.action);
    sendResponse({ error: `Unrecognized action: ${request.action}` });
  }

  return true; // Indicates that the response will be sent asynchronously
});
