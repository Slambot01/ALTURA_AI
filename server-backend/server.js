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

// // --- Basic Server Setup ---
// const app = express();
// const PORT = process.env.PORT || 3001;

// // --- Global Middleware ---
// app.use(cors());

// // --- Routes (Organized by Function) ---

// // --- Authentication & Status Routes (No Body Parser Needed) ---
// app.get("/api/auth/google", (req, res) => {
//   const scopes = [
//     "https://www.googleapis.com/auth/userinfo.profile",
//     "https://www.googleapis.com/auth/userinfo.email",
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
//     const userRef = db.collection("users").doc("main_user");
//     await userRef.set({ google_tokens: tokens }, { merge: true });
//     console.log("Google Auth successful, tokens stored in Firestore.");
//     res.send(
//       "<h1>Authentication successful!</h1><p>You can close this tab now.</p>"
//     );
//   } catch (error) {
//     console.error("Error authenticating with Google:", error);
//     res.status(500).send("Authentication failed.");
//   }
// });

// app.get("/api/auth/github", (req, res) => {
//   const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo`;
//   res.json({ url });
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
//           client_id: process.env.GITHUB_CLIENT_ID,
//           client_secret: process.env.GITHUB_CLIENT_SECRET,
//           code: code,
//         }),
//       }
//     );
//     const tokenData = await tokenResponse.json();
//     const accessToken = tokenData.access_token;
//     const userRef = db.collection("users").doc("main_user");
//     await userRef.set({ github_access_token: accessToken }, { merge: true });
//     console.log("GitHub Auth successful, token stored in Firestore.");
//     res.send(
//       "<h1>GitHub Authentication successful!</h1><p>You can close this tab now.</p>"
//     );
//   } catch (error) {
//     console.error("Error authenticating with GitHub:", error);
//     res.status(500).send("GitHub Authentication failed.");
//   }
// });

// app.get("/api/auth/status", async (req, res) => {
//   try {
//     const userDoc = await db.collection("users").doc("main_user").get();
//     const data = userDoc.data();
//     res.json({
//       isGoogleLoggedIn: !!(data && data.google_tokens),
//       isGithubLoggedIn: !!(data && data.github_access_token),
//     });
//   } catch (error) {
//     console.error("Error checking auth status:", error);
//     res.status(500).json({ error: "Failed to check auth status." });
//   }
// });

// // --- Notification Routes ---
// app.get("/api/notifications", async (req, res) => {
//   try {
//     const notificationsSnapshot = await db
//       .collection("notifications")
//       .orderBy("timestamp", "desc")
//       .limit(20)
//       .get();
//     const notifications = notificationsSnapshot.docs.map((doc) => ({
//       id: doc.id,
//       ...doc.data(),
//     }));
//     res.json(notifications);
//   } catch (error) {
//     console.error("Error fetching notifications:", error);
//     res.status(500).json({ error: "Failed to fetch notifications." });
//   }
// });

// // --- Webhook Route (Requires Raw Body Parser) ---
// app.post(
//   "/api/github/webhook",
//   express.raw({ type: "application/json" }),
//   async (req, res) => {
//     const githubEvent = req.headers["x-github-event"];
//     const data = JSON.parse(req.body);

//     console.log(`--- GitHub Webhook Received: ${githubEvent} ---`);

//     try {
//       let notification = {
//         read: false,
//         timestamp: admin.firestore.FieldValue.serverTimestamp(),
//       };

//       if (githubEvent === "pull_request") {
//         const pr = data.pull_request;
//         notification.type = "pr";
//         notification.message = `PR #${data.number} ${data.action}: "${pr.title}"`;
//         notification.url = pr.html_url;
//         notification.user = pr.user.login;
//         await db.collection("notifications").add(notification);
//         console.log("PR notification saved to Firestore.");
//       } else if (githubEvent === "push") {
//         const pusher = data.pusher.name;
//         const branch = data.ref.split("/").pop();
//         notification.type = "push";
//         notification.message = `${pusher} pushed ${data.commits.length} commit(s) to ${branch}`;
//         notification.url = data.compare;
//         notification.user = pusher;
//         await db.collection("notifications").add(notification);
//         console.log("Push notification saved to Firestore.");
//       }
//     } catch (error) {
//       console.error("Error processing webhook and saving to Firestore:", error);
//     }
//     res.status(200).send("Event received");
//   }
// );

// // --- Action Routes (Requires JSON Body Parser) ---
// app.use(express.json()); // Apply JSON parser for all subsequent routes

// app.post("/api/logout", async (req, res) => {
//   try {
//     const userRef = db.collection("users").doc("main_user");
//     await userRef.update({
//       google_tokens: admin.firestore.FieldValue.delete(),
//       github_access_token: admin.firestore.FieldValue.delete(),
//     });
//     console.log("User tokens deleted from Firestore.");
//     res.json({ success: true, message: "Logged out successfully." });
//   } catch (error) {
//     console.error("Error during logout:", error);
//     res.status(500).json({ error: "Logout failed on the server." });
//   }
// });

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

// --- Basic Server Setup ---
const app = express();
const PORT = process.env.PORT || 3001;

// --- Global Middleware ---
app.use(cors());

// --- Routes (Organized by Function) ---

