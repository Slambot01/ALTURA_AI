// // --- Import necessary packages ---
// const express = require("express");
// const cors = require("cors");
// const fetch = require("node-fetch");
// const admin = require("firebase-admin");
// const { google } = require("googleapis");
// const { GoogleGenerativeAI } = require("@google/generative-ai");
// require("dotenv").config();

// // --- Firebase Admin SDK Initialization ---
// const serviceAccount = require("./serviceAccountKey.json");
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });
// const db = admin.firestore();

// // --- Google AI & OAuth2 Setups ---
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// const googleOauth2Client = new google.auth.OAuth2(
//   process.env.GOOGLE_CLIENT_ID,
//   process.env.GOOGLE_CLIENT_SECRET,
//   "http://localhost:3001/api/auth/google/callback"
// );

// // --- GitHub OAuth App Configuration ---
// const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
// const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
// const CHROME_EXTENSION_ID = process.env.CHROME_EXTENSION_ID;

// // --- Basic Server Setup ---
// const app = express();
// const PORT = process.env.PORT || 3001;

// // --- Middleware ---
// app.use((req, res, next) => {
//   if (req.path === "/api/github/webhook") {
//     express.raw({ type: "application/json" })(req, res, next);
//   } else {
//     express.json()(req, res, next);
//   }
// });
// app.use(cors());

// // --- AI API Routes ---

// app.post("/api/summarize", async (req, res) => {
//   try {
//     const { text } = req.body;
//     if (!text)
//       return res.status(400).json({ error: "Text content is required." });
//     const prompt = `Summarize the following text in a few concise paragraphs:\n\n${text}`;
//     const result = await model.generateContent(prompt);
//     const summary = result.response.text();
//     res.json({ summary });
//   } catch (error) {
//     console.error("Error during summarization:", error);
//     res.status(500).json({ error: "Failed to generate summary." });
//   }
// });

// app.post("/api/gmail/draft", async (req, res) => {
//   try {
//     // NOTE: Using a single user document for simplicity. In a real app, you'd use the logged-in user's ID.
//     const userDoc = await db.collection("users").doc("main_user").get();
//     if (!userDoc.exists || !userDoc.data().google_tokens) {
//       return res
//         .status(401)
//         .json({
//           error: "User is not authenticated with Google or tokens are missing.",
//         });
//     }
//     const userTokens = userDoc.data().google_tokens;
//     googleOauth2Client.setCredentials(userTokens);

//     const gmail = google.gmail({ version: "v1", auth: googleOauth2Client });
//     const { pageContent } = req.body;
//     if (!pageContent)
//       return res.status(400).json({ error: "Page content is required." });

//     const prompt = `Based on the following text, generate a concise email subject line and a professional email body. Format the output as a JSON object with "subject" and "body" keys. Text: "${pageContent.substring(
//       0,
//       4000
//     )}"`;
//     const aiResult = await model.generateContent(prompt);
//     const jsonString = aiResult.response
//       .text()
//       .replace(/```json\n|```/g, "")
//       .trim();
//     const { subject, body } = JSON.parse(jsonString);

//     const email = `Content-Type: text/plain; charset="UTF-8"\nMIME-Version: 1.0\nto: \nsubject: ${subject}\n\n${body}`;
//     const base64EncodedEmail = Buffer.from(email)
//       .toString("base64")
//       .replace(/\+/g, "-")
//       .replace(/\//g, "_");

//     await gmail.users.drafts.create({
//       userId: "me",
//       requestBody: { message: { raw: base64EncodedEmail } },
//     });
//     res.json({ success: true, message: "Draft created successfully!" });
//   } catch (error) {
//     console.error("Error creating Gmail draft:", error);
//     res.status(500).json({ error: "Failed to create draft." });
//   }
// });

// // --- GitHub Webhook Route ---
// app.post("/api/github/webhook", async (req, res) => {
//   const eventType = req.headers["x-github-event"];
//   const payload = JSON.parse(req.body);

//   try {
//     let notification = {
//       type: eventType,
//       repo: payload.repository.full_name,
//       timestamp: new Date(),
//       read: false,
//     };

//     if (eventType === "pull_request") {
//       notification.action = payload.action;
//       notification.title = payload.pull_request.title;
//       notification.url = payload.pull_request.html_url;
//       notification.sender = payload.sender.login;
//       notification.message = `PR #${payload.pull_request.number} ${payload.action} by ${payload.sender.login}: "${payload.pull_request.title}"`;
//     } else if (eventType === "push") {
//       notification.ref = payload.ref;
//       notification.pusher = payload.pusher.name;
//       notification.url = payload.compare;
//       notification.message = `Push to ${payload.ref.split("/").pop()} by ${
//         payload.pusher.name
//       } in ${payload.repository.name}`;
//     } else {
//       return res.status(200).send("Event received but not processed.");
//     }

