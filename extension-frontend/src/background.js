// The URL of your backend server
const BACKEND_URL = "http://localhost:3001";

// This function checks if the user is logged in by asking our backend.
const checkAuthStatus = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/status`);
    const data = await response.json();
    // Save the status to storage. This will trigger the listener in App.jsx.
    chrome.storage.local.set({ isLoggedIn: data.isLoggedIn });
    console.log("Auth status checked:", data.isLoggedIn);
  } catch (error) {
    console.error("Could not check auth status:", error);
    // If we can't connect, assume logged out.
    chrome.storage.local.set({ isLoggedIn: false });
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
  // Handle the summarization request.
  else if (request.action === "summarize_page") {
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
          fetch(`${BACKEND_URL}/api/summarize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: pageResponse.content }),
          })
            .then((res) => res.json())
            .then((data) => sendResponse(data))
            .catch((err) =>
              sendResponse({
                error: "Failed to connect to the summarization service.",
              })
            );
        }
      );
    });
  }
  // Return true to indicate you wish to send a response asynchronously.
  return true;
});
