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
//     "https://www.googleapis.com/auth/gmail.readonly",
//   ];
//   const url = googleOauth2Client.generateAuthUrl({
//     access_type: "offline",
//     scope: scopes,
//     prompt: "consent",
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
//   express.raw({ type: "application/json", limit: "5mb" }),
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
// app.use(express.json({ limit: "5mb" }));

// // --- Order Scanning Route ---
// app.post("/api/orders/scan-inbox", async (req, res) => {
//   try {
//     const userDoc = await db.collection("users").doc("main_user").get();
//     if (!userDoc.exists || !userDoc.data().google_tokens) {
//       return res
//         .status(401)
//         .json({ error: "User is not authenticated with Google." });
//     }
//     googleOauth2Client.setCredentials(userDoc.data().google_tokens);
//     const gmail = google.gmail({ version: "v1", auth: googleOauth2Client });

//     const searchQuery =
//       'from:(amazon.in OR flipkart.com OR myntra.com OR meesho.com OR ajio.com) {"order confirmation" "your order" "order placed" "has been shipped" "out for delivery"}';

//     const listResponse = await gmail.users.messages.list({
//       userId: "me",
//       q: searchQuery,
//       maxResults: 15,
//     });

//     const messages = listResponse.data.messages;
//     if (!messages || messages.length === 0) {
//       return res.json({
//         success: true,
//         message: "No new order confirmation emails found.",
//       });
//     }

//     let ordersFound = 0;
//     for (const message of messages) {
//       const msgResponse = await gmail.users.messages.get({
//         userId: "me",
//         id: message.id,
//         format: "full",
//       });

//       let emailBody = "";
//       const payload = msgResponse.data.payload;
//       if (payload.parts) {
//         const part = payload.parts.find((p) => p.mimeType === "text/plain");
//         if (part && part.body && part.body.data) {
//           emailBody = Buffer.from(part.body.data, "base64").toString("utf-8");
//         }
//       } else if (payload.body && payload.body.data) {
//         emailBody = Buffer.from(payload.body.data, "base64").toString("utf-8");
//       }

//       if (emailBody) {
//         const prompt = `From the following email text, extract the item name, order ID, tracking number (if available), and estimated delivery date (ETA). Respond ONLY with a JSON object with the keys "itemName", "orderId", "trackingNumber", and "eta". If a value is not found, use "N/A".\n\nEmail Text:\n${emailBody.substring(
//           0,
//           4000
//         )}`;
//         const aiResult = await model.generateContent(prompt);
//         const jsonString = aiResult.response
//           .text()
//           .replace(/```json\n|```/g, "")
//           .trim();

//         try {
//           const orderData = JSON.parse(jsonString);
//           if (orderData.orderId && orderData.orderId !== "N/A") {
//             await db
//               .collection("orders")
//               .doc(orderData.orderId)
//               .set(
//                 {
//                   ...orderData,
//                   source: "gmail",
//                   scannedAt: admin.firestore.FieldValue.serverTimestamp(),
//                 },
//                 { merge: true }
//               );
//             ordersFound++;
//           }
//         } catch (e) {
//           console.error("Could not parse AI response for order:", jsonString);
//         }
//       }
//     }

//     res.json({
//       success: true,
//       message: `Scan complete. Found and saved ${ordersFound} orders.`,
//     });
//   } catch (error) {
//     console.error("Error scanning inbox for orders:", error);
//     res.status(500).json({ error: "Failed to scan inbox for orders." });
//   }
// });

// // --- NEW: Add Parcel Tracking Route ---
// app.post("/api/orders/add-tracking", async (req, res) => {
//   const { orderId, trackingNumber } = req.body;
//   if (!orderId || !trackingNumber) {
//     return res
//       .status(400)
//       .json({ error: "Order ID and Tracking Number are required." });
//   }

//   try {
//     // 1. Use AI to guess the carrier (e.g., 'delhivery', 'bluedart')
//     const prompt = `Based on the tracking number "${trackingNumber}", what is the most likely shipping carrier slug? Examples: delhivery, bluedart, ekart, ecom. Respond with only the carrier slug.`;
//     const aiResult = await model.generateContent(prompt);
//     const carrierSlug = aiResult.response.text().trim().toLowerCase();

//     // 2. Register the tracking number with AfterShip
//     const aftershipResponse = await fetch(
//       "https://api.aftership.com/v4/trackings",
//       {
//         method: "POST",
//         headers: {
//           "as-api-key": process.env.AFTERSHIP_API_KEY,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           tracking: {
//             tracking_number: trackingNumber,
//             slug: carrierSlug,
//           },
//         }),
//       }
//     );

//     const aftershipData = await aftershipResponse.json();
//     if (!aftershipResponse.ok) {
//       throw new Error(
//         aftershipData.meta.message ||
//           "Failed to register tracking with AfterShip."
//       );
//     }

//     // 3. Save the AfterShip tracking ID to our order in Firestore
//     const aftershipTrackingId = aftershipData.data.tracking.id;
//     await db.collection("orders").doc(orderId).update({
//       aftershipTrackingId: aftershipTrackingId,
//       carrier: carrierSlug,
//       status: aftershipData.data.tracking.tag,
//     });

//     res.json({
//       success: true,
//       message: `Tracking started for order ${orderId}.`,
//     });
//   } catch (error) {
//     console.error("Error adding tracking:", error);
//     res.status(500).json({ error: "Failed to add tracking." });
//   }
// });

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
//     const prompt = `Generate a suitable title and a plain text summary for a Notion document based on the following content. Format the output as a JSON object with "title" and "content" keys. The content should be a single string. Text: "${pageContent.substring(
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
//           paragraph: {
//             rich_text: [{ type: "text", text: { content: content } }],
//           },
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

// app.post("/api/research/start", async (req, res) => {
//   const { topic } = req.body;
//   if (!topic) {
//     return res.status(400).json({ error: "Research topic is required." });
//   }

//   try {
//     const taskRef = await db.collection("research_tasks").add({
//       topic: topic,
//       status: "pending",
//       createdAt: admin.firestore.FieldValue.serverTimestamp(),
//     });

//     console.log(`New research task created with ID: ${taskRef.id}`);
//     res.json({ success: true, message: `Research on "${topic}" has started.` });

//     (async () => {
//       try {
//         console.log(`Performing AI research for task ${taskRef.id}...`);
//         const prompt = `Please conduct thorough research on the following topic and provide a detailed, well-structured summary. Include key points, relevant data, and a concluding paragraph. Topic: "${topic}"`;

//         const result = await model.generateContent(prompt);
//         const researchSummary = result.response.text();

//         await taskRef.update({
//           status: "completed",
//           result: researchSummary,
//           completedAt: admin.firestore.FieldValue.serverTimestamp(),
//         });
//         console.log(
//           `Research task ${taskRef.id} has been completed with real data.`
//         );
//       } catch (aiError) {
//         console.error(`AI research failed for task ${taskRef.id}:`, aiError);
//         await taskRef.update({
//           status: "failed",
//           error: "The AI failed to generate a response.",
//           completedAt: admin.firestore.FieldValue.serverTimestamp(),
//         });
//       }
//     })();
//   } catch (error) {
//     console.error("Error starting research task:", error);
//     res.status(500).json({ error: "Failed to start research task." });
//   }
// });

