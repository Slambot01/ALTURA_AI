const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize the model (assuming you have GEMINI_API_KEY in your environment)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
router.post("/", async (req, res) => {
  try {
    const { content, url, action, type } = req.body;

    if (!content) {
      return res.status(400).json({ error: "No content provided" });
    }

    let prompt;
    // Handle different action types
    switch (type || action) {
      case "summarize":
      case "summarize_page":
        prompt = `Summarize the following content in 3-4 key points:\n\n${content}`;
        break;
      case "debug":
      case "debug_page":
        prompt = `Analyze the following content for technical issues and provide debugging suggestions:\n\n${content}`;
        break;
      default:
        return res.status(400).json({ error: "Invalid action specified" });
    }

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    return res.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("Analyze API error:", error);
    res.status(500).json({ error: "Failed to analyze content" });
  }
});

module.exports = router;
