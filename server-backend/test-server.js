const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "AlturaAI Backend is running!",
    status: "success",
    timestamp: new Date().toISOString(),
  });
});

// Test summarize endpoint
app.post("/api/summarize", (req, res) => {
  const { text } = req.body;
  console.log(
    "Received summarize request:",
    text ? text.substring(0, 50) + "..." : "no text"
  );

  res.json({
    success: true,
    summary:
      "This is a test summary response. Your text was: " +
      (text ? text.substring(0, 100) : "empty"),
    message: "Summarize endpoint is working!",
  });
});

// Test auth status
app.get("/api/auth/status", (req, res) => {
  res.json({
    isGoogleLoggedIn: false,
    isGithubLoggedIn: false,
    message: "Auth status endpoint working",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log(`📝 Visit http://localhost:${PORT} to test`);
  console.log(
    `🔍 Test summarize: curl -X POST http://localhost:${PORT}/api/summarize -H "Content-Type: application/json" -d '{"text":"test"}'`
  );
});

// Error handling
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
});