// // --- Start the Server ---
// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });

// ************************
// this here contains AI parecel tracking
//********************** */

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
// // Make sure you have the 'serviceAccountKey.json' file in the same directory
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
//   "http://localhost:3001/api/auth/google/callback" // Your callback URL
// );

// // --- Notion Client Initialization ---
// const notion = new Client({ auth: process.env.NOTION_API_KEY });
// const notionParentPageId = process.env.NOTION_PARENT_PAGE_ID;

// // --- Basic Server Setup ---
// const app = express();
// const PORT = process.env.PORT || 3001;
// app.use(cors());

// // --- Helper function for delay ---
// const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// // --- Routes (Organized by Function) ---

// // --- Authentication & Status Routes (No Body Parser Needed) ---
// app.get("/api/auth/google", (req, res) => {
//   const scopes = [
//     "https://www.googleapis.com/auth/userinfo.profile",
//     "https://www.googleapis.com/auth/userinfo.email",
//     "https://www.googleapis.com/auth/gmail.compose",
//     "https://www.googleapis.com/auth/calendar.readonly",
//     "https://www.googleapis.com/auth/gmail.readonly",
//   ];
//   const url = googleOauth2Client.generateAuthUrl({
//     access_type: "offline",
//     scope: scopes,
//     prompt: "consent",
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
//   express.raw({ type: "application/json", limit: "5mb" }),
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
// app.use(express.json({ limit: "5mb" }));

// // --- FINAL CORRECTED Order Scanning Route ---
// app.post("/api/orders/scan-inbox", async (req, res) => {
//   try {
//     const userDoc = await db.collection("users").doc("main_user").get();
//     if (!userDoc.exists || !userDoc.data().google_tokens) {
//       return res
//         .status(401)
//         .json({ error: "User is not authenticated with Google." });
//     }
//     googleOauth2Client.setCredentials(userDoc.data().google_tokens);
//     const gmail = google.gmail({ version: "v1", auth: googleOauth2Client });

//     const searchQuery =
//       'from:(amazon.in OR flipkart.com OR myntra.com OR meesho.com OR ajio.com) {"order confirmation" "your order" "order placed" "has been shipped" "out for delivery"}';

//     const listResponse = await gmail.users.messages.list({
//       userId: "me",
//       q: searchQuery,
//       maxResults: 15,
//     });

//     const messages = listResponse.data.messages;
//     console.log(
//       `Found ${messages ? messages.length : 0} potential order emails.`
//     );

//     if (!messages || messages.length === 0) {
//       return res.json({
//         success: true,
//         message: "No new order confirmation emails found.",
//         newlyFoundOrders: [],
//       });
//     }

//     let ordersFound = 0;
//     let processedEmails = 0;
//     const newlyFoundOrders = [];

//     for (const message of messages) {
//       try {
//         processedEmails++;
//         console.log(
//           `\n--- Processing email ${processedEmails}/${messages.length} ---`
//         );

//         const msgResponse = await gmail.users.messages.get({
//           userId: "me",
//           id: message.id,
//           format: "full",
//         });

//         const headers = msgResponse.data.payload.headers;
//         const fromHeader = headers.find((h) => h.name.toLowerCase() === "from");
//         const subjectHeader = headers.find(
//           (h) => h.name.toLowerCase() === "subject"
//         );

//         console.log(`From: ${fromHeader ? fromHeader.value : "Unknown"}`);
//         console.log(
//           `Subject: ${subjectHeader ? subjectHeader.value : "Unknown"}`
//         );

//         let emailBody = "";
//         const payload = msgResponse.data.payload;

//         if (payload.parts) {
//           let htmlPart = payload.parts.find((p) => p.mimeType === "text/html");
//           let textPart = payload.parts.find((p) => p.mimeType === "text/plain");

//           if (htmlPart && htmlPart.body && htmlPart.body.data) {
//             emailBody = Buffer.from(htmlPart.body.data, "base64").toString(
//               "utf-8"
//             );
//           } else if (textPart && textPart.body && textPart.body.data) {
//             emailBody = Buffer.from(textPart.body.data, "base64").toString(
//               "utf-8"
//             );
//           }
//         } else if (payload.body && payload.body.data) {
//           emailBody = Buffer.from(payload.body.data, "base64").toString(
//             "utf-8"
//           );
//         }

//         if (!emailBody || emailBody.trim().length === 0) {
//           console.log("❌ No email body found, skipping...");
//           continue;
//         }

//         console.log(`📧 Email body length: ${emailBody.length} characters`);

//         // --- FINAL IMPROVED PROMPT ---
//         const prompt = `You are an expert at extracting order information. Analyze the Email Subject and Email Content below.

// Email Subject:
// ${subjectHeader ? subjectHeader.value : "N/A"}

// Email Content:
// ${emailBody.substring(0, 8000)}

// ---
// INSTRUCTIONS:
// From the information above, extract these details into a JSON object:
// - itemName: The main product name/title. Use the subject line first.
// - orderId: The order number, order ID, or reference number.
// - trackingNumber: The shipping tracking number. Look for labels like "Tracking Number:", "AWB:", or a long alphanumeric code near a "Track Package" link.
// - eta: The estimated delivery date. Look for labels like "Arriving by", "Expected Delivery:", "Delivered by", or a specific date (e.g., "July 25, 2024").

// Respond ONLY with a valid JSON object. If a field is not found, use "N/A".
// {
//   "itemName": "extracted item name or N/A",
//   "orderId": "extracted order ID or N/A",
//   "trackingNumber": "extracted tracking number or N/A",
//   "eta": "extracted delivery date or N/A"
// }`;

//         console.log("🤖 Sending to AI for extraction...");
//         // Add a delay before each API call to avoid rate limiting
//         await delay(2000); // 2-second delay
//         const aiResult = await model.generateContent(prompt);
//         let aiResponse = aiResult.response.text().trim();

//         aiResponse = aiResponse
//           .replace(/```json\n?/g, "")
//           .replace(/```\n?/g, "")
//           .trim();

//         console.log("🤖 Raw AI Response:");
//         console.log(aiResponse);

//         try {
//           const orderData = JSON.parse(aiResponse);
//           console.log(
//             "📊 Parsed Order Data:",
//             JSON.stringify(orderData, null, 2)
//           );

//           const hasOrderId =
//             orderData.orderId &&
//             orderData.orderId !== "N/A" &&
//             orderData.orderId.trim().length > 0 &&
//             orderData.orderId.toLowerCase() !== "not found" &&
//             orderData.orderId.toLowerCase() !== "none";

//           if (hasOrderId) {
//             const existingOrder = await db
//               .collection("orders")
//               .doc(orderData.orderId)
//               .get();

//             if (existingOrder.exists) {
//               console.log(
//                 `⚠️ Order ${orderData.orderId} already exists, skipping...`
//               );
//             } else {
//               const dataToSave = {
//                 ...orderData,
//                 source: "gmail",
//                 emailId: message.id,
//                 fromEmail: fromHeader ? fromHeader.value : "Unknown",
//                 subject: subjectHeader ? subjectHeader.value : "Unknown",
//                 scannedAt: admin.firestore.FieldValue.serverTimestamp(),
//               };

