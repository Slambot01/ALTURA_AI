// // --- Import necessary packages ---
// const express = require("express");
// const cors = require("cors");
// const fetch = require("node-fetch");
// const admin = require("firebase-admin");
// const { google } = require("googleapis");
// const { GoogleGenerativeAI } = require("@google/generative-ai");
// const { Client } = require("@notionhq/client");
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

// // --- Notion Client Initialization ---
// const notion = new Client({ auth: process.env.NOTION_API_KEY });
// const notionParentPageId = process.env.NOTION_PARENT_PAGE_ID;

// // --- Basic Server Setup ---
// const app = express();
// const PORT = process.env.PORT || 3001;
// app.use(cors());

// // --- Routes (Organized by Function) ---

// // --- Authentication & Status Routes (No Body Parser Needed) ---
// app.get("/api/auth/google", (req, res) => {
//   const scopes = [
//     "https://www.googleapis.com/auth/userinfo.profile",
//     "https://www.googleapis.com/auth/userinfo.email",
//     "https://www.googleapis.com/auth/gmail.compose",
//     "https://www.googleapis.com/auth/calendar.readonly",
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
//       } else if (githubEvent === "push") {
//         const pusher = data.pusher.name;
//         const branch = data.ref.split("/").pop();
//         notification.type = "push";
//         notification.message = `${pusher} pushed ${data.commits.length} commit(s) to ${branch}`;
//         notification.url = data.compare;
//         notification.user = pusher;
//         await db.collection("notifications").add(notification);
//       }
//     } catch (error) {
//       console.error("Error processing webhook:", error);
//     }
//     res.status(200).send("Event received");
//   }
// );

// // --- Action Routes (Requires JSON Body Parser) ---
// app.use(express.json());

// app.post("/api/logout", async (req, res) => {
//   try {
//     const userRef = db.collection("users").doc("main_user");
//     await userRef.update({
//       google_tokens: admin.firestore.FieldValue.delete(),
//       github_access_token: admin.firestore.FieldValue.delete(),
//     });
//     res.json({ success: true, message: "Logged out successfully." });
//   } catch (error) {
//     res.status(500).json({ error: "Logout failed on the server." });
//   }
// });

// app.post("/api/summarize", async (req, res) => {
//   try {
//     const { text } = req.body;
//     if (!text)
//       return res.status(400).json({ error: "Text content is required." });
//     const prompt = `Summarize the following text:\n\n${text}`;
//     const result = await model.generateContent(prompt);
//     res.json({ summary: result.response.text() });
//   } catch (error) {
//     res.status(500).json({ error: "Failed to generate summary." });
//   }
// });

// app.post("/api/gmail/draft", async (req, res) => {
//   try {
//     const userDoc = await db.collection("users").doc("main_user").get();
//     if (!userDoc.exists || !userDoc.data().google_tokens) {
//       return res
//         .status(401)
//         .json({ error: "User is not authenticated with Google." });
//     }
//     googleOauth2Client.setCredentials(userDoc.data().google_tokens);
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
//     res.status(500).json({ error: "Failed to create draft." });
//   }
// });

// app.post("/api/github/pr/review", async (req, res) => {
//   const { prUrl } = req.body;
//   if (!prUrl) {
//     return res.status(400).json({ error: "Pull Request URL is required." });
//   }
//   try {
//     const userDoc = await db.collection("users").doc("main_user").get();
//     if (!userDoc.exists || !userDoc.data().github_access_token) {
//       return res.status(401).json({ error: "GitHub token not found." });
//     }
//     const accessToken = userDoc.data().github_access_token;
//     const apiUrl = prUrl
//       .replace("github.com", "api.github.com/repos")
//       .replace("/pull/", "/pulls/");
//     const diffResponse = await fetch(apiUrl, {
//       headers: {
//         Authorization: `token ${accessToken}`,
//         Accept: "application/vnd.github.v3.diff",
//       },
//     });
//     if (!diffResponse.ok)
//       throw new Error(`Failed to fetch PR diff: ${diffResponse.statusText}`);
//     const diffText = await diffResponse.text();
//     const prompt = `You are an expert code reviewer. Please review the following code changes (in .diff format) and provide a concise summary of potential issues, bugs, or style improvements. Format your response in Markdown.\n\nDiff:\n${diffText}`;
//     const result = await model.generateContent(prompt);
//     res.json({ review: result.response.text() });
//   } catch (error) {
//     res.status(500).json({ error: "Failed to generate PR review." });
//   }
// });

