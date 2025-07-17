// Import necessary packages
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { google } = require("googleapis");
const admin = require("firebase-admin");

// --- Firebase Admin SDK Initialization ---
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore(); // Initialize Firestore

// --- Basic Server Setup ---
const app = express();
app.use(cors());
app.use(express.json());

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

// Test route for checking if the server is running
app.get("/api/test", (req, res) => {
  res.json({ message: "Hello from the AlturaAI backend!" });
});

// Summarize route
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

// Draft Email Route
app.post("/api/gmail/draft", async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc("main_user").get();
    if (!userDoc.exists || !userDoc.data().tokens) {
      return res
        .status(401)
        .json({ error: "User is not authenticated or tokens are missing." });
    }
    const userTokens = userDoc.data().tokens;

    oauth2Client.setCredentials(userTokens);
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const { pageContent } = req.body;
    if (!pageContent)
      return res.status(400).json({ error: "Page content is required." });
    const prompt = `Based on the following text, generate a concise email subject line and a professional email body. Format the output as a JSON object with "subject" and "body" keys. Text: "${pageContent.substring(
      0,
      4000
    )}"`;
    const aiResult = await model.generateContent(prompt);
    const jsonString = aiResult.response
      .text()
      .replace(/```json\n|```/g, "")
      .trim();
    const { subject, body } = JSON.parse(jsonString);
    const email = `Content-Type: text/plain; charset="UTF-8"\nMIME-Version: 1.0\nto: \nsubject: ${subject}\n\n${body}`;
    const base64EncodedEmail = Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    await gmail.users.drafts.create({
      userId: "me",
      requestBody: { message: { raw: base64EncodedEmail } },
    });
    res.json({ success: true, message: "Draft created successfully!" });
  } catch (error) {
    console.error("Error creating Gmail draft:", error);
    res.status(500).json({ error: "Failed to create draft." });
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
    const userRef = db.collection("users").doc("main_user");
    await userRef.set({ tokens: tokens }, { merge: true });
    console.log("Authentication successful, tokens stored in Firestore.");
    res.send(
      "<h1>Authentication successful!</h1><p>You can close this tab now.</p>"
    );
  } catch (error) {
    console.error("Error authenticating with Google:", error);
    res.status(500).send("Authentication failed.");
  }
});

app.get("/api/auth/status", async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc("main_user").get();
    if (userDoc.exists && userDoc.data().tokens) {
      res.json({ isLoggedIn: true });
    } else {
      res.json({ isLoggedIn: false });
    }
  } catch (error) {
    console.error("Error checking auth status:", error);
    res.status(500).json({ error: "Failed to check auth status." });
  }
});

// --- Start the Server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