//               await db
//                 .collection("orders")
//                 .doc(orderData.orderId)
//                 .set(dataToSave, { merge: true });

//               newlyFoundOrders.push(dataToSave);
//               ordersFound++;
//               console.log(`✅ SUCCESS: Saved order ${orderData.orderId}`);
//             }
//           } else {
//             console.log(
//               `❌ No valid Order ID found. Got: "${orderData.orderId}"`
//             );
//             console.log(
//               "📧 Email might not be an order confirmation or AI couldn't extract ID"
//             );
//           }
//         } catch (parseError) {
//           console.error("❌ JSON Parse Error:", parseError.message);
//           console.log("Raw response that failed to parse:", aiResponse);
//         }
//       } catch (emailError) {
//         console.error(
//           `❌ Error processing email ${processedEmails}:`,
//           emailError.message
//         );
//       }
//     }

//     const result = {
//       success: true,
//       message: `Scan complete. Processed ${processedEmails} emails, found and saved ${ordersFound} orders.`,
//       stats: {
//         totalEmails: messages.length,
//         processedEmails,
//         ordersFound,
//         skipped: processedEmails - ordersFound,
//       },
//       newlyFoundOrders: newlyFoundOrders,
//     };

//     console.log("\n📊 Final Results:", result);
//     res.json(result);
//   } catch (error) {
//     console.error("❌ Error scanning inbox for orders:", error);
//     res.status(500).json({ error: "Failed to scan inbox for orders." });
//   }
// });

// app.post("/api/orders/add-tracking", async (req, res) => {
//   const { orderId, trackingNumber } = req.body;
//   if (!orderId || !trackingNumber) {
//     return res
//       .status(400)
//       .json({ error: "Order ID and Tracking Number are required." });
//   }

//   try {
//     const prompt = `Based on the tracking number "${trackingNumber}", what is the most likely shipping carrier slug? Examples: delhivery, bluedart, ekart, ecom. Respond with only the carrier slug.`;
//     const aiResult = await model.generateContent(prompt);
//     const carrierSlug = aiResult.response.text().trim().toLowerCase();

//     const aftershipResponse = await fetch(
//       "https://api.aftership.com/v4/trackings",
//       {
//         method: "POST",
//         headers: {
//           "as-api-key": process.env.AFTERSHIP_API_KEY,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           tracking: {
//             tracking_number: trackingNumber,
//             slug: carrierSlug,
//           },
//         }),
//       }
//     );

//     const aftershipData = await aftershipResponse.json();
//     if (!aftershipResponse.ok) {
//       throw new Error(
//         aftershipData.meta.message ||
//           "Failed to register tracking with AfterShip."
//       );
//     }

//     const aftershipTrackingId = aftershipData.data.tracking.id;
//     await db.collection("orders").doc(orderId).update({
//       aftershipTrackingId: aftershipTrackingId,
//       carrier: carrierSlug,
//       status: aftershipData.data.tracking.tag,
//     });

//     res.json({
//       success: true,
//       message: `Tracking started for order ${orderId}.`,
//     });
//   } catch (error) {
//     console.error("Error adding tracking:", error);
//     res.status(500).json({ error: "Failed to add tracking." });
//   }
// });

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
//     const prompt = `Generate a suitable title and a plain text summary for a Notion document based on the following content. Format the output as a JSON object with "title" and "content" keys. The content should be a single string. Text: "${pageContent.substring(
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
//           paragraph: {
//             rich_text: [{ type: "text", text: { content: content } }],
//           },
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

// app.post("/api/research/start", async (req, res) => {
//   const { topic } = req.body;
//   if (!topic) {
//     return res.status(400).json({ error: "Research topic is required." });
//   }

//   try {
//     const taskRef = await db.collection("research_tasks").add({
//       topic: topic,
//       status: "pending",
//       createdAt: admin.firestore.FieldValue.serverTimestamp(),
//     });

//     console.log(`New research task created with ID: ${taskRef.id}`);
//     res.json({ success: true, message: `Research on "${topic}" has started.` });

//     (async () => {
//       try {
//         console.log(`Performing AI research for task ${taskRef.id}...`);
//         const prompt = `Please conduct thorough research on the following topic and provide a detailed, well-structured summary. Include key points, relevant data, and a concluding paragraph. Topic: "${topic}"`;

//         const result = await model.generateContent(prompt);
//         const researchSummary = result.response.text();

//         await taskRef.update({
//           status: "completed",
//           result: researchSummary,
//           completedAt: admin.firestore.FieldValue.serverTimestamp(),
//         });
//         console.log(
//           `Research task ${taskRef.id} has been completed with real data.`
//         );
//       } catch (aiError) {
//         console.error(`AI research failed for task ${taskRef.id}:`, aiError);
//         await taskRef.update({
//           status: "failed",
//           error: "The AI failed to generate a response.",
//           completedAt: admin.firestore.FieldValue.serverTimestamp(),
//         });
//       }
//     })();
//   } catch (error) {
//     console.error("Error starting research task:", error);
//     res.status(500).json({ error: "Failed to start research task." });
//   }
// });

// // --- Start the Server ---
// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });

// // ************************
// ***************************
// *****************************
// --- Import necessary packages ---
// const express = require("express");
// const cors = require("cors");
// const fetch = require("node-fetch");
// const admin = require("firebase-admin");
// const { google } = require("googleapis");
// const { GoogleGenerativeAI } = require("@google/generative-ai");
// const { Client } = require("@notionhq/client");
// const cron = require("node-cron");
// const { YoutubeTranscript } = require("youtube-transcript");
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
// app.use(express.json({ limit: "5mb" }));

// // --- [ADDED] Helper function to extract YouTube Video ID ---
// function extractVideoId(url) {
//   // This regex handles various YouTube URL formats
//   const regex =
//     /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
//   const matches = url.match(regex);
//   return matches ? matches[1] : null;
// }

// // --- Routes (Organized by Function) ---

// // --- Authentication & Status Routes ---
// app.get("/api/auth/google", (req, res) => {
//   const scopes = [
//     "https://www.googleapis.com/auth/userinfo.profile",
//     "https://www.googleapis.com/auth/userinfo.email",
//     "https://www.googleapis.com/auth/gmail.compose",
//     "https://www.googleapis.com/auth/calendar.readonly",
//     "https://www.googleapis.com/auth/gmail.readonly",
//   ];
//   const url = googleOauth2Client.generateAuthUrl({
//     access_type: "offline",
//     scope: scopes,
//     prompt: "consent",
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
//   express.raw({ type: "application/json", limit: "5mb" }),
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

// // --- Action Routes ---

// // --- [UPDATED] YouTube Summarizer Route ---
// app.post("/api/youtube/summarize", async (req, res) => {
//   const { videoUrl } = req.body;
//   if (!videoUrl) {
//     return res.status(400).json({ error: "YouTube video URL is required." });
//   }

//   // Extract the video ID from the URL
//   const videoId = extractVideoId(videoUrl);