// app.post("/api/notion/create", async (req, res) => {
//   const { pageContent } = req.body;
//   if (!pageContent) {
//     return res.status(400).json({ error: "Page content is required." });
//   }
//   try {
//     const prompt = `Based on the following text, generate a suitable title and format the main content for a Notion document. The content should be well-structured with headings and bullet points where appropriate. Format the output as a JSON object with "title" and "content" keys. Text: "${pageContent.substring(
//       0,
//       4000
//     )}"`;
//     const aiResult = await model.generateContent(prompt);
//     const jsonString = aiResult.response
//       .text()
//       .replace(/```json\n|```/g, "")
//       .trim();
//     const { title, content } = JSON.parse(jsonString);

//     await notion.pages.create({
//       parent: { page_id: notionParentPageId },
//       properties: {
//         title: [{ text: { content: title } }],
//       },
//       children: [
//         {
//           object: "block",
//           type: "paragraph",
//           paragraph: { rich_text: [{ type: "text", text: { content } }] },
//         },
//       ],
//     });
//     res.json({
//       success: true,
//       message: "Notion document created successfully!",
//     });
//   } catch (error) {
//     console.error("Error creating Notion document:", error);
//     res.status(500).json({ error: "Failed to create Notion document." });
//   }
// });

// app.post("/api/calendar/find-times", async (req, res) => {
//   try {
//     const userDoc = await db.collection("users").doc("main_user").get();
//     if (!userDoc.exists || !userDoc.data().google_tokens) {
//       return res
//         .status(401)
//         .json({ error: "User is not authenticated with Google." });
//     }
//     googleOauth2Client.setCredentials(userDoc.data().google_tokens);
//     const calendar = google.calendar({
//       version: "v3",
//       auth: googleOauth2Client,
//     });

//     const now = new Date();
//     const sevenDaysFromNow = new Date();
//     sevenDaysFromNow.setDate(now.getDate() + 7);

//     const response = await calendar.freebusy.query({
//       requestBody: {
//         timeMin: now.toISOString(),
//         timeMax: sevenDaysFromNow.toISOString(),
//         items: [{ id: "primary" }],
//       },
//     });

//     const busyTimes = response.data.calendars.primary.busy;
//     res.json({ busyTimes });
//   } catch (error) {
//     console.error("Error fetching free/busy times:", error);
//     res.status(500).json({ error: "Failed to find meeting times." });
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
const { Client } = require("@notionhq/client");
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

// --- Notion Client Initialization ---
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const notionParentPageId = process.env.NOTION_PARENT_PAGE_ID;

// --- Basic Server Setup ---
const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS to allow the extension
app.use(
  cors({
    origin: ["http://localhost:3000", "chrome-extension://*"],
    credentials: true,
  })
);

