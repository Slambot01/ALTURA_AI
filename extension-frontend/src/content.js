// content.js - This script runs on every webpage and extracts content

console.log("AlturaAI content script loaded.");

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "get_page_content") {
    try {
      // A simple method to get all visible text from the page
      const content = document.body.innerText || document.body.textContent;

      // Clean up the content by removing extra whitespace
      const cleanedContent = content.replace(/\s+/g, " ").trim();

      console.log("Extracted page content length:", cleanedContent.length);

      sendResponse({
        success: true,
        content: cleanedContent,
      });
    } catch (error) {
      console.error("Error extracting page content:", error);
      sendResponse({
        success: false,
        error: "Failed to extract page content: " + error.message,
      });
    }
  }
  // Return true to indicate we will send a response asynchronously
  return true;
});