//   if (!videoId) {
//     return res
//       .status(400)
//       .json({ error: "Invalid or unsupported YouTube URL format." });
//   }

//   console.log(`Extracted Video ID: ${videoId}. Fetching transcript...`);

//   try {
//     // Use the extracted videoId, not the full URL
//     const transcriptArr = await YoutubeTranscript.fetchTranscript(videoId, {
//       lang: "en",
//     });

//     if (!transcriptArr || transcriptArr.length === 0) {
//       return res
//         .status(404)
//         .json({ error: "Could not find a transcript for this video." });
//     }

//     const transcriptText = transcriptArr.map((item) => item.text).join(" ");
//     console.log("Transcript fetched successfully. Summarizing with AI...");

//     const prompt = `Please summarize the key points of the following YouTube video transcript into a concise, easy-to-read bulleted list.\n\nTranscript:\n${transcriptText.substring(
//       0,
//       8000
//     )}\n\nSummary:`;

//     const result = await model.generateContent(prompt);
//     const summary = result.response.text();

//     res.json({ success: true, summary: summary });
//   } catch (error) {
//     console.error("--- [DEBUG] Error in YouTube Summarizer ---");
//     console.error(error);
//     console.error("-----------------------------------------");
//     res.status(500).json({
//       error:
//         "Failed to summarize video. It may not have a transcript available or another error occurred.",
//     });
//   }
// });

// // --- Order Scanning Route ---
// app.post("/api/orders/scan-inbox", async (req, res) => {
//   try {
//     const userDoc = await db.collection("users").doc("main_user").get();
//     if (!userDoc.exists || !userDoc.data().google_tokens) {
//       return res
//         .status(401)
//         .json({ error: "User is not authenticated with Google." });
//     }
//     googleOauth2Client.setCredentials(userDoc.data().google_tokens);
//     const gmail = google.gmail({ version: "v1", auth: googleOauth2Client });

//     const searchQuery =
//       'from:(amazon.in OR flipkart.com OR myntra.com OR meesho.com OR ajio.com) {"order confirmation" "your order" "order placed" "has been shipped" "out for delivery"}';

//     const listResponse = await gmail.users.messages.list({
//       userId: "me",
//       q: searchQuery,
//       maxResults: 15,
//     });

//     const messages = listResponse.data.messages;
//     if (!messages || messages.length === 0) {
//       return res.json({
//         success: true,
//         message: "No new order confirmation emails found.",
//       });
//     }

//     let ordersFound = 0;
//     for (const message of messages) {
//       const msgResponse = await gmail.users.messages.get({
//         userId: "me",
//         id: message.id,
//         format: "full",
//       });

//       let emailBody = "";
//       const payload = msgResponse.data.payload;
//       if (payload.parts) {
//         const part = payload.parts.find((p) => p.mimeType === "text/plain");
//         if (part && part.body && part.body.data) {
//           emailBody = Buffer.from(part.body.data, "base64").toString("utf-8");
//         }
//       } else if (payload.body && payload.body.data) {
//         emailBody = Buffer.from(payload.body.data, "base64").toString("utf-8");
//       }

//       if (emailBody) {
//         const prompt = `From the following email text, extract the item name, order ID, tracking number (if available), and estimated delivery date (ETA). Respond ONLY with a JSON object with the keys "itemName", "orderId", "trackingNumber", and "eta". If a value is not found, use "N/A".\n\nEmail Text:\n${emailBody.substring(
//           0,
//           4000
//         )}`;
//         const aiResult = await model.generateContent(prompt);
//         const jsonString = aiResult.response
//           .text()
//           .replace(/```json\n|```/g, "")
//           .trim();

//         try {
//           const orderData = JSON.parse(jsonString);
//           if (orderData.orderId && orderData.orderId !== "N/A") {
//             await db
//               .collection("orders")
//               .doc(orderData.orderId)
//               .set(
//                 {
//                   ...orderData,
//                   source: "gmail",
//                   scannedAt: admin.firestore.FieldValue.serverTimestamp(),
//                 },
//                 { merge: true }
//               );
//             ordersFound++;
//           }
//         } catch (e) {
//           console.error("Could not parse AI response for order:", jsonString);
//         }
//       }
//     }

//     res.json({
//       success: true,
//       message: `Scan complete. Found and saved ${ordersFound} orders.`,
//     });
//   } catch (error) {
//     console.error("Error scanning inbox for orders:", error);
//     res.status(500).json({ error: "Failed to scan inbox for orders." });
//   }
// });

// // --- Add Parcel Tracking Route ---
// app.post("/api/orders/add-tracking", async (req, res) => {
//   const { orderId, trackingNumber } = req.body;
//   if (!orderId || !trackingNumber) {
//     return res
//       .status(400)
//       .json({ error: "Order ID and Tracking Number are required." });
//   }

//   try {
//     const prompt = `Based on the tracking number "${trackingNumber}", what is the most likely shipping carrier slug? Examples: delhivery, bluedart, ekart, ecom. Respond with only the carrier slug.`;
//     const aiResult = await model.generateContent(prompt);
//     const carrierSlug = aiResult.response.text().trim().toLowerCase();

//     const aftershipResponse = await fetch(
//       "https://api.aftership.com/v4/trackings",
//       {
//         method: "POST",
//         headers: {
//           "as-api-key": process.env.AFTERSHIP_API_KEY,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           tracking: {
//             tracking_number: trackingNumber,
//             slug: carrierSlug,
//           },
//         }),
//       }
//     );

//     const aftershipData = await aftershipResponse.json();
//     if (!aftershipResponse.ok) {
//       throw new Error(
//         aftershipData.meta.message ||
//           "Failed to register tracking with AfterShip."
//       );
//     }

//     const aftershipTrackingId = aftershipData.data.tracking.id;
//     await db.collection("orders").doc(orderId).update({
//       aftershipTrackingId: aftershipTrackingId,
//       carrier: carrierSlug,
//       status: aftershipData.data.tracking.tag,
//     });

//     res.json({
//       success: true,
//       message: `Tracking started for order ${orderId}.`,
//     });
//   } catch (error) {
//     console.error("Error adding tracking:", error);
//     res.status(500).json({ error: "Failed to add tracking." });
//   }
// });

// // --- Snippet Saver Route ---
// app.post("/api/snippets/save", async (req, res) => {
//   const { snippetText, sourceUrl } = req.body;
//   if (!snippetText || !sourceUrl) {
//     return res
//       .status(400)
//       .json({ error: "Snippet text and source URL are required." });
//   }

//   try {
//     await db.collection("snippets").add({
//       text: snippetText,
//       url: sourceUrl,
//       savedAt: admin.firestore.FieldValue.serverTimestamp(),
//     });
//     res.json({ success: true, message: "Snippet saved successfully!" });
//   } catch (error) {
//     console.error("Error saving snippet:", error);
//     res.status(500).json({ error: "Failed to save snippet." });
//   }
// });

// // --- Stock Alert Route ---
// app.post("/api/stocks/add-alert", async (req, res) => {
//   const { ticker, targetPrice } = req.body;
//   if (!ticker || !targetPrice) {
//     return res
//       .status(400)
//       .json({ error: "Ticker and target price are required." });
//   }

