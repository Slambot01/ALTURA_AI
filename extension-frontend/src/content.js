// ********************
// This is during snippet sav ecmaFeatures
// ?******************

// content.js - This script runs on every webpage

console.log("AlturaAI content script loaded.");

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "get_page_content") {
    try {
      const content = document.documentElement.outerHTML;
      const cleanedContent = content.replace(/\s+/g, " ").trim();
      sendResponse({ success: true, content: content });
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
  } else if (request.action === "get_assignment_details") {
    try {
      // This selector may need to be adjusted based on Google Classroom's actual HTML structure.
      // You would find the specific div or element that contains the assignment prompt.
      const promptElement = document.querySelector('div[jsname="jOfkMb"]'); // Example selector
      const assignmentText = promptElement
        ? promptElement.innerText
        : "Could not find assignment text.";

      sendResponse({ success: true, text: assignmentText });
    } catch (error) {
      sendResponse({
        success: false,
        error: "Failed to read assignment from page.",
      });
    }
  }
  // In content.js, inside the onMessage listener
  // Universal product details extractor for ANY shopping website
  else if (request.action === "get_product_details") {
    try {
      // Universal product title detection
      function findProductTitle() {
        const strategies = [
          // Strategy 1: Common product title patterns
          () => {
            const selectors = [
              'h1[class*="product"]',
              'h1[class*="title"]',
              'h1[class*="name"]',
              '[data-testid*="title"]',
              '[data-testid*="name"]',
              '[data-testid*="product"]',
              '[class*="product-title"]',
              '[class*="product-name"]',
              '[class*="productTitle"]',
              '[class*="product_title"]',
              '[class*="product_name"]',
              '[class*="title"]',
              '[id*="title"]',
              '[id*="product"]',
              '[id*="name"]',
              'h1[itemprop="name"]',
              '[itemprop="name"]',
            ];

            for (const selector of selectors) {
              const elements = document.querySelectorAll(selector);
              for (const el of elements) {
                const text = el.innerText?.trim();
                if (text && text.length > 5 && text.length < 200) {
                  return { element: el, text, confidence: 0.9 };
                }
              }
            }
            return null;
          },

          // Strategy 2: Find the largest h1 that looks like a product title
          () => {
            const h1s = document.querySelectorAll("h1");
            let bestMatch = null;
            let bestScore = 0;

            for (const h1 of h1s) {
              const text = h1.innerText?.trim();
              if (!text || text.length < 5) continue;

              let score = 0;

              // Scoring based on content and context
              if (text.length > 10 && text.length < 150) score += 3;
              if (h1.closest('[class*="product"]')) score += 2;
              if (h1.closest('[class*="detail"]')) score += 2;
              if (h1.closest('[class*="info"]')) score += 1;
              if (
                !h1.closest("nav") &&
                !h1.closest("header") &&
                !h1.closest("footer")
              )
                score += 2;
              if (
                document.title
                  .toLowerCase()
                  .includes(text.toLowerCase().substring(0, 20))
              )
                score += 3;

              if (score > bestScore) {
                bestScore = score;
                bestMatch = {
                  element: h1,
                  text,
                  confidence: Math.min(0.8, score / 10),
                };
              }
            }

            return bestMatch;
          },

          // Strategy 3: Look for text that matches page title
          () => {
            const pageTitle = document.title;
            const elements = document.querySelectorAll(
              'h1, h2, [class*="title"], [class*="name"]'
            );

            for (const el of elements) {
              const text = el.innerText?.trim();
              if (
                text &&
                pageTitle.toLowerCase().includes(text.toLowerCase()) &&
                text.length > 10
              ) {
                return { element: el, text, confidence: 0.7 };
              }
            }
            return null;
          },

          // Strategy 4: Semantic analysis of text content
          () => {
            const allText = document.querySelectorAll("*");
            const productKeywords = [
              "model",
              "version",
              "series",
              "edition",
              "collection",
              "pack",
              "set",
              "kit",
            ];

            for (const el of allText) {
              if (el.children.length > 0) continue; // Skip parent elements

              const text = el.innerText?.trim();
              if (!text || text.length < 10 || text.length > 200) continue;

              // Check if it contains product-like keywords
              const hasProductKeywords = productKeywords.some((keyword) =>
                text.toLowerCase().includes(keyword)
              );

              if (
                hasProductKeywords &&
                (el.tagName === "H1" ||
                  el.tagName === "H2" ||
                  el.closest('[class*="product"]'))
              ) {
                return { element: el, text, confidence: 0.6 };
              }
            }
            return null;
          },
        ];

        // Try each strategy and return the best result
        let bestResult = null;
        for (const strategy of strategies) {
          const result = strategy();
          if (
            result &&
            (!bestResult || result.confidence > bestResult.confidence)
          ) {
            bestResult = result;
          }
        }

        return bestResult;
      }

      // Universal price detection
      function findProductPrice() {
        const pricePatterns = [
          // Common price selectors
          '[class*="price"]:not([class*="strike"]):not([class*="old"]):not([class*="was"])',
          '[data-testid*="price"]',
          '[data-test*="price"]',
          '[class*="cost"]',
          '[class*="amount"]',
          '[class*="total"]',
          '[id*="price"]',
          '[itemprop="price"]',

          // Currency symbols
          '*[class*="currency"]',
          '*[class*="dollar"]',
          '*[class*="euro"]',
        ];

        const currencyRegex = /[\$£€¥₹₽¢]\s*[\d,]+\.?\d*/g;
        const priceRegex = /(?:^|\s)[\$£€¥₹₽¢]\s*[\d,]+(?:\.\d{2})?(?:\s|$)/;

        // Try explicit selectors first
        for (const selector of pricePatterns) {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            const text = el.innerText?.trim();
            if (text && priceRegex.test(text)) {
              return text.match(currencyRegex)?.[0];
            }
          }
        }

        // Fallback: scan all text for price patterns
        const allElements = document.querySelectorAll("*");
        for (const el of allElements) {
          if (el.children.length > 0) continue; // Skip parent elements

          const text = el.innerText?.trim();
          if (text && text.length < 50 && priceRegex.test(text)) {
            const match = text.match(currencyRegex)?.[0];
            if (match) return match;
          }
        }

        return null;
      }

      // Universal image detection
      function findProductImage() {
        const imageSelectors = [
          'img[class*="product"]',
          'img[class*="hero"]',
          'img[class*="main"]',
          'img[data-testid*="image"]',
          'img[data-testid*="product"]',
          'img[alt*="product"]',
          'img[id*="product"]',
          'img[id*="main"]',
          ".product img",
          ".hero img",
          ".main img",
          ".gallery img:first-child",
        ];

        for (const selector of imageSelectors) {
          const img = document.querySelector(selector);
          if (img && img.src && img.src.startsWith("http")) {
            return img.src;
          }
        }

        // Fallback: find the largest visible image
        const allImages = document.querySelectorAll("img[src]");
        let largestImage = null;
        let largestSize = 0;

        for (const img of allImages) {
          if (!img.src.startsWith("http")) continue;

          const rect = img.getBoundingClientRect();
          const size = rect.width * rect.height;

          if (size > largestSize && size > 10000) {
            // Minimum size threshold
            largestSize = size;
            largestImage = img;
          }
        }

        return largestImage?.src || null;
      }

      // Enhanced text cleaning
      function cleanText(text) {
        if (!text) return null;

        return text
          .trim()
          .replace(/\s+/g, " ") // Multiple spaces to single
          .replace(/^\$\s*/, "") // Leading dollar
          .replace(/^Price:\s*/i, "") // "Price:" prefix
          .replace(/^Product:\s*/i, "") // "Product:" prefix
          .replace(/\n+/g, " ") // Newlines to spaces
          .replace(/\t+/g, " ") // Tabs to spaces
          .trim();
      }

      // Detect if this looks like a shopping site
      function isShoppingSite() {
        const indicators = [
          "add to cart",
          "buy now",
          "purchase",
          "checkout",
          "shopping cart",
          "add to bag",
          "add to basket",
          "price",
          "shipping",
          "delivery",
        ];

        const pageText = document.body.innerText.toLowerCase();
        return indicators.some((indicator) => pageText.includes(indicator));
      }

      // Main extraction logic
      const productDetails = {};

      // Check if this appears to be a shopping site
      if (!isShoppingSite()) {
        sendResponse({
          success: false,
          error: "This doesn't appear to be a shopping website.",
          site: "non-commerce",
        });
        return;
      }

      // Extract product title using multiple strategies
      const titleResult = findProductTitle();
      if (titleResult) {
        productDetails.title = cleanText(titleResult.text);
        productDetails.titleConfidence = titleResult.confidence;
      }

      // Extract price using universal patterns
      const price = findProductPrice();
      if (price) {
        productDetails.price = cleanText(price);
      }

      // Extract main product image
      const imageUrl = findProductImage();
      if (imageUrl) {
        productDetails.imageUrl = imageUrl;
      }

      // Additional metadata
      productDetails.url = window.location.href;
      productDetails.site = window.location.hostname;
      productDetails.pageTitle = document.title;

      // Success if we found at least a title
      if (productDetails.title) {
        sendResponse({
          success: true,
          productDetails: productDetails,
          // Legacy support
          productName: productDetails.title,
        });
      } else {
        // Last resort: use page title as product name
        const pageTitle = document.title;
        if (pageTitle && pageTitle.length > 5) {
          productDetails.title = cleanText(pageTitle);
          productDetails.site = window.location.hostname;
          productDetails.fallback = "page-title";

          sendResponse({
            success: true,
            productDetails: productDetails,
            productName: productDetails.title,
            warning: "Used page title as product name - may not be accurate",
          });
        } else {
          sendResponse({
            success: false,
            error: "Could not identify product details on this page.",
            site: window.location.hostname,
          });
        }
      }
    } catch (error) {
      sendResponse({
        success: false,
        error: "Failed to read product details: " + error.message,
        site: window.location.hostname,
      });
    }
  }
  function injectApp() {
    // Check if the root element already exists to prevent duplicates
    if (document.getElementById("altura-ai-root")) {
      console.log("AlturaAI root element already exists.");
      return;
    }

    // Create a container element for your React application
    const appContainer = document.createElement("div");
    appContainer.id = "altura-ai-root";
    document.body.appendChild(appContainer);

    console.log("AlturaAI root element created and appended.");
  }

  // Call the function to inject the app when the script loads
  injectApp();
  // Return true to indicate we will send a response asynchronously
  return true;
});
