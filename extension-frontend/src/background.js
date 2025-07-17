// This script runs in the background of the browser.

// Listen for messages from the popup script (App.jsx).
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Check if the message is asking to 'summarize_page'
  if (request.action === "summarize_page") {
    // Get the currently active tab.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab) {
        // Send a message to the content script in that tab to get its content.
        chrome.tabs.sendMessage(
          activeTab.id,
          { action: "get_page_content" },
          (response) => {
            // Check for errors and if a response was received.
            if (chrome.runtime.lastError) {
              console.error(
                "Error sending message to content script:",
                chrome.runtime.lastError.message
              );
              sendResponse({
                error: "Could not get page content. Try refreshing the page.",
              });
            } else if (response && response.content) {
              // TODO: In the future, we will send this content to our backend.
              // For now, we just send the content back to the popup.
              console.log("Received content from page.");
              sendResponse({ content: response.content });
            } else {
              sendResponse({ error: "No content received from the page." });
            }
          }
        );
      } else {
        sendResponse({ error: "Could not find an active tab." });
      }
    });
  }
  // Return true to indicate you wish to send a response asynchronously.
  return true;
});