//   try {
//     await db.collection("stock_alerts").add({
//       ticker: ticker.toUpperCase(),
//       targetPrice: Number(targetPrice),
//       createdAt: admin.firestore.FieldValue.serverTimestamp(),
//       status: "active",
//     });
//     res.json({
//       success: true,
//       message: `Alert set for ${ticker.toUpperCase()} at $${targetPrice}.`,
//     });
//   } catch (error) {
//     console.error("Error saving stock alert:", error);
//     res.status(500).json({ error: "Failed to save stock alert." });
//   }
// });

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
//     const prompt = `Generate a suitable title and a plain text summary for a Notion document based on the following content. Format the output as a JSON object with "title" and "content" keys. The content should be a single string. Text: "${pageContent.substring(
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
//           paragraph: {
//             rich_text: [{ type: "text", text: { content: content } }],
//           },
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

// app.post("/api/research/start", async (req, res) => {
//   const { topic } = req.body;
//   if (!topic) {
//     return res.status(400).json({ error: "Research topic is required." });
//   }

//   try {
//     const taskRef = await db.collection("research_tasks").add({
//       topic: topic,
//       status: "pending",
//       createdAt: admin.firestore.FieldValue.serverTimestamp(),
//     });

//     console.log(`New research task created with ID: ${taskRef.id}`);
//     res.json({ success: true, message: `Research on "${topic}" has started.` });

//     (async () => {
//       try {
//         console.log(`Performing AI research for task ${taskRef.id}...`);
//         const prompt = `Please conduct thorough research on the following topic and provide a detailed, well-structured summary. Include key points, relevant data, and a concluding paragraph. Topic: "${topic}"`;

//         const result = await model.generateContent(prompt);
//         const researchSummary = result.response.text();

//         await taskRef.update({
//           status: "completed",
//           result: researchSummary,
//           completedAt: admin.firestore.FieldValue.serverTimestamp(),
//         });
//         console.log(
//           `Research task ${taskRef.id} has been completed with real data.`
//         );
//       } catch (aiError) {
//         console.error(`AI research failed for task ${taskRef.id}:`, aiError);
//         await taskRef.update({
//           status: "failed",
//           error: "The AI failed to generate a response.",
//           completedAt: admin.firestore.FieldValue.serverTimestamp(),
//         });
//       }
//     })();
//   } catch (error) {
//     console.error("Error starting research task:", error);
//     res.status(500).json({ error: "Failed to start research task." });
//   }
// });

// // --- Background Task for Stock Monitoring ---
// cron.schedule("*/5 * * * *", async () => {
//   console.log("--- Running Stock Price Check ---");
//   const alertsSnapshot = await db
//     .collection("stock_alerts")
//     .where("status", "==", "active")
//     .get();
//   if (alertsSnapshot.empty) {
//     console.log("No active stock alerts to check.");
//     return;
//   }

//   alertsSnapshot.forEach(async (doc) => {
//     const alert = doc.data();
//     try {
//       const response = await fetch(
//         `https://finnhub.io/api/v1/quote?symbol=${alert.ticker}&token=${process.env.FINNHUB_API_KEY}`
//       );
//       const data = await response.json();
//       const currentPrice = data.c;

//       console.log(
//         `Checking ${alert.ticker}: Current Price = $${currentPrice}, Target = $${alert.targetPrice}`
//       );

//       if (currentPrice >= alert.targetPrice) {
//         await db.collection("notifications").add({
//           type: "stock",
//           message: `📈 STOCK ALERT: ${alert.ticker} has reached your target of $${alert.targetPrice}! Current price is $${currentPrice}.`,
//           timestamp: admin.firestore.FieldValue.serverTimestamp(),
//           read: false,
//         });

//         await db
//           .collection("stock_alerts")
//           .doc(doc.id)
//           .update({ status: "triggered" });
//         console.log(`!!! Stock alert triggered for ${alert.ticker} !!!`);
//       }
//     } catch (error) {
//       console.error(`Failed to check stock price for ${alert.ticker}:`, error);
//     }
//   });
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
const cron = require("node-cron");
const crypto = require("crypto");
const { YoutubeTranscript } = require("youtube-transcript");
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
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// --- Routes (Organized by Function) ---

// --- Authentication & Status Routes ---
app.get("/api/auth/google", (req, res) => {
  const scopes = [
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/gmail.readonly",
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
  express.raw({ type: "application/json", limit: "5mb" }),
  async (req, res) => {
    const signature = crypto
      .createHmac("sha256", process.env.GITHUB_WEBHOOK_SECRET)
      .update(req.body)
      .digest("hex");
    const trusted = Buffer.from(`sha256=${signature}`, "ascii");
    const untrusted = Buffer.from(
      req.headers["x-hub-signature-256"] || "",
      "ascii"
    );

    if (!crypto.timingSafeEqual(trusted, untrusted)) {
      console.error(
        "Webhook validation failed! Make sure GITHUB_WEBHOOK_SECRET is set."
      );
      return res.status(401).send("Invalid signature");
    }

    const githubEvent = req.headers["x-github-event"];
    const data = JSON.parse(req.body);

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
      } else if (githubEvent === "push") {
        const pusher = data.pusher.name;
        const branch = data.ref.split("/").pop();
        notification.type = "push";
        notification.message = `${pusher} pushed ${data.commits.length} commit(s) to ${branch}`;
        notification.url = data.compare;
        notification.user = pusher;
        await db.collection("notifications").add(notification);
      }
    } catch (error) {
      console.error("Error processing webhook:", error);
    }
    res.status(200).send("Event received");
  }
);

// --- Action Routes ---

// --- Helper functions for Order Scanning ---
function extractTextFromHtml(htmlContent) {
  // Remove script and style tags completely
  let cleanHtml = htmlContent.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ""
  );
  cleanHtml = cleanHtml.replace(
    /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
    ""
  );

  // Replace common HTML entities
  cleanHtml = cleanHtml
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');

  // Extract text from HTML tags while preserving structure
  const textContent = cleanHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return textContent;
}

function extractEmailBody(payload) {
  let emailBody = "";

  try {
    if (payload.parts) {
      // Try text/plain first
      let part = payload.parts.find((p) => p.mimeType === "text/plain");
      if (part && part.body && part.body.data) {
        emailBody = Buffer.from(part.body.data, "base64").toString("utf-8");
      } else {
        // Fall back to text/html
        part = payload.parts.find((p) => p.mimeType === "text/html");
        if (part && part.body && part.body.data) {
          const htmlContent = Buffer.from(part.body.data, "base64").toString(
            "utf-8"
          );
          emailBody = extractTextFromHtml(htmlContent);
        }
      }

      // If no direct parts, check nested parts
      if (!emailBody) {
        for (const part of payload.parts) {
          if (part.parts) {
            for (const subPart of part.parts) {
              if (
                subPart.mimeType === "text/html" &&
                subPart.body &&
                subPart.body.data
              ) {
                const htmlContent = Buffer.from(
                  subPart.body.data,
                  "base64"
                ).toString("utf-8");
                emailBody = extractTextFromHtml(htmlContent);
                break;
              }
            }
          }
          if (emailBody) break;
        }
      }
    } else if (payload.body && payload.body.data) {
      // Simple case - direct body
      const content = Buffer.from(payload.body.data, "base64").toString(
        "utf-8"
      );
      if (payload.mimeType === "text/html") {
        emailBody = extractTextFromHtml(content);
      } else {
        emailBody = content;
      }
    }
  } catch (error) {
    console.error("Error extracting email body:", error);
  }

  return emailBody;
}

