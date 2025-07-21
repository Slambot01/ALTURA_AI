// // content.js - This script runs on every webpage and extracts content

// console.log("AlturaAI content script loaded.");

// // Listen for messages from the background script
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.action === "get_page_content") {
//     try {
//       // A simple method to get all visible text from the page
//       const content = document.body.innerText || document.body.textContent;

//       // Clean up the content by removing extra whitespace
//       const cleanedContent = content.replace(/\s+/g, " ").trim();

//       console.log("Extracted page content length:", cleanedContent.length);

//       sendResponse({
//         success: true,
//         content: cleanedContent,
//       });
//     } catch (error) {
//       console.error("Error extracting page content:", error);
//       sendResponse({
//         success: false,
//         error: "Failed to extract page content: " + error.message,
//       });
//     }
//   }
//   // Return true to indicate we will send a response asynchronously
//   return true;
// });

// ********************
// This is during snippet sav ecmaFeatures
// ?******************

// content.js - This script runs on every webpage

console.log("AlturaAI content script loaded.");

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "get_page_content") {
    try {
      const content = document.body.innerText || document.body.textContent;
      const cleanedContent = content.replace(/\s+/g, " ").trim();
      sendResponse({ success: true, content: cleanedContent });
    } catch (error) {
      sendResponse({
        success: false,
        error: "Failed to extract page content.",
      });
    }
  }
  // NEW: Handle getting only the selected text
  else if (request.action === "get_selected_text") {
    try {
      const selectedText = window.getSelection().toString().trim();
      sendResponse({ success: true, selectedText: selectedText });
    } catch (error) {
      sendResponse({ success: false, error: "Failed to get selected text." });
    }
  }
  // Return true to indicate we will send a response asynchronously
  return true;
});
