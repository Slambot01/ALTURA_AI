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

// --- NEW: Draft Email Route ---
app.post("/api/gmail/draft", async (req, res) => {
  // 1. Check if the user is authenticated
  if (!userTokens) {
    return res.status(401).json({ error: "User is not authenticated." });
  }

  // 2. Get the page content from the request body
  const { pageContent } = req.body;
  if (!pageContent) {
    return res.status(400).json({ error: "Page content is required." });
  }

  try {
    // 3. Set the credentials for this specific API call
    oauth2Client.setCredentials(userTokens);
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // 4. Use AI to generate a subject and body for the email
    const prompt = `Based on the following text, generate a concise email subject line and a professional email body. Format the output as a JSON object with "subject" and "body" keys. Text: "${pageContent.substring(
      0,
      4000
    )}"`;

    const aiResult = await model.generateContent(prompt);
    const aiResponseText = aiResult.response.text();

    // Clean the AI response to extract the pure JSON string
    const jsonString = aiResponseText.replace(/```json\n|```/g, "").trim();
    const emailData = JSON.parse(jsonString);
    const { subject, body } = emailData;

    // 5. Create a raw email message in MIME format
    const email = [
      'Content-Type: text/plain; charset="UTF-8"',
      "MIME-Version: 1.0",
      "Content-Transfer-Encoding: 7bit",
      "to: ", // 'to' field is empty for a draft
      `subject: ${subject}`,
      "",
      body,
    ].join("\n");

    // The Gmail API requires the raw email to be Base64 encoded
    const base64EncodedEmail = Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    // 6. Call the Gmail API to create the draft
    await gmail.users.drafts.create({
      userId: "me",
      requestBody: {
        message: {
          raw: base64EncodedEmail,
        },
      },
    });

    // 7. Send a success response back to the frontend
    res.json({ success: true, message: "Draft created successfully!" });
  } catch (error) {
    console.error("Error creating Gmail draft:", error);
    res.status(500).json({ error: "Failed to create draft." });
  }
});

// --- Authentication Routes (remain the same) ---
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
    res.send(
      "<h1>Authentication successful!</h1><p>You can close this tab now.</p>"
    );
  } catch (error) {
    console.error("Error authenticating with Google:", error);
    res.status(500).send("Authentication failed.");
  }
});

app.get("/api/auth/status", (req, res) => {
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
