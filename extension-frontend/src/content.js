// This script runs on the active web page.

// Listen for messages from the background script.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Check if the message is asking to 'get_page_content'
  if (request.action === "get_page_content") {
    // Respond with the text content of the page's body.
    sendResponse({ content: document.body.innerText });
  }
  // Return true to indicate you wish to send a response asynchronously.
  return true;
});
