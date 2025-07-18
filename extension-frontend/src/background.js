const BACKEND_URL = "http://localhost:3001";

// This function checks the user's login status for both services by asking the backend.
const checkAuthStatus = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/status`);
    if (!response.ok) {
      throw new Error(`Auth check failed with status: ${response.status}`);
    }
    const data = await response.json();
    chrome.storage.local.set({
      isGoogleLoggedIn: data.isGoogleLoggedIn,
      isGithubLoggedIn: data.isGithubLoggedIn,
    });
    console.log("Auth status checked:", data);
  } catch (error) {
    console.error("Could not check auth status:", error);
    // If we can't connect, assume logged out for both.
    chrome.storage.local.set({
      isGoogleLoggedIn: false,
      isGithubLoggedIn: false,
    });
  }
};

// Check when the extension is first installed or updated.
chrome.runtime.onInstalled.addListener(() => {
  checkAuthStatus();
});

// When the user clicks the extension icon, open the dashboard.
chrome.action.onClicked.addListener((tab) => {
  const dashboardUrl = chrome.runtime.getURL("dashboard.html");
  chrome.tabs.query({ url: dashboardUrl }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { active: true });
      chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      chrome.tabs.create({ url: dashboardUrl });
    }
  });
});

// Listen for when the dashboard tab is loaded or updated.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const dashboardUrl = chrome.runtime.getURL("dashboard.html");
  if (tab.url?.startsWith(dashboardUrl) && changeInfo.status === "complete") {
    console.log("Dashboard tab updated. Re-checking auth status.");
    checkAuthStatus();
  }
});

// Listen for messages from the popup (App.jsx).
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "check_auth_status") {
    checkAuthStatus().then(() => sendResponse({ status: "checking" }));
    return true; // Indicates you will send a response asynchronously
  }

  if (request.action === "summarize_page" || request.action === "draft_email") {
    // 1. Get the active tab to find its content
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (
        !activeTab ||
        !activeTab.id ||
        activeTab.url?.startsWith("chrome://")
      ) {
        sendResponse({
          error:
            "Cannot access content on this page (e.g., new tab, settings).",
        });
        return;
      }

      // 2. Inject a content script to get the page's text content
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          function: () => document.body.innerText,
        },
        (injectionResults) => {
          // **IMPROVED ERROR HANDLING**
          if (chrome.runtime.lastError) {
            sendResponse({
              error: `Script injection failed: ${chrome.runtime.lastError.message}`,
            });
            return;
          }
          if (!injectionResults || injectionResults.length === 0) {
            sendResponse({
              error: "Could not get page content. Try refreshing the page.",
            });
            return;
          }

          const pageContent = injectionResults[0].result;
          if (!pageContent || pageContent.trim() === "") {
            sendResponse({
              error: "Page is empty or content is not accessible.",
            });
            return;
          }

          // 3. Send the content to the correct backend endpoint
          const endpoint =
            request.action === "summarize_page"
              ? `${BACKEND_URL}/api/summarize`
              : `${BACKEND_URL}/api/gmail/draft`;
          const body =
            request.action === "summarize_page"
              ? { text: pageContent }
              : { pageContent: pageContent };

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
    return true; // Indicates you will send a response asynchronously
  }
});