// --- Middleware Setup ---
// Parse JSON for most routes
app.use("/api/github/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

// --- Authentication & Status Routes ---
app.get("/api/auth/google", (req, res) => {
  const scopes = [
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/calendar.readonly",
  ];
  const url = googleOauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
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

    res.send(`
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #4CAF50; }
          </style>
        </head>
        <body>
          <h1 class="success">✓ Authentication Successful!</h1>
          <p>You can now close this tab and return to the extension.</p>
          <script>
            // Auto-close after 3 seconds
            setTimeout(() => { window.close(); }, 3000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error authenticating with Google:", error);
    res.status(500).send(`
      <html>
        <body>
          <h1 style="color: red;">Authentication Failed</h1>
          <p>Please try again or contact support.</p>
        </body>
      </html>
    `);
  }
});

app.get("/api/auth/github", (req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo,read:user`;
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

    if (tokenData.error) {
      throw new Error(
        tokenData.error_description || "GitHub authentication failed"
      );
    }

    const accessToken = tokenData.access_token;
    const userRef = db.collection("users").doc("main_user");
    await userRef.set({ github_access_token: accessToken }, { merge: true });
    console.log("GitHub Auth successful, token stored in Firestore.");

    res.send(`
      <html>
        <head>
          <title>GitHub Authentication Successful</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #4CAF50; }
          </style>
        </head>
        <body>
          <h1 class="success">✓ GitHub Authentication Successful!</h1>
          <p>You can now close this tab and return to the extension.</p>
          <script>
            // Auto-close after 3 seconds
            setTimeout(() => { window.close(); }, 3000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error authenticating with GitHub:", error);
    res.status(500).send(`
      <html>
        <body>
          <h1 style="color: red;">GitHub Authentication Failed</h1>
          <p>${error.message}</p>
        </body>
      </html>
    `);
  }
});

app.get("/api/auth/status", async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc("main_user").get();
    const data = userDoc.data() || {};

    // Check if tokens are still valid by testing them
    let isGoogleValid = false;
    let isGithubValid = false;

    if (data.google_tokens) {
      try {
        googleOauth2Client.setCredentials(data.google_tokens);
        const oauth2 = google.oauth2({
          version: "v2",
          auth: googleOauth2Client,
        });
        await oauth2.userinfo.get();
        isGoogleValid = true;
      } catch (error) {
        console.log("Google token expired or invalid");
      }
    }

    if (data.github_access_token) {
      try {
        const response = await fetch("https://api.github.com/user", {
          headers: { Authorization: `token ${data.github_access_token}` },
        });
        isGithubValid = response.ok;
      } catch (error) {
        console.log("GitHub token expired or invalid");
      }
    }

    res.json({
      isGoogleLoggedIn: isGoogleValid,
      isGithubLoggedIn: isGithubValid,
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

// --- Webhook Route ---
app.post("/api/github/webhook", async (req, res) => {
  const githubEvent = req.headers["x-github-event"];
  const data = JSON.parse(req.body);

  try {
    let notification = {
      read: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      repo: data.repository ? data.repository.name : "Unknown",
    };

    if (githubEvent === "pull_request") {
      const pr = data.pull_request;
      notification.type = "pr";
      notification.message = `PR #${data.number} ${data.action}: "${pr.title}"`;
      notification.url = pr.html_url;
      notification.user = pr.user.login;
      await db.collection("notifications").add(notification);
    } else if (githubEvent === "push") {
      const pusher = data.pusher.name;
      const branch = data.ref.split("/").pop();
      notification.type = "push";
      notification.message = `${pusher} pushed ${data.commits.length} commit(s) to ${branch}`;
      notification.url = data.compare;
      notification.user = pusher;
      await db.collection("notifications").add(notification);
    }

    console.log(`GitHub webhook received: ${githubEvent}`);
  } catch (error) {
    console.error("Error processing webhook:", error);
  }
  res.status(200).send("Event received");
});

// --- Action Routes ---
app.post("/api/logout", async (req, res) => {
  try {
    const userRef = db.collection("users").doc("main_user");
    await userRef.update({
      google_tokens: admin.firestore.FieldValue.delete(),
      github_access_token: admin.firestore.FieldValue.delete(),
    });
    res.json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Logout failed on the server." });
  }
});

app.post("/api/summarize", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Text content is required." });
    }

    const prompt = `Please provide a concise summary of the following text in 2-3 sentences:\n\n${text.substring(
      0,
      8000
    )}`;
    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    res.json({ summary: summary });
  } catch (error) {
    console.error("Summarization error:", error);
    res
      .status(500)
      .json({ error: "Failed to generate summary. Please try again." });
  }
});

app.post("/api/gmail/draft", async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc("main_user").get();
    if (!userDoc.exists || !userDoc.data().google_tokens) {
      return res
        .status(401)
        .json({ error: "User is not authenticated with Google." });
    }

    const { pageContent } = req.body;
    if (!pageContent || pageContent.trim() === "") {
      return res.status(400).json({ error: "Page content is required." });
    }

    googleOauth2Client.setCredentials(userDoc.data().google_tokens);
    const gmail = google.gmail({ version: "v1", auth: googleOauth2Client });

    const prompt = `Based on the following web page content, generate a professional email draft. 
    Respond with a JSON object containing "subject" and "body" fields. 
    The subject should be concise and relevant. 
    The body should be professional and reference the content appropriately.
    
    Content: "${pageContent.substring(0, 4000)}"`;

    const aiResult = await model.generateContent(prompt);
    let responseText = aiResult.response.text();

    // Clean up the response to extract JSON
    responseText = responseText.replace(/```json\n?|\n?```/g, "").trim();

    let emailData;
    try {
      emailData = JSON.parse(responseText);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      emailData = {
        subject: "Regarding the shared content",
        body: `Hi,\n\nI wanted to share some interesting content with you:\n\n${pageContent.substring(
          0,
          500
        )}...\n\nBest regards`,
      };
    }

    const { subject, body } = emailData;

    const email = [
      'Content-Type: text/plain; charset="UTF-8"',
      "MIME-Version: 1.0",
      "To: ",
      `Subject: ${subject}`,
      "",
      body,
    ].join("\n");

    const base64EncodedEmail = Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.drafts.create({
      userId: "me",
      requestBody: { message: { raw: base64EncodedEmail } },
    });

    res.json({
      success: true,
      message: "Email draft created successfully in Gmail!",
    });
  } catch (error) {
    console.error("Gmail draft error:", error);
    res.status(500).json({
      error: "Failed to create draft. Please check your Google authentication.",
    });
  }
});

