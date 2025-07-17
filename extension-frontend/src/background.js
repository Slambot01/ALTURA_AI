// The URL of your backend server
const BACKEND_URL = "http://localhost:3001";

// This function checks if the user is logged in by asking our backend.
const checkAuthStatus = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/status`);
    const data = await response.json();
    chrome.storage.local.set({ isLoggedIn: data.isLoggedIn });
    console.log("Auth status checked:", data.isLoggedIn);
  } catch (error) {
    console.error("Could not check auth status:", error);
    chrome.storage.local.set({ isLoggedIn: false });
  }
};

// Check when the extension is first installed.
chrome.runtime.onInstalled.addListener(() => {
  checkAuthStatus();
});

// --- Message Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "check_auth_status") {
    checkAuthStatus();
    sendResponse({ status: "checking" });
  } else if (
    request.action === "summarize_page" ||
    request.action === "draft_email"
  ) {
    // This logic now handles both summarizing and drafting
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
          } else {
            // draft_email
            endpoint = `${BACKEND_URL}/api/gmail/draft`;
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
