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
// THis is snippet Saver
// *******************

/// The URL of your backend server
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

// --- Listeners to Trigger Auth Check ---

chrome.runtime.onInstalled.addListener(() => {
  console.log("AlturaAI extension installed.");
  checkAuthStatus();

  // NEW: Create the context menu item when the extension is installed
  chrome.contextMenus.create({
    id: "save-snippet",
    title: "Save Snippet with AlturaAI",
    contexts: ["selection"], // This makes it appear only when text is highlighted
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    (tab.url.includes("localhost:3001/api/auth/google/callback") ||
      tab.url.includes("localhost:3001/api/auth/github/callback"))
  ) {
    console.log("Auth callback tab finished loading. Checking auth status.");
    checkAuthStatus();
  }
});

// --- NEW: Listener for when the context menu is clicked ---
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "save-snippet" && info.selectionText) {
    fetch(`${BACKEND_URL}/api/snippets/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        snippetText: info.selectionText,
        sourceUrl: tab.url,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Snippet saved:", data);
        // Optionally, we could create a desktop notification here
      })
      .catch((err) => console.error("Failed to save snippet:", err));
  }
});

// --- Message Listener for Popup Actions ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background script received a message:", request);

  if (request.action === "check_auth_status") {
    checkAuthStatus();
    sendResponse({ status: "checking" });
  } else if (
    ["summarize_page", "draft_email", "create_notion_doc"].includes(
      request.action
    )
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
  return true;
});