// --- Smarter Order Scanning Route ---
app.post("/api/orders/scan-inbox", async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc("main_user").get();
    if (!userDoc.exists || !userDoc.data().google_tokens) {
      return res
        .status(401)
        .json({ error: "User is not authenticated with Google." });
    }
    googleOauth2Client.setCredentials(userDoc.data().google_tokens);
    const gmail = google.gmail({ version: "v1", auth: googleOauth2Client });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const formattedDate = `${thirtyDaysAgo.getFullYear()}/${String(
      thirtyDaysAgo.getMonth() + 1
    ).padStart(2, "0")}/${String(thirtyDaysAgo.getDate()).padStart(2, "0")}`;

    const searchQuery = `from:(amazon.in OR flipkart.com OR myntra.com OR meesho.com OR ajio.com) {"order confirmation" "your order" "order placed"} after:${formattedDate}`;
    console.log("Using Gmail search query:", searchQuery);

    const listResponse = await gmail.users.messages.list({
      userId: "me",
      q: searchQuery,
      maxResults: 15,
    });

    const messages = listResponse.data.messages;
    if (!messages || messages.length === 0) {
      return res.json({
        success: true,
        message: "No new order confirmation emails found in the last 30 days.",
      });
    }

    console.log(`Found ${messages.length} potential order emails.`);

    let ordersFound = 0;
    const processedOrders = [];

    for (const message of messages) {
      const orderData = await processOrderEmail(message, gmail);
      if (orderData) {
        ordersFound++;
        processedOrders.push(orderData);
      }
    }

    console.log(`📊 Processing Summary:`);
    console.log(`   Messages processed: ${messages.length}`);
    console.log(`   Orders found: ${ordersFound}`);
    processedOrders.forEach((order) => {
      console.log(
        `   - ${order.orderId}: ${order.itemName} (ETA: ${order.eta})`
      );
    });

    res.json({
      success: true,
      message: `Scan complete. Found and saved ${ordersFound} orders.`,
      ordersFound,
    });
  } catch (error) {
    console.error("Error scanning inbox for orders:", error);
    res.status(500).json({ error: "Failed to scan inbox for orders." });
  }
});

async function processOrderEmail(message, gmail) {
  const prompt = `
You are an expert email parser specializing in Indian e-commerce order confirmations. 
Analyze the following email content (which may contain HTML) and extract order details.

EXTRACTION RULES:
1. ITEM NAME - Look for the main product being ordered:
   - In HTML: Check <a> tags, <strong>, <b>, <h1>, <h2>, <td> containing product links
   - Look for patterns: "SNITCH", "Nike", brand names followed by product descriptions
   - Common indicators: product titles, "You ordered:", main item descriptions
   - Ignore: "Free delivery", "Cashback", "Offer", promotional text
   - Extract the FULL product name including brand and description

2. ORDER ID - Find the order reference:
   - Patterns: "Order #", "Order ID:", "Order No:", "Order Number:", "Reference:", "Ref No:"
   - Look for alphanumeric codes (usually 10-15 characters)
   - Common formats: FN1234567890, AMZ123456789, MYN987654321

3. ETA (Delivery Date) - Find estimated delivery:
   - Patterns: "Delivery by", "Arriving", "Expected delivery", "Estimated delivery"
   - "Delivery date:", "Arrival date:", "Expected by", "Delivered by"
   - Look for dates in formats: "Tue, 29 Jul, 2025", "July 29, 2025", "29-07-2025"

PARSING STRATEGY:
- Clean HTML tags but preserve text content
- Look for table structures containing product info
- Check for order summary sections
- Scan for delivery information blocks

RESPONSE FORMAT:
Return ONLY a valid JSON object with exactly these fields:
{
  "itemName": "Full product name with brand",
  "orderId": "Order reference number",
  "trackingNumber": "N/A",
  "eta": "Formatted delivery date"
}

IMPORTANT:
- If you cannot find a value after thorough analysis, use "N/A"
- Always use "N/A" for trackingNumber
- Be thorough - check the entire email content
- Extract the most prominent/main product name, not accessories

EMAIL CONTENT TO ANALYZE:
"""
${"EMAIL_BODY_PLACEHOLDER"}
"""

JSON Response:
`;
  try {
    const msgResponse = await gmail.users.messages.get({
      userId: "me",
      id: message.id,
      format: "full",
    });

    const payload = msgResponse.data.payload;
    const fromHeader =
      payload.headers.find((h) => h.name.toLowerCase() === "from")?.value ||
      "Unknown Sender";

    const emailBody = extractEmailBody(payload);

    if (!emailBody || emailBody.length < 100) {
      console.log(`Skipping message ${message.id} - insufficient content`);
      return null;
    }

    console.log(`Processing message ${message.id} from ${fromHeader}`);
    console.log(`Email body length: ${emailBody.length}`);

    // Log a sample of the email content for debugging
    // console.log(`Sample content: ${emailBody.substring(0, 500)}...`);

    const fullPrompt = prompt.replace(
      "EMAIL_BODY_PLACEHOLDER",
      emailBody.substring(0, 15000)
    );

    const aiResult = await model.generateContent(fullPrompt);
    const jsonString = aiResult.response
      .text()
      .replace(/```json\n?|```\n?/g, "")
      .trim();

    console.log(`AI Response for ${message.id}:`, jsonString);

    try {
      const orderData = JSON.parse(jsonString);

      // Validate extracted data
      if (!orderData.orderId || orderData.orderId === "N/A") {
        console.log(`No valid order ID found for message ${message.id}`);
        return null;
      }

      // Save to Firestore
      await db
        .collection("orders")
        .doc(orderData.orderId)
        .set(
          {
            ...orderData,
            source: fromHeader,
            scannedAt: admin.firestore.FieldValue.serverTimestamp(),
            messageId: message.id,
          },
          { merge: true }
        );

      console.log(`✅ Successfully saved order: ${orderData.orderId}`);
      console.log(`   Item: ${orderData.itemName}`);
      console.log(`   ETA: ${orderData.eta}`);

      return orderData;
    } catch (parseError) {
      console.error(
        `Failed to parse AI response for ${message.id}:`,
        parseError
      );
      console.error(`Raw AI response:`, jsonString);
      return null;
    }
  } catch (error) {
    console.error(`Error processing message ${message.id}:`, error);
    return null;
  }
}

