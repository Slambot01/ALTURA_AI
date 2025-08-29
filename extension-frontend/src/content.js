// content.js - Fixed version with proper injection guard
console.log("AlturaAI content script loaded.");

if (window.__ALTURAAI_CONTENT_SCRIPT_INJECTED__) {
  console.warn("[AlturaAI] Content script already injected. Skipping...");
} else {
  window.__ALTURAAI_CONTENT_SCRIPT_INJECTED__ = true;

  class AlturaAIContent {
    constructor() {
      this.consoleErrors = [];
      this.setupErrorCapture();
      this.captureHistoricalErrors();
      this.setupMessageListener();
      console.log("[AlturaAI] Content script initialized successfully");
    }

    setupErrorCapture() {
      // Store original console methods
      const originalConsoleError = console.error;
      const originalConsoleWarn = console.warn;

      // Create a more robust error storage
      this.consoleErrors = [];

      // Override console.error with better capture
      console.error = (...args) => {
        const errorMessage = args
          .map((arg) => {
            if (arg instanceof Error) {
              return `${arg.name}: ${arg.message}\n${arg.stack}`;
            }
            return typeof arg === "object"
              ? JSON.stringify(arg, null, 2)
              : String(arg);
          })
          .join(" ");

        this.consoleErrors.push({
          type: "error",
          message: errorMessage,
          timestamp: Date.now(),
          source: "console.error",
        });

        // Call original console.error
        originalConsoleError.apply(console, args);
      };

      // Override console.warn
      console.warn = (...args) => {
        const warnMessage = args
          .map((arg) => {
            return typeof arg === "object"
              ? JSON.stringify(arg, null, 2)
              : String(arg);
          })
          .join(" ");

        this.consoleErrors.push({
          type: "warn",
          message: warnMessage,
          timestamp: Date.now(),
          source: "console.warn",
        });

        originalConsoleWarn.apply(console, args);
      };

      // Capture JavaScript runtime errors
      const originalErrorHandler = window.onerror;
      window.onerror = (message, source, lineno, colno, error) => {
        this.consoleErrors.push({
          type: "error",
          message: `${message} at ${source}:${lineno}:${colno}`,
          timestamp: Date.now(),
          source: "window.onerror",
          stack: error?.stack || "No stack trace",
        });

        if (originalErrorHandler) {
          return originalErrorHandler.apply(window, arguments);
        }
        return false;
      };

      // Capture unhandled promise rejections
      window.addEventListener("unhandledrejection", (event) => {
        this.consoleErrors.push({
          type: "error",
          message: `Unhandled Promise Rejection: ${event.reason}`,
          timestamp: Date.now(),
          source: "unhandledrejection",
          stack: event.reason?.stack || "No stack trace",
        });
      });

      console.log("[AlturaAI] Enhanced error capture initialized");
    }

    setupMessageListener() {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log("[AlturaAI] Processing action:", request.action);

        try {
          switch (request.action) {
            case "ping":
              // Health check for content script
              sendResponse({ status: "ready" });
              break;

            case "get_page_content":
              console.time("getPageContent");
              this.getPageContent(sendResponse);
              console.timeEnd("getPageContent");
              break;

            case "get_product_details":
              this.getProductDetails(sendResponse);
              break;

            case "debug_page":
              this.getDebugInfo(sendResponse);
              break;

            default:
              console.warn("[AlturaAI] Unknown action:", request.action);
              sendResponse({ success: false, error: "Unknown action" });
          }
        } catch (error) {
          console.error("[AlturaAI] Message handling error:", error);
          sendResponse({ success: false, error: error.message });
        }

        return true; // Keep message channel open for async responses
      });
    }

    captureHistoricalErrors() {
      // Try to capture any errors that might have occurred before script injection
      if (window.__pageErrors) {
        this.consoleErrors.push(...window.__pageErrors);
        delete window.__pageErrors;
      }

      // Log that we're ready to capture errors
      console.log(
        "[AlturaAI] Error capture initialized, ready to capture new errors"
      );
    }

    getPageContent(sendResponse) {
      try {
        console.log("[AlturaAI] Starting content extraction...");

        // Simple and robust text extraction
        let textContent = "";

        // Method 1: Try to get main content areas
        const contentSelectors = [
          "main",
          "article",
          "[role='main']",
          ".content",
          "#content",
          ".main-content",
          "#main-content",
        ];

        let contentContainer = null;
        for (const selector of contentSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            contentContainer = element;
            console.log("[AlturaAI] Found content container:", selector);
            break;
          }
        }

        // Method 2: If no main content found, use body
        if (!contentContainer) {
          contentContainer = document.body;
          console.log("[AlturaAI] Using document.body as fallback");
        }

        // Method 3: Simple text extraction without style checking
        textContent = this.extractTextSimple(contentContainer);

        if (!textContent || textContent.trim().length < 10) {
          // Method 4: Fallback to innerText/textContent
          textContent =
            contentContainer.innerText || contentContainer.textContent || "";
          console.log("[AlturaAI] Using fallback text extraction method");
        }

        if (!textContent || textContent.trim().length < 10) {
          throw new Error("No readable text content found on page");
        }

        // Clean and limit the content
        const cleanText = this.cleanText(textContent);

        console.log("[AlturaAI] Extracted content length:", cleanText.length);
        console.log("[AlturaAI] First 100 chars:", cleanText.substring(0, 100));

        sendResponse({
          success: true,
          content: cleanText,
          url: window.location.href,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error("[AlturaAI] Content extraction error:", error);
        sendResponse({
          success: false,
          error: `Failed to extract content: ${error.message}`,
        });
      }
    }

    extractTextSimple(element) {
      if (!element) return "";

      let text = "";
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function (node) {
            // Skip text nodes in script, style, and other non-content elements
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;

            const skipTags = [
              "SCRIPT",
              "STYLE",
              "NOSCRIPT",
              "HEAD",
              "META",
              "LINK",
            ];
            if (skipTags.includes(parent.tagName)) {
              return NodeFilter.FILTER_REJECT;
            }

            // Skip if text is just whitespace
            const textContent = node.textContent.trim();
            if (textContent.length === 0) {
              return NodeFilter.FILTER_REJECT;
            }

            return NodeFilter.FILTER_ACCEPT;
          },
        },
        false
      );

      let node;
      while ((node = walker.nextNode())) {
        const textContent = node.textContent.trim();
        if (textContent) {
          text += textContent + " ";
        }
      }

      return text.trim();
    }

    cleanText(text) {
      return text
        .replace(/[\r\n\t]+/g, " ") // Replace line breaks and tabs with spaces
        .replace(/\s{2,}/g, " ") // Replace multiple spaces with single space
        .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, "") // Remove non-printable characters
        .trim()
        .substring(0, 4000); // Limit length
    }

    getProductDetails(sendResponse) {
      try {
        console.log("[AlturaAI] Extracting product details...");

        // Enhanced product detection logic
        const productName = this.extractProductName();
        const price = this.extractPrice();

        if (!productName) {
          sendResponse({
            success: false,
            error: "No product detected on this page",
          });
          return;
        }

        const productDetails = {
          success: true,
          productName: productName,
          content: productName, // Add this for compatibility with background.js
          url: window.location.href,
          price: price,
          site: window.location.hostname,
          timestamp: Date.now(),
        };

        console.log("[AlturaAI] Product details extracted:", productDetails);
        sendResponse(productDetails);
      } catch (error) {
        console.error("[AlturaAI] Product extraction error:", error);
        sendResponse({
          success: false,
          error: `Failed to extract product details: ${error.message}`,
        });
      }
    }

    extractProductName() {
      // Improved product name detection with more selectors
      const selectors = [
        // Amazon-specific
        "#productTitle",
        '[data-testid="product-title"]',
        // Generic e-commerce
        "h1.product-title",
        "h1#product-title",
        ".product-name h1",
        ".product-title",
        '[data-cy="product-title"]',
        // General heading selectors
        "h1",
        "h2.product-name",
      ];

      for (const selector of selectors) {
        try {
          const element = document.querySelector(selector);
          if (element && element.textContent) {
            const title = element.textContent.trim();
            // Filter out very short or generic titles
            if (title.length > 5 && !title.toLowerCase().includes("loading")) {
              console.log(
                "[AlturaAI] Found product title with selector:",
                selector
              );
              return title;
            }
          }
        } catch (e) {
          console.warn("[AlturaAI] Error with selector", selector, e);
          continue;
        }
      }

      // Fallback: check meta tags
      try {
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle && ogTitle.content && ogTitle.content.trim()) {
          return ogTitle.content.trim();
        }
      } catch (e) {
        console.warn("[AlturaAI] Error reading og:title", e);
      }

      // Last resort: page title
      try {
        const pageTitle = document.title?.split("|")[0]?.split("-")[0]?.trim();
        if (pageTitle && pageTitle.length > 5) {
          return pageTitle;
        }
      } catch (e) {
        console.warn("[AlturaAI] Error processing page title", e);
      }

      return null;
    }

    extractPrice() {
      const priceSelectors = [
        // Amazon-specific
        ".a-price .a-offscreen",
        '[data-testid="price"]',
        // Generic e-commerce
        ".price",
        ".product-price",
        '[class*="price"]',
        '[data-cy="price"]',
        ".price-current",
        ".current-price",
        ".sale-price",
      ];

      for (const selector of priceSelectors) {
        try {
          const element = document.querySelector(selector);
          if (element && element.textContent) {
            // Enhanced price matching for multiple currencies
            const priceMatch = element.textContent.match(
              /[₹$€£¥¢₵₡₦₨₪₫₩₯₲₴₸₼₽﷼]\s*[\d,]+(?:\.\d{1,2})?|[\d,]+(?:\.\d{1,2})?\s*[₹$€£¥¢₵₡₦₨₪₫₩₯₲₴₸₼₽﷼]/
            );
            if (priceMatch) {
              return priceMatch[0].trim();
            }
          }
        } catch (e) {
          console.warn("[AlturaAI] Error with price selector", selector, e);
          continue;
        }
      }
      return null;
    }

    getDebugInfo(sendResponse) {
      try {
        console.log("[AlturaAI] Collecting debug info...");

        // Get the full HTML of the page, including the <script> tags
        const pageHtml = document.documentElement.outerHTML;

        // Get the captured errors
        const errors = this.consoleErrors;

        const debugInfo = {
          success: true,
          consoleErrors: errors,
          pageHtml: pageHtml,
          url: window.location.href,
          title: document.title,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
        };

        // Clear errors for the next run
        this.consoleErrors = [];

        sendResponse(debugInfo);
      } catch (error) {
        console.error("[AlturaAI] Debug info error:", error);
        sendResponse({
          success: false,
          error: `Failed to collect debug info: ${error.message}`,
        });
      }
    }
  }

  // Initialize the content script with error handling
  try {
    new AlturaAIContent();
  } catch (error) {
    console.error("[AlturaAI] Failed to initialize content script:", error);
  }
}
