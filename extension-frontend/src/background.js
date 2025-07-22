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
//     // Save the status to storage. This will trigger the listener in App.jsx.
//     chrome.storage.local.set({
//       isGoogleLoggedIn: data.isGoogleLoggedIn,
//       isGithubLoggedIn: data.isGithubLoggedIn,
//     });
//     console.log("Auth status checked and updated:", data);
//   } catch (error) {
//     console.error("Could not check auth status:", error);
//     // If we can't connect, assume logged out.
//     chrome.storage.local.set({
//       isGoogleLoggedIn: false,
//       isGithubLoggedIn: false,
//     });
//   }
// };

// // --- Listeners to Trigger Auth Check ---

// // 1. Check when the extension is first installed.
// chrome.runtime.onInstalled.addListener(() => {
//   console.log("AlturaAI extension installed. Checking auth status.");
//   checkAuthStatus();
// });

// // 2. Check whenever a tab is updated. This is a more reliable way
// //    to catch the "Authentication Successful" page loading and closing.
// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//   if (
//     changeInfo.status === "complete" &&
//     tab.url &&
//     (tab.url.includes("localhost:3001/api/auth/google/callback") ||
//       tab.url.includes("localhost:3001/api/auth/github/callback"))
//   ) {
//     console.log("Auth callback tab finished loading. Checking auth status.");
//     checkAuthStatus();
//   }
// });

// // --- Message Listener ---
// // This is the main communication hub for the background script.
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   console.log("Background script received a message:", request);

//   // The UI will send this message when it opens.
//   if (request.action === "check_auth_status") {
//     checkAuthStatus();
//     sendResponse({ status: "checking" }); // Acknowledge the request
//   }
//   // Handle all actions that require page content
//   else if (
//     ["summarize_page", "draft_email", "create_notion_doc"].includes(
//       request.action
//     )
//   ) {
//     chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//       const activeTab = tabs[0];
//       if (!activeTab) {
//         sendResponse({ error: "Could not find an active tab." });
//         return;
//       }
//       // Get the page content first
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

//           // Determine which backend endpoint to call
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
//           }

//           // Call the appropriate backend endpoint
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
//   // Return true to indicate you wish to send a response asynchronously.
//   return true;
// });

// *******************

// *******************
// The URL of your backend server
const BACKEND_URL = "http://localhost:3001";

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
    });
    console.log("Auth status checked and updated:", data);
  } catch (error) {
    console.error("Could not check auth status:", error);
    chrome.storage.local.set({
      isGoogleLoggedIn: false,
      isGithubLoggedIn: false,
    });
  }
};

// --- Listeners to Trigger Initial Setup and Auth Checks ---

// Fired when the extension is first installed, updated, or reloaded.
chrome.runtime.onInstalled.addListener(() => {
  console.log("AlturaAI extension installed/updated. Initializing...");

  // 1. Check authentication status on startup
  checkAuthStatus();

  // 2. Create the right-click "Save Snippet" menu item
  chrome.contextMenus.create({
    id: "save-snippet",
    title: "Save Snippet to AlturaAI",
    contexts: ["selection"], // This makes it appear only when you've selected text
  });
});

// Checks auth status after a successful login redirect from the server.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    (tab.url.includes("localhost:3001/api/auth/google/callback") ||
      tab.url.includes("localhost:3001/api/auth/github/callback"))
  ) {
    console.log("Auth callback tab finished loading. Checking auth status.");
    // Close the auth tab automatically for a better user experience
    setTimeout(() => {
      chrome.tabs.remove(tabId);
    }, 2000); // Wait 2 seconds before closing
    checkAuthStatus();
  }
});

// --- Listener for the "Save Snippet" Right-Click Action ---

chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Ensure the click was on our "save-snippet" menu item
  if (info.menuItemId === "save-snippet" && info.selectionText) {
    const snippetText = info.selectionText;
    const sourceUrl = tab.url;

    // Send the data to your backend server
    fetch(`${BACKEND_URL}/api/snippets/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
  }
  // Handle actions that require the full page content
  else if (
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
              userRequest: request.userRequest, // Pass the user's specific request
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
  }
  return true; // Indicates that the response will be sent asynchronously
});