// --- Get Orders List Route ---
app.get("/api/orders/list", async (req, res) => {
  try {
    const ordersSnapshot = await db
      .collection("orders")
      .orderBy("scannedAt", "desc")
      .limit(50) // Limit to most recent 50 orders
      .get();

    const orders = [];
    ordersSnapshot.forEach((doc) => {
      const orderData = doc.data();
      orders.push({
        id: doc.id,
        orderId: orderData.orderId,
        itemName: orderData.itemName || "N/A",
        eta: orderData.eta || "N/A",
        trackingNumber: orderData.trackingNumber || "N/A",
        carrier: orderData.carrier || null,
        status: orderData.status || "Pending",
        source: orderData.source || null,
        aftershipTrackingId: orderData.aftershipTrackingId || null,
        scannedAt: orderData.scannedAt,
      });
    });

    res.json({
      success: true,
      orders: orders,
      count: orders.length,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      error: "Failed to fetch orders.",
      orders: [],
    });
  }
});

// --- Get Order Details Route ---
app.get("/api/orders/:orderId", async (req, res) => {
  const { orderId } = req.params;

  try {
    const orderDoc = await db.collection("orders").doc(orderId).get();

    if (!orderDoc.exists) {
      return res.status(404).json({ error: "Order not found" });
    }

    const orderData = orderDoc.data();

    // If there's tracking info, fetch latest status from AfterShip
    if (orderData.aftershipTrackingId) {
      try {
        const trackingResponse = await fetch(
          `https://api.aftership.com/v4/trackings/${orderData.aftershipTrackingId}`,
          {
            headers: { "as-api-key": process.env.AFTERSHIP_API_KEY },
          }
        );

        if (trackingResponse.ok) {
          const trackingData = await trackingResponse.json();
          const tracking = trackingData.data.tracking;

          // Update order with latest tracking info
          await db.collection("orders").doc(orderId).update({
            status: tracking.tag,
            lastChecked: admin.firestore.FieldValue.serverTimestamp(),
          });

          orderData.status = tracking.tag;
          orderData.trackingEvents = tracking.checkpoints || [];
        }
      } catch (trackingError) {
        console.error("Error fetching tracking info:", trackingError);
      }
    }

    res.json({
      success: true,
      order: {
        ...orderData,
        id: orderDoc.id,
      },
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ error: "Failed to fetch order details" });
  }
});

// --- Add Parcel Tracking Route ---
app.post("/api/orders/add-tracking", async (req, res) => {
  const { orderId, trackingNumber } = req.body;
  if (!orderId || !trackingNumber) {
    return res
      .status(400)
      .json({ error: "Order ID and Tracking Number are required." });
  }

  try {
    const prompt = `Based on the tracking number "${trackingNumber}", what is the most likely shipping carrier slug? Examples: delhivery, bluedart, ekart, ecom. Respond with only the carrier slug.`;
    const aiResult = await model.generateContent(prompt);
    const carrierSlug = aiResult.response.text().trim().toLowerCase();

    const aftershipResponse = await fetch(
      "https://api.aftership.com/v4/trackings",
      {
        method: "POST",
        headers: {
          "as-api-key": process.env.AFTERSHIP_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tracking: {
            tracking_number: trackingNumber,
            slug: carrierSlug,
          },
        }),
      }
    );

    const aftershipData = await aftershipResponse.json();
    if (!aftershipResponse.ok) {
      throw new Error(
        aftershipData.meta.message ||
          "Failed to register tracking with AfterShip."
      );
    }

    const aftershipTrackingId = aftershipData.data.tracking.id;
    await db.collection("orders").doc(orderId).update({
      aftershipTrackingId: aftershipTrackingId,
      carrier: carrierSlug,
      status: aftershipData.data.tracking.tag,
      trackingNumber: trackingNumber, // Save the tracking number itself
    });

    res.json({
      success: true,
      message: `Tracking started for order ${orderId}.`,
    });
  } catch (error) {
    console.error("Error adding tracking:", error);
    res.status(500).json({ error: "Failed to add tracking." });
  }
});

// --- Bulk Update Order Statuses Route ---
app.post("/api/orders/bulk-update", async (req, res) => {
  try {
    const ordersSnapshot = await db
      .collection("orders")
      .where("aftershipTrackingId", "!=", null)
      .get();

    let updatedCount = 0;
    const batch = db.batch();

    for (const doc of ordersSnapshot.docs) {
      const order = doc.data();

      if (order.status === "Delivered") continue;

      try {
        const response = await fetch(
          `https://api.aftership.com/v4/trackings/${order.aftershipTrackingId}`,
          {
            headers: { "as-api-key": process.env.AFTERSHIP_API_KEY },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const newStatus = data.data.tracking.tag;

          if (newStatus !== order.status) {
            batch.update(doc.ref, {
              status: newStatus,
              lastChecked: admin.firestore.FieldValue.serverTimestamp(),
            });
            updatedCount++;
          }
        }
      } catch (error) {
        console.error(`Failed to check tracking for order ${doc.id}:`, error);
      }
    }

    await batch.commit();

    res.json({
      success: true,
      message: `Updated ${updatedCount} orders`,
      updatedCount,
    });
  } catch (error) {
    console.error("Error in bulk update:", error);
    res.status(500).json({ error: "Failed to update orders" });
  }
});

// --- Snippet Saver Route ---
app.post("/api/snippets/save", async (req, res) => {
  const { snippetText, sourceUrl } = req.body;
  if (!snippetText || !sourceUrl) {
    return res
      .status(400)
      .json({ error: "Snippet text and source URL are required." });
  }

  try {
    await db.collection("snippets").add({
      text: snippetText,
      url: sourceUrl,
      savedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true, message: "Snippet saved successfully!" });
  } catch (error) {
    console.error("Error saving snippet:", error);
    res.status(500).json({ error: "Failed to save snippet." });
  }
});

// --- Stock Alert Route ---
app.post("/api/stocks/add-alert", async (req, res) => {
  const { ticker, targetPrice } = req.body;
  if (!ticker || !targetPrice) {
    return res
      .status(400)
      .json({ error: "Ticker and target price are required." });
  }

  try {
    await db.collection("stock_alerts").add({
      ticker: ticker.toUpperCase(),
      targetPrice: Number(targetPrice),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "active",
    });
    res.json({
      success: true,
      message: `Alert set for ${ticker.toUpperCase()} at $${targetPrice}.`,
    });
  } catch (error) {
    console.error("Error saving stock alert:", error);
    res.status(500).json({ error: "Failed to save stock alert." });
  }
});

// --- AI Content Composer Route ---
app.post("/api/ai/compose", async (req, res) => {
  const { pageContent, userRequest } = req.body;
  if (!pageContent || !userRequest) {
    return res
      .status(400)
      .json({ error: "Page content and a user request are required." });
  }

  try {
    const prompt = `You are an AI assistant. Based on the following Page Content, fulfill the user's Request.\n\nPage Content:\n---\n${pageContent.substring(
      0,
      8000
    )}\n---\n\nRequest: "${userRequest}"\n\nGenerated Content:`;
    const result = await model.generateContent(prompt);
    const composedText = result.response.text();
    res.json({ success: true, composedText: composedText });
  } catch (error) {
    console.error("Error in AI composer:", error);
    res.status(500).json({ error: "Failed to generate content." });
  }
});

app.post("/api/logout", async (req, res) => {
  try {
    const userRef = db.collection("users").doc("main_user");
    await userRef.update({
      google_tokens: admin.firestore.FieldValue.delete(),
      github_access_token: admin.firestore.FieldValue.delete(),
    });
    res.json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    res.status(500).json({ error: "Logout failed on the server." });
  }
});

app.post("/api/summarize", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text)
      return res.status(400).json({ error: "Text content is required." });
    const prompt = `Summarize the following text:\n\n${text}`;
    const result = await model.generateContent(prompt);
    res.json({ summary: result.response.text() });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate summary." });
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
    googleOauth2Client.setCredentials(userDoc.data().google_tokens);
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
    res.status(500).json({ error: "Failed to create draft." });
  }
});

