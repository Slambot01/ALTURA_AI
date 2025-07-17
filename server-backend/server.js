// Import necessary packages
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { google } = require("googleapis");

// --- Basic Server Setup ---
const app = express();
app.use(cors());
app.use(express.json());

// --- Simple In-Memory Token Storage ---
let userTokens = null;

// --- Google AI Setup ---
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in the .env file.");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- Google OAuth2 Setup ---
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:3001/api/auth/google/callback"
);

// --- API Routes ---

// Summarize route (remains the same)
app.post("/api/summarize", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text)
      return res.status(400).json({ error: "Text content is required." });
    const prompt = `Summarize the following text in a few concise paragraphs:\n\n${text}`;
    const result = await model.generateContent(prompt);
    const summary = result.response.text();
    res.json({ summary });
  } catch (error) {
    console.error("Error during summarization:", error);
    res.status(500).json({ error: "Failed to generate summary." });
  }
});

// --- Authentication Routes ---

app.get("/api/auth/google", (req, res) => {
  const scopes = [
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/gmail.compose",
  ];
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
  });
  res.json({ url });
});

app.get("/api/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    userTokens = tokens;
    console.log("Authentication successful, tokens stored.");
    // **FIXED**: Instead of redirecting, just show a success message.
    res.send(
      "<h1>Authentication successful!</h1><p>You can close this tab now.</p>"
    );
  } catch (error) {
    console.error("Error authenticating with Google:", error);
    res.status(500).send("Authentication failed.");
  }
});

// **NEW**: A route for the extension to check login status
app.get("/api/auth/status", (req, res) => {
  // If we have tokens stored, the user is logged in.
  if (userTokens) {
    res.json({ isLoggedIn: true });
  } else {
    res.json({ isLoggedIn: false });
  }
});

// --- Start the Server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
