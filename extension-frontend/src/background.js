// The URL of your backend server
const BACKEND_URL = "http://localhost:3001";

// This function checks if the user is logged in by asking our backend.
const checkAuthStatus = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/status`);
    const data = await response.json();
    // Save the status to storage. This will trigger the listener in App.jsx.
    chrome.storage.local.set({
      isGoogleLoggedIn: data.isGoogleLoggedIn,
      isGithubLoggedIn: data.isGithubLoggedIn,
    });
    console.log("Auth status checked:", data);
  } catch (error) {
    console.error("Could not check auth status:", error);
    // If we can't connect, assume logged out.
    chrome.storage.local.set({
      isGoogleLoggedIn: false,
      isGithubLoggedIn: false,
    });
  }
};

// Check when the extension is first installed.
chrome.runtime.onInstalled.addListener(() => {
  checkAuthStatus();
});

// --- Message Listener ---
// This is the main communication hub for the background script.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // The UI will send this message when it opens.
  if (request.action === "check_auth_status") {
    checkAuthStatus();
    sendResponse({ status: "checking" }); // Acknowledge the request
  }
  // Handle all actions that require page content
  else if (
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
      // Get the page content first
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

          // Determine which backend endpoint to call
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

          // Call the appropriate backend endpoint
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
  // Return true to indicate you wish to send a response asynchronously.
  return true;
});