app.post("/api/github/pr/review", async (req, res) => {
  const { prUrl } = req.body;
  if (!prUrl) {
    return res.status(400).json({ error: "Pull Request URL is required." });
  }
  try {
    const userDoc = await db.collection("users").doc("main_user").get();
    if (!userDoc.exists || !userDoc.data().github_access_token) {
      return res.status(401).json({ error: "GitHub token not found." });
    }
    const accessToken = userDoc.data().github_access_token;
    const apiUrl = prUrl
      .replace("github.com", "api.github.com/repos")
      .replace("/pull/", "/pulls/");
    const diffResponse = await fetch(apiUrl, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3.diff",
      },
    });
    if (!diffResponse.ok)
      throw new Error(`Failed to fetch PR diff: ${diffResponse.statusText}`);
    const diffText = await diffResponse.text();
    const prompt = `You are an expert code reviewer. Please review the following code changes (in .diff format) and provide a concise summary of potential issues, bugs, or style improvements. Format your response in Markdown.\n\nDiff:\n${diffText}`;
    const result = await model.generateContent(prompt);
    res.json({ review: result.response.text() });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate PR review." });
  }
});

app.post("/api/notion/create", async (req, res) => {
  const { pageContent } = req.body;
  if (!pageContent) {
    return res.status(400).json({ error: "Page content is required." });
  }
  try {
    const prompt = `Generate a suitable title and a plain text summary for a Notion document based on the following content. Format the output as a JSON object with "title" and "content" keys. The content should be a single string. Text: "${pageContent.substring(
      0,
      4000
    )}"`;

    const aiResult = await model.generateContent(prompt);
    const jsonString = aiResult.response
      .text()
      .replace(/```json\n|```/g, "")
      .trim();
    const { title, content } = JSON.parse(jsonString);

    await notion.pages.create({
      parent: { page_id: notionParentPageId },
      properties: {
        title: [{ text: { content: title } }],
      },
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: content } }],
          },
        },
      ],
    });
    res.json({
      success: true,
      message: "Notion document created successfully!",
    });
  } catch (error) {
    console.error("Error creating Notion document:", error);
    res.status(500).json({ error: "Failed to create Notion document." });
  }
});

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

    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: now.toISOString(),
        timeMax: sevenDaysFromNow.toISOString(),
        items: [{ id: "primary" }],
      },
    });

    const busyTimes = response.data.calendars.primary.busy;
    res.json({ busyTimes });
  } catch (error) {
    console.error("Error fetching free/busy times:", error);
    res.status(500).json({ error: "Failed to find meeting times." });
  }
});

app.post("/api/research/start", async (req, res) => {
  const { topic } = req.body;
  if (!topic) {
    return res.status(400).json({ error: "Research topic is required." });
  }

  try {
    const taskRef = await db.collection("research_tasks").add({
      topic: topic,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`New research task created with ID: ${taskRef.id}`);
    res.json({ success: true, message: `Research on "${topic}" has started.` });

    (async () => {
      try {
        console.log(`Performing AI research for task ${taskRef.id}...`);
        const prompt = `Please conduct thorough research on the following topic and provide a detailed, well-structured summary. Include key points, relevant data, and a concluding paragraph. Topic: "${topic}"`;

        const result = await model.generateContent(prompt);
        const researchSummary = result.response.text();

        await taskRef.update({
          status: "completed",
          result: researchSummary,
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(
          `Research task ${taskRef.id} has been completed with real data.`
        );
      } catch (aiError) {
        console.error(`AI research failed for task ${taskRef.id}:`, aiError);
        await taskRef.update({
          status: "failed",
          error: "The AI failed to generate a response.",
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    })();
  } catch (error) {
    console.error("Error starting research task:", error);
    res.status(500).json({ error: "Failed to start research task." });
  }
});

// --- Background Task for Stock Monitoring ---
cron.schedule("*/5 * * * *", async () => {
  console.log("--- Running Stock Price Check ---");
  try {
    const alertsSnapshot = await db
      .collection("stock_alerts")
      .where("status", "==", "active")
      .get();

    if (alertsSnapshot.empty) {
      return;
    }

    for (const doc of alertsSnapshot.docs) {
      const alert = doc.data();
      try {
        const response = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${alert.ticker}&token=${process.env.FINNHUB_API_KEY}`
        );
        const data = await response.json();
        const currentPrice = data.c;

        if (currentPrice) {
          console.log(
            `Checking ${alert.ticker}: Current Price = $${currentPrice}, Target = $${alert.targetPrice}`
          );

          if (currentPrice >= alert.targetPrice) {
            await db.collection("notifications").add({
              type: "stock",
              message: `📈 STOCK ALERT: ${alert.ticker} has reached your target of $${alert.targetPrice}! Current price is $${currentPrice}.`,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              read: false,
            });

            await db
              .collection("stock_alerts")
              .doc(doc.id)
              .update({ status: "triggered" });
            console.log(`!!! Stock alert triggered for ${alert.ticker} !!!`);
          }
        }
      } catch (error) {
        console.error(
          `Failed to check stock price for ${alert.ticker}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("Error in Stock Price cron job:", error.message);
  }
});

// --- Background Task for Parcel Tracking ---
cron.schedule("*/10 * * * *", async () => {
  console.log("--- Running Parcel Tracking Check ---");
  try {
    const ordersSnapshot = await db
      .collection("orders")
      .where("aftershipTrackingId", "!=", null)
      .get();

    if (ordersSnapshot.empty) {
      return;
    }

    for (const doc of ordersSnapshot.docs) {
      const order = doc.data();

      if (order.status === "Delivered") {
        continue;
      }

      try {
        const response = await fetch(
          `https://api.aftership.com/v4/trackings/${order.aftershipTrackingId}`,
          {
            headers: { "as-api-key": process.env.AFTERSHIP_API_KEY },
          }
        );
        const data = await response.json();

        if (data && data.data && data.data.tracking) {
          const newStatus = data.data.tracking.tag;

          console.log(
            `Checking order ${doc.id}: Current Status = ${order.status}, New Status = ${newStatus}`
          );

          if (newStatus !== order.status) {
            await db.collection("notifications").add({
              type: "order",
              message: `📦 Order Update: Your order for "${
                order.itemName || "item"
              }" is now ${newStatus}.`,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              read: false,
            });

            await db
              .collection("orders")
              .doc(doc.id)
              .update({ status: newStatus });
            console.log(`!!! Order status updated for ${doc.id} !!!`);
          }
        }
      } catch (error) {
        console.error(`Failed to check tracking for order ${doc.id}:`, error);
      }
    }
  } catch (error) {
    console.error("Error in Parcel Tracking cron job:", error.message);
  }
});

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