//     await db.collection("notifications").add(notification);
//     console.log("Notification saved to Firestore.");

//     res.status(200).send("Notification received and processed.");
//   } catch (error) {
//     console.error("Error processing webhook or saving to Firestore:", error);
//     res.status(500).send("Internal Server Error");
//   }
// });

// // --- Authentication Routes ---

// // Google Auth
// app.get("/api/auth/google", (req, res) => {
//   const scopes = [
//     "https://www.googleapis.com/auth/userinfo.profile",
//     "https://www.googleapis.com/auth/gmail.compose",
//   ];
//   const url = googleOauth2Client.generateAuthUrl({
//     access_type: "offline",
//     scope: scopes,
//   });
//   res.json({ url });
// });

// app.get("/api/auth/google/callback", async (req, res) => {
//   const { code } = req.query;
//   try {
//     const { tokens } = await googleOauth2Client.getToken(code);
//     // Using a single user doc for simplicity.
//     await db
//       .collection("users")
//       .doc("main_user")
//       .set({ google_tokens: tokens }, { merge: true });
//     console.log("Google Auth successful, tokens stored.");
//     res.send(
//       "<h1>Authentication successful!</h1><p>You can close this tab.</p>"
//     );
//   } catch (error) {
//     console.error("Error authenticating with Google:", error);
//     res.status(500).send("Authentication failed.");
//   }
// });

// // GitHub Auth
// app.get("/api/auth/github", (req, res) => {
//   const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo,user:email`;
//   res.redirect(url);
// });

// app.get("/api/auth/github/callback", async (req, res) => {
//   const { code } = req.query;
//   try {
//     const tokenResponse = await fetch(
//       "https://github.com/login/oauth/access_token",
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Accept: "application/json",
//         },
//         body: JSON.stringify({
//           client_id: GITHUB_CLIENT_ID,
//           client_secret: GITHUB_CLIENT_SECRET,
//           code,
//         }),
//       }
//     );
//     const tokenData = await tokenResponse.json();
//     const accessToken = tokenData.access_token;

//     const userResponse = await fetch("https://api.github.com/user", {
//       headers: { Authorization: `token ${accessToken}` },
//     });
//     const githubUser = await userResponse.json();

//     // Use a single user doc for simplicity
//     await db.collection("users").doc("main_user").set(
//       {
//         github_access_token: accessToken,
//         github_username: githubUser.login,
//         github_avatar_url: githubUser.avatar_url,
//       },
//       { merge: true }
//     );

//     console.log("GitHub Auth successful.");
//     res.redirect(`chrome-extension://${CHROME_EXTENSION_ID}/dashboard.html`);
//   } catch (error) {
//     console.error("Error authenticating with GitHub:", error);
//     res.status(500).send("GitHub Authentication failed.");
//   }
// });

// // Auth Status Check
// app.get("/api/auth/status", async (req, res) => {
//   try {
//     const userDoc = await db.collection("users").doc("main_user").get();
//     if (!userDoc.exists) {
//       return res.json({ isGoogleLoggedIn: false, isGithubLoggedIn: false });
//     }
//     const data = userDoc.data();
//     res.json({
//       isGoogleLoggedIn: !!data.google_tokens,
//       isGithubLoggedIn: !!data.github_access_token,
//     });
//   } catch (error) {
//     res.status(500).json({ error: "Failed to check auth status." });
//   }
// });

// // --- Start the Server ---
// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });
// --- Import necessary packages ---
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const admin = require("firebase-admin");
const { google } = require("googleapis");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// --- Firebase Admin SDK Initialization ---
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// --- Google AI & OAuth2 Setups ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const googleOauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:3001/api/auth/google/callback"
);

// --- GitHub OAuth App Configuration ---
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const CHROME_EXTENSION_ID = process.env.CHROME_EXTENSION_ID;