// --- Authentication & Status Routes (No Body Parser Needed) ---
app.get("/api/auth/google", (req, res) => {
  const scopes = [
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
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
    const userRef = db.collection("users").doc("main_user");
    await userRef.set({ google_tokens: tokens }, { merge: true });
    console.log("Google Auth successful, tokens stored in Firestore.");
    res.send(
      "<h1>Authentication successful!</h1><p>You can close this tab now.</p>"
    );
  } catch (error) {
    console.error("Error authenticating with Google:", error);
    res.status(500).send("Authentication failed.");
  }
});

app.get("/api/auth/github", (req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo`;
  res.json({ url });
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
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code: code,
        }),
      }
    );
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const userRef = db.collection("users").doc("main_user");
    await userRef.set({ github_access_token: accessToken }, { merge: true });
    console.log("GitHub Auth successful, token stored in Firestore.");
    res.send(
      "<h1>GitHub Authentication successful!</h1><p>You can close this tab now.</p>"
    );
  } catch (error) {
    console.error("Error authenticating with GitHub:", error);
    res.status(500).send("GitHub Authentication failed.");
  }
});

app.get("/api/auth/status", async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc("main_user").get();
    const data = userDoc.data();
    res.json({
      isGoogleLoggedIn: !!(data && data.google_tokens),
      isGithubLoggedIn: !!(data && data.github_access_token),
    });
  } catch (error) {
    console.error("Error checking auth status:", error);
    res.status(500).json({ error: "Failed to check auth status." });
  }
});

// --- Notification Routes ---
app.get("/api/notifications", async (req, res) => {
  try {
    const notificationsSnapshot = await db
      .collection("notifications")
      .orderBy("timestamp", "desc")
      .limit(20)
      .get();
    const notifications = notificationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications." });
  }
});

// --- Webhook Route (Requires Raw Body Parser) ---
app.post(
  "/api/github/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const githubEvent = req.headers["x-github-event"];
    const data = JSON.parse(req.body);

    console.log(`--- GitHub Webhook Received: ${githubEvent} ---`);

    try {
      let notification = {
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (githubEvent === "pull_request") {
        const pr = data.pull_request;
        notification.type = "pr";
        notification.message = `PR #${data.number} ${data.action}: "${pr.title}"`;
        notification.url = pr.html_url;
        notification.user = pr.user.login;
        await db.collection("notifications").add(notification);
        console.log("PR notification saved to Firestore.");
      } else if (githubEvent === "push") {
        const pusher = data.pusher.name;
        const branch = data.ref.split("/").pop();
        notification.type = "push";
        notification.message = `${pusher} pushed ${data.commits.length} commit(s) to ${branch}`;
        notification.url = data.compare;
        notification.user = pusher;
        await db.collection("notifications").add(notification);
        console.log("Push notification saved to Firestore.");
      }
    } catch (error) {
      console.error("Error processing webhook and saving to Firestore:", error);
    }
    res.status(200).send("Event received");
  }
);

// --- Action Routes (Requires JSON Body Parser) ---
app.use(express.json());

app.post("/api/logout", async (req, res) => {
  try {
    const userRef = db.collection("users").doc("main_user");
    await userRef.update({
      google_tokens: admin.firestore.FieldValue.delete(),
      github_access_token: admin.firestore.FieldValue.delete(),
    });
    console.log("User tokens deleted from Firestore.");
    res.json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ error: "Logout failed on the server." });
  }
});

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

// --- AI Pull Request Review Route ---
app.post("/api/github/pr/review", async (req, res) => {
  const { prUrl } = req.body;
  if (!prUrl) {
    return res.status(400).json({ error: "Pull Request URL is required." });
  }

  try {
    // 1. Get the user's GitHub token from Firestore
    const userDoc = await db.collection("users").doc("main_user").get();
    if (!userDoc.exists || !userDoc.data().github_access_token) {
      return res.status(401).json({ error: "GitHub token not found." });
    }
    const accessToken = userDoc.data().github_access_token;

    // 2. Convert the PR URL to the GitHub API URL for the diff
    const apiUrl = prUrl
      .replace("github.com", "api.github.com/repos")
      .replace("/pull/", "/pulls/");

    // 3. Fetch the .diff file from the GitHub API
    const diffResponse = await fetch(apiUrl, {
      headers: {
        Authorization: `token ${accessToken}`,
        // This special header tells GitHub to give us the diff format
        Accept: "application/vnd.github.v3.diff",
      },
    });

    if (!diffResponse.ok) {
      throw new Error(`Failed to fetch PR diff: ${diffResponse.statusText}`);
    }
    const diffText = await diffResponse.text();

    // 4. Send the diff to the Gemini AI for review
    const prompt = `You are an expert code reviewer. Please review the following code changes (in .diff format) and provide a concise summary of potential issues, bugs, or style improvements. Be specific and provide code examples if necessary. Format your response in Markdown.\n\nDiff:\n${diffText}`;

    const result = await model.generateContent(prompt);
    const review = result.response.text();

    // 5. Send the AI-generated review back to the frontend
    res.json({ review });
  } catch (error) {
    console.error("Error generating PR review:", error);
    res.status(500).json({ error: "Failed to generate PR review." });
  }
});

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