// --- GitHub PR Review Route ---
app.post("/api/github/pr/review", async (req, res) => {
  const { prUrl } = req.body;
  if (!prUrl) {
    return res.status(400).json({ error: "Pull Request URL is required." });
  }

  try {
    const userDoc = await db.collection("users").doc("main_user").get();
    if (!userDoc.exists || !userDoc.data().github_access_token) {
      return res
        .status(401)
        .json({ error: "GitHub token not found. Please login with GitHub." });
    }

    const accessToken = userDoc.data().github_access_token;

    // Convert GitHub PR URL to API URL
    const apiUrl = prUrl
      .replace("github.com", "api.github.com/repos")
      .replace("/pull/", "/pulls/");

    // Fetch PR diff
    const diffResponse = await fetch(apiUrl, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3.diff",
      },
    });

    if (!diffResponse.ok) {
      throw new Error(`Failed to fetch PR diff: ${diffResponse.statusText}`);
    }

    const diffText = await diffResponse.text();

    // Fetch PR details
    const prResponse = await fetch(apiUrl, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!prResponse.ok) {
      throw new Error(`Failed to fetch PR details: ${prResponse.statusText}`);
    }

    const prData = await prResponse.json();

    // Generate AI review
    const prompt = `As a senior software engineer, please review the following pull request and provide constructive feedback.

PR Title: ${prData.title}
PR Description: ${prData.body || "No description provided"}

Code Changes:
${diffText.substring(0, 6000)}

Please provide:
1. A brief summary of what this PR does
2. Any potential issues or concerns
3. Suggestions for improvement
4. Overall assessment

Keep the review constructive and professional.`;

    const aiResult = await model.generateContent(prompt);
    const review = aiResult.response.text();

    res.json({ review });
  } catch (error) {
    console.error("PR review error:", error);
    res.status(500).json({
      error:
        error.message || "Failed to review pull request. Please try again.",
    });
  }
});

// --- Notion Document Creation Route ---
app.post("/api/notion/create", async (req, res) => {
  try {
    const { pageContent } = req.body;
    if (!pageContent || pageContent.trim() === "") {
      return res.status(400).json({ error: "Page content is required." });
    }

    if (!process.env.NOTION_API_KEY || !notionParentPageId) {
      return res.status(500).json({
        error: "Notion API key or parent page ID not configured.",
      });
    }

    // Generate title using AI
    const titlePrompt = `Generate a concise, descriptive title (max 50 characters) for a document based on this content: ${pageContent.substring(
      0,
      1000
    )}`;
    const titleResult = await model.generateContent(titlePrompt);
    let title = titleResult.response.text().trim();

    // Clean up the title
    title = title.replace(/['"]/g, "").substring(0, 50);
    if (!title) {
      title = `Document - ${new Date().toLocaleDateString()}`;
    }

    // Generate summary using AI
    const summaryPrompt = `Provide a well-structured summary of the following content. Format it in clear paragraphs: ${pageContent.substring(
      0,
      4000
    )}`;
    const summaryResult = await model.generateContent(summaryPrompt);
    const summary = summaryResult.response.text();

    // Create the Notion page
    const response = await notion.pages.create({
      parent: {
        page_id: notionParentPageId,
      },
      properties: {
        title: {
          title: [
            {
              text: {
                content: title,
              },
            },
          ],
        },
      },
      children: [
        {
          object: "block",
          type: "heading_1",
          heading_1: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Document Summary",
                },
              },
            ],
          },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: summary,
                },
              },
            ],
          },
        },
        {
          object: "block",
          type: "divider",
          divider: {},
        },
        {
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Original Content",
                },
              },
            ],
          },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: pageContent.substring(0, 2000), // Notion has limits on block content
                },
              },
            ],
          },
        },
      ],
    });

    res.json({
      success: true,
      message: `Notion document created successfully!`,
      url: response.url,
    });
  } catch (error) {
    console.error("Notion creation error:", error);
    res.status(500).json({
      error:
        "Failed to create Notion document. Please check your Notion configuration.",
    });
  }
});

// --- Calendar Routes ---
app.post("/api/calendar/find-times", async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc("main_user").get();
    if (!userDoc.exists || !userDoc.data().google_tokens) {
      return res
        .status(401)
        .json({ error: "User is not authenticated with Google." });
    }

    googleOauth2Client.setCredentials(userDoc.data().google_tokens);
    const calendar = google.calendar({
      version: "v3",
      auth: googleOauth2Client,
    });

    // Get busy times for the next 7 days
    const now = new Date();
    const endOfWeek = new Date();
    endOfWeek.setDate(now.getDate() + 7);

    const freeBusyResponse = await calendar.freebusy.query({
      requestBody: {
        timeMin: now.toISOString(),
        timeMax: endOfWeek.toISOString(),
        items: [{ id: "primary" }],
      },
    });

    const busyTimes = freeBusyResponse.data.calendars.primary.busy || [];

    res.json({ busyTimes });
  } catch (error) {
    console.error("Calendar error:", error);
    res.status(500).json({
      error:
        "Failed to fetch calendar data. Please check your Google authentication.",
    });
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 AlturaAI server running on http://localhost:${PORT}`);
  console.log("📡 Ready to handle requests from the Chrome extension!");
});