// --- Basic Server Setup ---
const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use((req, res, next) => {
  if (req.path === "/api/github/webhook") {
    express.raw({ type: "application/json" })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});
app.use(cors());

// --- AI API Routes ---

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

app.post("/api/gmail/draft", async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc("main_user").get();
    if (!userDoc.exists || !userDoc.data().google_tokens) {
      return res
        .status(401)
        .json({
          error: "User is not authenticated with Google or tokens are missing.",
        });
    }
    const userTokens = userDoc.data().google_tokens;
    googleOauth2Client.setCredentials(userTokens);

    const gmail = google.gmail({ version: "v1", auth: googleOauth2Client });
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

// --- GitHub Webhook & API Routes ---

// **NEW:** AI-Powered PR Review Route
app.post("/api/github/pr/review", async (req, res) => {
  const { prUrl } = req.body;
  if (!prUrl) {
    return res.status(400).json({ error: "Pull Request URL is required." });
  }

  try {
    // Fetch the GitHub access token from Firestore
    const userDoc = await db.collection("users").doc("main_user").get();
    if (!userDoc.exists || !userDoc.data().github_access_token) {
      return res.status(401).json({ error: "GitHub token not found." });
    }
    const accessToken = userDoc.data().github_access_token;

    // The GitHub API endpoint for a PR diff is different from the HTML URL.
    // We need to convert https://github.com/owner/repo/pull/123
    // to https://api.github.com/repos/owner/repo/pulls/123
    const apiUrl = prUrl
      .replace("github.com", "api.github.com/repos")
      .replace("/pull/", "/pulls/");

    // Fetch the diff content using the GitHub API
    const diffResponse = await fetch(apiUrl, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3.diff", // This special header gets the diff format
      },
    });

    if (!diffResponse.ok) {
      throw new Error(`Failed to fetch PR diff: ${diffResponse.statusText}`);
    }
    const diffText = await diffResponse.text();

    // Generate the AI review
    const prompt = `You are an expert code reviewer. Please review the following code changes (in .diff format) and provide a concise summary of potential issues, bugs, or style improvements. Be specific and provide code examples if necessary.\n\nDiff:\n${diffText}`;
    const result = await model.generateContent(prompt);
    const review = result.response.text();

    res.json({ review });
  } catch (error) {
    console.error("Error generating PR review:", error);
    res.status(500).json({ error: "Failed to generate PR review." });
  }
});

app.post("/api/github/webhook", async (req, res) => {
  const eventType = req.headers["x-github-event"];
  const payload = JSON.parse(req.body);

  try {
    let notification = {
      type: eventType,
      repo: payload.repository.full_name,
      timestamp: new Date(),
      read: false,
    };

    if (eventType === "pull_request") {
      notification.action = payload.action;
      notification.title = payload.pull_request.title;
      notification.url = payload.pull_request.html_url;
      notification.sender = payload.sender.login;
      notification.message = `PR #${payload.pull_request.number} ${payload.action} by ${payload.sender.login}: "${payload.pull_request.title}"`;
    } else if (eventType === "push") {
      notification.ref = payload.ref;
      notification.pusher = payload.pusher.name;
      notification.url = payload.compare;
      notification.message = `Push to ${payload.ref.split("/").pop()} by ${
        payload.pusher.name
      } in ${payload.repository.name}`;
    } else {
      return res.status(200).send("Event received but not processed.");
    }

    await db.collection("notifications").add(notification);
    console.log("Notification saved to Firestore.");

    res.status(200).send("Notification received and processed.");
  } catch (error) {
    console.error("Error processing webhook or saving to Firestore:", error);
    res.status(500).send("Internal Server Error");
  }
});

// --- Authentication Routes ---

app.get("/api/auth/google", (req, res) => {
  const scopes = [
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/gmail.compose",
  ];
  const url = googleOauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
  });
  res.json({ url });
});

app.get("/api/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await googleOauth2Client.getToken(code);
    await db
      .collection("users")
      .doc("main_user")
      .set({ google_tokens: tokens }, { merge: true });
    console.log("Google Auth successful, tokens stored.");
    res.send(
      "<h1>Authentication successful!</h1><p>You can close this tab.</p>"
    );
  } catch (error) {
    console.error("Error authenticating with Google:", error);
    res.status(500).send("Authentication failed.");
  }
});

app.get("/api/auth/github", (req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo,user:email`;
  res.redirect(url);
});

app.get("/api/auth/github/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
        }),
      }
    );
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const userResponse = await fetch("https://api.github.com/user", {
      headers: { Authorization: `token ${accessToken}` },
    });
    const githubUser = await userResponse.json();

    await db.collection("users").doc("main_user").set(
      {
        github_access_token: accessToken,
        github_username: githubUser.login,
        github_avatar_url: githubUser.avatar_url,
      },
      { merge: true }
    );

    console.log("GitHub Auth successful.");
    res.redirect(`chrome-extension://${CHROME_EXTENSION_ID}/dashboard.html`);
  } catch (error) {
    console.error("Error authenticating with GitHub:", error);
    res.status(500).send("GitHub Authentication failed.");
  }
});

app.get("/api/auth/status", async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc("main_user").get();
    if (!userDoc.exists) {
      return res.json({ isGoogleLoggedIn: false, isGithubLoggedIn: false });
    }
    const data = userDoc.data();
    res.json({
      isGoogleLoggedIn: !!data.google_tokens,
      isGithubLoggedIn: !!data.github_access_token,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to check auth status." });
  }
});

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
