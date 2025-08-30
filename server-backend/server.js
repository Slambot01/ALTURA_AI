const BACKEND_BASE_URL =
  process.env.BACKEND_BASE_URL || "http://localhost:3001";
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
const PDFDocument = require("pdfkit");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const analyzeRouter = require("./src/api/routes/analyze");
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
  `${BACKEND_BASE_URL}/api/auth/google/callback`
);

// --- Notion Client Initialization ---
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const notionParentPageId = process.env.NOTION_PARENT_PAGE_ID;

// --- Basic Server Setup ---
const app = express();
const PORT = process.env.PORT || 3001;
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "https://alturaai-psi.vercel.app",
    "chrome-extension://<YOUR_EDGE_STORE_ID_HERE>",
    "moz-extension://<YOUR_FIREFOX_STORE_ID_HERE>",
  ],
  credentials: true,
};
app.use(cors(corsOptions));

app.use(express.static("public"));
// Helper function to create a JWT for app authentication
function generateJwt() {
  const privateKey = fs.readFileSync(process.env.GITHUB_APP_PRIVATE_KEY_PATH);
  const payload = {
    iat: Math.floor(Date.now() / 1000) - 60, // Issued at time (60 seconds in the past)
    exp: Math.floor(Date.now() / 1000) + 10 * 60, // Expiration time (10 minutes from now)
    iss: process.env.GITHUB_APP_ID, // Issuer: your App ID
  };
  return jwt.sign(payload, privateKey, { algorithm: "RS256" });
}
// Enhanced authentication middleware that supports both Firebase ID tokens and Google OAuth access tokens

const verifyAuthToken = async (req, res, next) => {
  try {
    // Check for Authorization header
    if (
      !req.headers.authorization ||
      !req.headers.authorization.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        error: "Unauthorized: No token provided",
        code: "NO_TOKEN",
        action: "REFRESH_TOKEN",
      });
    }

    const token = req.headers.authorization.split("Bearer ")[1];

    if (!token) {
      return res.status(401).json({
        error: "Unauthorized: Invalid token format",
        code: "INVALID_TOKEN_FORMAT",
        action: "REFRESH_TOKEN",
      });
    }

    console.log("🔐 Verifying token...");

    // Try to determine token type and validate accordingly
    let decodedToken = null;
    let tokenType = null;

    // First, try Firebase ID token validation
    try {
      decodedToken = await admin.auth().verifyIdToken(token, true);
      tokenType = "firebase";
      console.log(`✅ Firebase token verified for user: ${decodedToken.uid}`);
    } catch (firebaseError) {
      console.log("🔄 Firebase validation failed, trying Google OAuth...");

      // If Firebase fails, try Google OAuth access token validation
      try {
        const googleTokenInfo = await validateGoogleOAuthToken(token);

        // Convert Google token info to Firebase-like format
        decodedToken = {
          uid: googleTokenInfo.sub, // Google's subject ID
          email: googleTokenInfo.email,
          name: googleTokenInfo.name,
          picture: googleTokenInfo.picture,
          email_verified: googleTokenInfo.email_verified === "true",
          // Add custom claims to identify this as Google OAuth
          token_type: "google_oauth",
        };
        tokenType = "google_oauth";
        console.log(
          `✅ Google OAuth token verified for user: ${decodedToken.email}`
        );

        // For Google OAuth tokens, ensure user exists in Firestore
        await ensureGoogleOAuthUserExists(decodedToken);
      } catch (googleError) {
        console.error("❌ Both Firebase and Google token validation failed:", {
          firebase: firebaseError.message,
          google: googleError.message,
        });

        return res.status(401).json({
          error: "Invalid or expired token. Please log in again.",
          code: "TOKEN_VALIDATION_FAILED",
          action: "REAUTHENTICATE",
        });
      }
    }

    // Set user info on request object
    req.user = decodedToken;
    req.tokenType = tokenType;

    // Handle Google token refresh for Firebase tokens only
    if (tokenType === "firebase") {
      const userDoc = await db.collection("users").doc(req.user.uid).get();

      if (userDoc.exists && userDoc.data().google_tokens) {
        const tokens = userDoc.data().google_tokens;
        const requestOauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        );
        requestOauth2Client.setCredentials(tokens);

        try {
          const isExpired =
            !tokens.expiry_date || tokens.expiry_date <= Date.now();
          const willExpireSoon =
            tokens.expiry_date &&
            tokens.expiry_date - Date.now() < 5 * 60 * 1000;

          if (
            isExpired ||
            willExpireSoon ||
            requestOauth2Client.isTokenExpiring()
          ) {
            console.log(
              "🔄 Google service token is expired/expiring, attempting to refresh..."
            );

            if (!tokens.refresh_token) {
              console.log(
                "❌ No refresh token available, user needs to re-authenticate"
              );
            } else {
              const { credentials } =
                await requestOauth2Client.refreshAccessToken();

              await db
                .collection("users")
                .doc(req.user.uid)
                .update({
                  google_tokens: {
                    ...credentials,
                    refresh_token:
                      credentials.refresh_token || tokens.refresh_token,
                  },
                  last_token_refresh:
                    admin.firestore.FieldValue.serverTimestamp(),
                });

              console.log(
                "✅ Google service token refreshed and updated in Firestore."
              );
            }
          }
        } catch (refreshError) {
          console.error(
            "❌ Google service token refresh failed:",
            refreshError
          );
          console.log(
            "⚠️  Continuing request without Google service token refresh"
          );
        }
      }
    }

    next();
  } catch (error) {
    console.error("❌ Token verification error:", error);

    let errorResponse = {
      error: "Authentication failed. Please log in again.",
      code: "AUTH_FAILED",
      action: "REFRESH_TOKEN",
    };

    if (error.code === "auth/id-token-expired") {
      errorResponse = {
        error: "Session expired. Please refresh your token.",
        code: "TOKEN_EXPIRED",
        action: "REFRESH_TOKEN",
      };
    } else if (error.code === "auth/id-token-revoked") {
      errorResponse = {
        error: "Session has been revoked. Please log in again.",
        code: "TOKEN_REVOKED",
        action: "REAUTHENTICATE",
      };
    } else if (error.code === "auth/invalid-id-token") {
      errorResponse = {
        error: "Invalid session token. Please refresh your token.",
        code: "INVALID_TOKEN",
        action: "REFRESH_TOKEN",
      };
    }

    if (process.env.NODE_ENV === "development") {
      errorResponse.debug = {
        message: error.message,
        code: error.code,
        stack: error.stack,
      };
    }

    return res.status(401).json(errorResponse);
  }
};

// Helper function to validate Google OAuth access tokens
async function validateGoogleOAuthToken(accessToken) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error(`Google tokeninfo API returned ${response.status}`);
    }

    const tokenInfo = await response.json();

    // AFTER
    // Create a list of all approved Client IDs
    const approvedClientIds = [
      process.env.GOOGLE_CLIENT_ID, // Your "Web application" Client ID
      process.env.GOOGLE_EXTENSION_CLIENT_ID, // Your "Chrome Extension" Client ID
    ];

    // Verify the token's audience is in our approved list
    if (!approvedClientIds.includes(tokenInfo.audience)) {
      throw new Error("Token audience mismatch");
    }
    // Check if token has required scopes
    const requiredScopes = ["email", "profile"];
    const tokenScopes = tokenInfo.scope ? tokenInfo.scope.split(" ") : [];

    const hasRequiredScopes = requiredScopes.some((scope) =>
      tokenScopes.some((tokenScope) => tokenScope.includes(scope))
    );

    if (!hasRequiredScopes) {
      console.log(
        "⚠️  Token doesn't have email/profile scopes, getting user info from userinfo API"
      );

      // Fallback: get user info from userinfo API
      const userinfoResponse = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`
      );

      if (!userinfoResponse.ok) {
        throw new Error("Failed to get user info from Google");
      }

      const userInfo = await userinfoResponse.json();

      return {
        sub: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        email_verified: userInfo.verified_email ? "true" : "false",
      };
    }

    return tokenInfo;
  } catch (error) {
    console.error("Google OAuth token validation failed:", error);
    throw new Error(`Invalid Google OAuth token: ${error.message}`);
  }
}

// Helper function to ensure Google OAuth user exists in Firestore
async function ensureGoogleOAuthUserExists(userInfo) {
  try {
    const userRef = db.collection("users").doc(userInfo.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // Create new user document for Google OAuth users
      await userRef.set(
        {
          email: userInfo.email,
          name: userInfo.name || userInfo.email,
          picture: userInfo.picture,
          email_verified: userInfo.email_verified,
          auth_provider: "google_oauth",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log(
        `✅ Created new user document for Google OAuth user: ${userInfo.uid}`
      );
    } else {
      // Update last login time
      await userRef.update({
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error ensuring Google OAuth user exists:", error);
    // Don't throw - this shouldn't block authentication
  }
}

// Enhanced error handling middleware
const handleAuthError = (error, req, res, next) => {
  console.error("Authentication error:", error);

  // If headers haven't been sent, send error response
  if (!res.headersSent) {
    return res.status(401).json({
      error: "Authentication failed",
      code: "AUTH_ERROR",
    });
  }

  next(error);
};
app.use("/api/analyze", analyzeRouter);
app.post(
  "/api/github/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      // --- Webhook Signature Validation (Keep this for security) ---
      const signature = crypto
        .createHmac("sha256", process.env.GITHUB_APP_WEBHOOK_SECRET)
        .update(req.body)
        .digest("hex");
      const trusted = Buffer.from(`sha256=${signature}`, "ascii");
      const untrusted = Buffer.from(
        req.headers["x-hub-signature-256"] || "",
        "ascii"
      );

      if (!crypto.timingSafeEqual(trusted, untrusted)) {
        console.error("Webhook validation failed! Secrets do not match.");
        return res.status(401).send("Invalid signature");
      }
      // --- End of Validation ---

      const githubEvent = req.headers["x-github-event"];
      const data = JSON.parse(req.body);
      let notification = null;
      let userId = null; // Initialize userId to track which user gets the notification

      // Handle Pull Requests
      if (githubEvent === "pull_request") {
        const pr = data.pull_request;

        // Find user by repository installation (if we have installation context)
        if (data.installation && data.installation.id) {
          const usersSnapshot = await db
            .collection("users")
            .where("github_installation_id", "==", String(data.installation.id))
            .limit(1)
            .get();

          if (!usersSnapshot.empty) {
            userId = usersSnapshot.docs[0].id;
          }
        }

        notification = {
          type: "pr",
          repo: data.repository.full_name,
          message: `PR #${data.number} ${data.action}: "${pr.title}"`,
          url: pr.html_url,
          user: pr.user.login,
          read: false,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };
        // Handle Pushes
      } else if (githubEvent === "push") {
        const pusher = data.pusher.name;
        const branch = data.ref.split("/").pop();

        // Find user by repository installation (if we have installation context)
        if (data.installation && data.installation.id) {
          const usersSnapshot = await db
            .collection("users")
            .where("github_installation_id", "==", String(data.installation.id))
            .limit(1)
            .get();

          if (!usersSnapshot.empty) {
            userId = usersSnapshot.docs[0].id;
          }
        }

        notification = {
          type: "push",
          repo: data.repository.full_name,
          message: `${pusher} pushed ${data.commits.length} commit(s) to ${branch}`,
          url: data.compare,
          user: pusher,
          read: false,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };
        // Handle New App Installations
      } else if (githubEvent === "installation" && data.action === "created") {
        const installationId = data.installation.id;
        console.log(
          `App installed with ID: ${installationId}. Looking for a pending user.`
        );

        // Find the user who was in the process of installing
        const usersSnapshot = await db
          .collection("users")
          .where("github_installation_status", "==", "pending")
          .limit(1)
          .get();

        if (usersSnapshot.empty) {
          console.log(
            `Webhook for installation ID ${installationId} but no pending user found.`
          );
          return res.status(200).send("No pending installation found.");
        }

        const userDoc = usersSnapshot.docs[0];
        userId = userDoc.id; // Set userId for notification saving
        userId = userDoc.id; // Set userId for notification saving

        // Assign the installation ID to this user and remove the pending status
        await userDoc.ref.update({
          github_installation_id: String(installationId),
          github_installation_status: admin.firestore.FieldValue.delete(), // Clean up the placeholder
        });

        console.log(
          `✅ Successfully linked installation ID ${installationId} to user ${userId}.`
        );

        // Now, create the success notification for this user
        notification = {
          type: "installation",
          repo: data.repositories
            ? data.repositories.map((r) => r.full_name).join(", ")
            : "All Repositories",
          message: `🎉 AlturaAI App was successfully installed on '${data.installation.account.login}'!`,
          url: data.installation.html_url,
          user: data.sender.login,
          read: false,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };
      } else if (githubEvent === "installation" && data.action === "deleted") {
        const installationId = data.installation.id;
        console.log(
          `App uninstalled for ID: ${installationId}. Removing from database.`
        );

        // FIX: Find the user by their installationId, not an undefined uid
        const usersSnapshot = await db
          .collection("users")
          .where("github_installation_id", "==", String(installationId)) // Ensure type match
          .limit(1)
          .get();

        if (usersSnapshot.empty) {
          console.log(
            `Uninstallation event for an unknown installation ID: ${installationId}`
          );
          return res
            .status(200)
            .send("Installation not found, nothing to delete.");
        }

        // Get the user's document reference from the query result
        const userDoc = usersSnapshot.docs[0];

        // Atomically remove the installation ID from that user's document
        await userDoc.ref.update({
          github_installation_id: admin.firestore.FieldValue.delete(),
        });

        console.log(
          `✅ Successfully removed installation ID from user ${userDoc.id}.`
        );
        return res.status(200).send("Uninstallation event processed.");
      } else if (githubEvent === "installation_repositories") {
        const installationId = data.installation.id;
        const action = data.action; // "added" or "removed"

        console.log(
          `Repositories ${action} for installation ID: ${installationId}`
        );

        // Find the user associated with this installation
        const usersSnapshot = await db
          .collection("users")
          .where("github_installation_id", "==", String(installationId))
          .limit(1)
          .get();

        if (usersSnapshot.empty) {
          console.log(
            `Installation repositories event for unknown installation ID: ${installationId}`
          );
          return res.status(200).send("Installation not found.");
        }

        const userDoc = usersSnapshot.docs[0];
        const userId = userDoc.id;

        // Create notification for repository changes
        if (action === "added" && data.repositories_added) {
          const addedRepos = data.repositories_added
            .map((repo) => repo.full_name)
            .join(", ");
          notification = {
            type: "repo_added",
            repo: addedRepos,
            message: `📁 New repositories added to AlturaAI: ${addedRepos}`,
            url: data.installation.html_url,
            user: data.sender.login,
            read: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          };
        } else if (action === "removed" && data.repositories_removed) {
          const removedRepos = data.repositories_removed
            .map((repo) => repo.full_name)
            .join(", ");
          notification = {
            type: "repo_removed",
            repo: removedRepos,
            message: `📁 Repositories removed from AlturaAI: ${removedRepos}`,
            url: data.installation.html_url,
            user: data.sender.login,
            read: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          };
        }
      } else {
        console.log(`Received unhandled or ignored event type: ${githubEvent}`);
        return res.status(200).send("Event acknowledged but not processed.");
      }

      // If a notification object was created, save it to Firestore
      if (notification && userId) {
        console.log(
          `Attempting to save notification to Firestore for user: ${userId}...`
        );
        await db
          .collection("users")
          .doc(userId)
          .collection("notifications")
          .add(notification);
        console.log("✅ Successfully saved notification to Firestore.");
      } else if (notification && !userId) {
        console.log(
          "⚠️  Notification created but no userId found - skipping Firestore save"
        );
      }

      res.status(200).send("Event successfully processed.");
    } catch (error) {
      console.error("--- FATAL WEBHOOK ERROR ---", error);
      res.status(500).send("Internal Server Error occurred.");
    }
  }
);
// This line should come after your route definitions
app.use(express.json({ limit: "5mb" }));
// NEW: Callback that GitHub hits after a user installs the app
app.get("/api/github/app/callback", async (req, res) => {
  const { installation_id, setup_action } = req.query;
  const { uid } = req.user; // FIX: Get the user ID from the request

  console.log("=== GITHUB APP CALLBACK ===");
  console.log("User ID:", uid);
  console.log("Installation ID:", installation_id);

  try {
    if (installation_id) {
      // This will now work correctly
      const userRef = db.collection("users").doc(uid);
      await userRef.set(
        {
          github_installation_id: installation_id,
          installation_setup_action: setup_action || "installed",
          installation_date: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log(
        `✅ GitHub App installed for user ${uid} with ID: ${installation_id}`
      );

      // Optional: Test the installation immediately
      await testInstallation(installation_id);

      res.redirect("/auth-success.html?provider=github-app");
    } else {
      console.log("❌ No installation_id received");
      res.status(400).send("No installation ID received");
    }
  } catch (error) {
    console.error("GitHub callback error:", error);
    res.status(500).send("Installation failed");
  }
});
async function testInstallation(installationId) {
  try {
    const appJwt = generateJwt();
    const tokenResponse = await fetch(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${appJwt}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      console.log("✅ Installation token generated successfully");

      // Get installation details
      const installResponse = await fetch(
        `https://api.github.com/app/installations/${installationId}`,
        {
          headers: {
            Authorization: `Bearer ${appJwt}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (installResponse.ok) {
        const installData = await installResponse.json();
        console.log("Installation details:", {
          account: installData.account.login,
          repositories: installData.repository_selection,
          permissions: installData.permissions,
        });
      }
    } else {
      console.log("❌ Failed to generate installation token");
    }
  } catch (error) {
    console.error("Installation test failed:", error);
  }
}

// Updated sign-in endpoint that handles both Firebase and Google OAuth tokens

app.post("/api/auth/signin", verifyAuthToken, async (req, res) => {
  const { uid, email, name, picture, email_verified } = req.user;
  const tokenType = req.tokenType;

  try {
    const userRef = db.collection("users").doc(uid);
    const existingUser = await userRef.get();

    const userData = {
      email,
      name: name || email, // Use email as name if name is not available
      ...(picture && { picture }), // Only add picture if it exists
      email_verified: email_verified || false,
      auth_provider: tokenType === "google_oauth" ? "google_oauth" : "firebase",
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (!existingUser.exists) {
      // New user
      userData.createdAt = admin.firestore.FieldValue.serverTimestamp();
      await userRef.set(userData, { merge: true });

      console.log(`✅ New user created via ${tokenType}: ${uid}`);

      res.json({
        success: true,
        message: `Welcome! User ${uid} created successfully.`,
        isNewUser: true,
        tokenType,
      });
    } else {
      // Existing user - update login info
      await userRef.set(userData, { merge: true });

      console.log(`✅ Existing user signed in via ${tokenType}: ${uid}`);

      res.json({
        success: true,
        message: `Welcome back! User ${uid} signed in successfully.`,
        isNewUser: false,
        tokenType,
      });
    }
  } catch (error) {
    console.error("Error processing sign-in:", error);
    res.status(500).json({
      error: "Failed to process sign-in.",
      tokenType,
    });
  }
});

// Optional: Add a new endpoint specifically for Chrome extension authentication
app.post("/api/auth/chrome-signin", verifyAuthToken, async (req, res) => {
  const { uid, email, name, picture } = req.user;

  // This endpoint assumes Google OAuth token (from Chrome extension)
  if (req.tokenType !== "google_oauth") {
    return res.status(400).json({
      error:
        "This endpoint is only for Chrome extension Google OAuth authentication",
    });
  }

  try {
    const userRef = db.collection("users").doc(uid);
    await userRef.set(
      {
        email,
        name: name || email,
        picture,
        auth_provider: "chrome_extension",
        chrome_extension_auth: true,
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    res.json({
      success: true,
      message: `Chrome extension authentication successful for ${email}`,
      user: { uid, email, name },
    });
  } catch (error) {
    console.error("Chrome extension sign-in error:", error);
    res.status(500).json({ error: "Chrome extension authentication failed" });
  }
});

app.get("/api/github/install", verifyAuthToken, async (req, res) => {
  const { uid } = req.user;
  const installUrl = `https://github.com/apps/alturaai-copilot/installations/new`;

  try {
    // Save a placeholder to indicate this user is currently installing the app
    const userRef = db.collection("users").doc(uid);
    await userRef.set(
      { github_installation_status: "pending" },
      { merge: true }
    );

    res.json({ url: installUrl });
  } catch (error) {
    console.error("Error setting pending installation status:", error);
    res.status(500).json({ error: "Failed to start installation process." });
  }
});
console.log(
  "Server is configured with this Redirect URI:",
  `${BACKEND_BASE_URL}/api/auth/google/callback`
);
// This new endpoint generates the Google Auth URL
app.get("/api/auth/google", verifyAuthToken, (req, res) => {
  const { uid } = req.user;
  const url = googleOauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",

      "https://www.googleapis.com/auth/calendar.events.readonly",
    ],
    prompt: "consent", // This forces a new consent screen
    state: uid,
  });
  res.json({ url });
});

app.get("/api/auth/google/callback", verifyAuthToken, async (req, res) => {
  // <-- verifyAuthToken is REMOVED
  const { code, state } = req.query; // Get the code and the state from the URL
  const uid = state; // The state is the user ID we passed

  if (!uid) {
    return res
      .status(400)
      .send("Authentication failed: User ID not found in state.");
  }

  if (!code) {
    return res
      .status(400)
      .send("Authentication failed: Google code not found in URL.");
  }

  try {
    const { tokens } = await googleOauth2Client.getToken(code);
    const userRef = db.collection("users").doc(uid); // Use the UID from the state

    await userRef.set(
      {
        google_tokens: tokens,
        google_auth_status: "active",
      },
      { merge: true }
    );

    console.log(`Google Auth successful for user ${uid}, tokens stored.`);

    // Redirect to a simple success page
    res.redirect("/auth-success.html?provider=google");
  } catch (error) {
    console.error("Error authenticating with Google callback:", error);
    res.status(500).send("Authentication failed. Please try again.");
  }
});
app.get("/api/auth/github", verifyAuthToken, (req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo`;
  res.json({ url });
});
app.get("/api/github/oauth/callback", verifyAuthToken, async (req, res) => {
  const { code } = req.query;
  const { uid } = req.user; // FIX: Get the user ID from the request

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

    // This will now work correctly
    const userRef = db.collection("users").doc(uid);
    await userRef.set({ github_access_token: accessToken }, { merge: true });

    console.log(`GitHub OAuth successful for user ${uid}, token stored.`);
    res.redirect("/auth-success.html?provider=github");
  } catch (error) {
    console.error("Error authenticating with GitHub:", error);
    res.status(500).send("GitHub Authentication failed.");
  }
});
// Updated /api/auth/status endpoint that handles both Firebase and Google OAuth tokens

app.get("/api/auth/status", verifyAuthToken, async (req, res) => {
  const { uid } = req.user;
  const tokenType = req.tokenType;

  try {
    console.log(`Auth status check for user ${uid}, tokenType: ${tokenType}`);

    const userDoc = await db.collection("users").doc(uid).get();
    const data = userDoc.exists ? userDoc.data() : {};

    // Check token expiration times with null safety
    const tokenInfo = {};

    if (data && data.google_tokens) {
      const tokens = data.google_tokens;
      if (tokens.expiry_date) {
        tokenInfo.googleTokenExpiry = new Date(
          tokens.expiry_date
        ).toISOString();
        tokenInfo.googleTokenValid = tokens.expiry_date > Date.now();
      }
    }

    // Safe timestamp conversion helper
    const safeTimestampToISO = (timestamp) => {
      try {
        if (timestamp && timestamp.toDate) {
          return timestamp.toDate().toISOString();
        }
        if (timestamp && timestamp.seconds) {
          return new Date(timestamp.seconds * 1000).toISOString();
        }
        return null;
      } catch (error) {
        console.error("Timestamp conversion error:", error);
        return null;
      }
    };

    // Enhanced response with null safety
    const response = {
      success: true,
      user: {
        uid: uid,
        email: req.user.email || data?.email || null,
        name: req.user.name || data?.name || null,
        picture: req.user.picture || data?.picture || null,
        email_verified:
          req.user.email_verified || data?.email_verified || false,
      },
      authentication: {
        tokenType: tokenType || "unknown",
        provider:
          data?.auth_provider ||
          (tokenType === "google_oauth" ? "google_oauth" : "firebase"),
      },
      connections: {
        isGoogleLoggedIn: !!(data && data.google_tokens),
        isGithubLoggedIn: !!(data && data.github_access_token),
        isNotionConnected: !!data?.notion_credentials,
        isGithubAppInstalled: !!data?.github_installation_id,
      },
      tokenInfo: tokenInfo,
      lastTokenRefresh: safeTimestampToISO(data?.last_token_refresh),
      lastLoginAt: safeTimestampToISO(data?.lastLoginAt),
      timestamp: new Date().toISOString(),
    };

    // Add additional info for Google OAuth users
    if (tokenType === "google_oauth") {
      response.authentication.note =
        "Authenticated via Chrome Extension with Google OAuth";
    }

    console.log(`Auth status check successful for user ${uid}`);
    res.json(response);
  } catch (error) {
    // CRUCIAL: Log the actual error for debugging
    console.error("Auth status check error for user", uid, ":", error);
    console.error("Error stack:", error.stack);

    res.status(500).json({
      error: "Failed to check auth status.",
      code: "STATUS_CHECK_FAILED",
      // Include error details in development
      ...(process.env.NODE_ENV === "development" && {
        debug: {
          message: error.message,
          stack: error.stack,
        },
      }),
    });
  }
});
// --- Notion OAuth Routes ---

// 1. Route to start the Notion connection process
app.get("/api/auth/notion", verifyAuthToken, (req, res) => {
  const { uid } = req.user;
  const redirectUri = encodeURIComponent(
    `${BACKEND_BASE_URL}/api/auth/notion/callback`
  );
  const authUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${process.env.NOTION_OAUTH_CLIENT_ID}&response_type=code&owner=user&redirect_uri=${redirectUri}&state=${uid}`;
  res.json({ url: authUrl });
});

// 2. Callback route that Notion redirects to after user approval
app.get("/api/auth/notion/callback", async (req, res) => {
  const { code, state } = req.query;
  const uid = state;
  if (!code || !uid) {
    return res.status(400).send("Error: Missing code or state.");
  }
  try {
    const tokenResponse = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.NOTION_OAUTH_CLIENT_ID}:${process.env.NOTION_OAUTH_CLIENT_SECRET}`
          ).toString("base64"),
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: code,
        // FIX: Pass the correct redirect_uri from environment variables
        redirect_uri: `http://localhost:3001/api/auth/notion/callback`,
      }),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(
        tokenData.error_description || "Notion token exchange failed"
      );
    }
    await db
      .collection("users")
      .doc(uid)
      .set({ notion_credentials: tokenData }, { merge: true });
    console.log(`✅ Notion OAuth successful for user ${uid}.`);
    res.redirect("/auth-success.html?provider=notion");
  } catch (error) {
    console.error("Error authenticating with Notion:", error);
    res.status(500).send("Notion authentication failed.");
  }
});
// --- Notification Routes ---
app.get("/api/notifications", verifyAuthToken, async (req, res) => {
  const { uid } = req.user;
  try {
    const notificationsSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("notifications")
      .orderBy("timestamp", "desc")
      .limit(20)
      .get();

    const notifications = notificationsSnapshot.docs.map((doc) => {
      const data = doc.data();

      // Convert Firestore timestamp to JavaScript Date
      let formattedTimestamp = null;
      if (data.timestamp) {
        if (data.timestamp.toDate) {
          // It's a Firestore timestamp object
          formattedTimestamp = data.timestamp.toDate().toISOString();
        } else if (data.timestamp.seconds) {
          // It's a serialized Firestore timestamp
          formattedTimestamp = new Date(
            data.timestamp.seconds * 1000
          ).toISOString();
        } else {
          // It's already a regular date
          formattedTimestamp = new Date(data.timestamp).toISOString();
        }
      } else {
        // Fallback to current time if no timestamp
        formattedTimestamp = new Date().toISOString();
      }

      return {
        id: doc.id,
        ...data,
        timestamp: formattedTimestamp, // Send as ISO string
      };
    });

    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications." });
  }
});
// debug session
app.get("/api/debug/installation", verifyAuthToken, async (req, res) => {
  const { uid } = req.user;
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    const data = userDoc.data();

    console.log("=== INSTALLATION DEBUG ===");
    console.log("User document exists:", userDoc.exists);
    console.log("GitHub installation ID:", data?.github_installation_id);
    console.log("Google tokens:", !!data?.google_tokens);
    console.log("GitHub access token:", !!data?.github_access_token);
    console.log("Full user data:", data);

    res.json({
      userExists: userDoc.exists,
      installationId: data?.github_installation_id,
      hasGoogleTokens: !!data?.google_tokens,
      hasGithubToken: !!data?.github_access_token,
      userData: data,
    });
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. SECOND - Check what notifications exist in Firestore
app.get("/api/debug/notifications", verifyAuthToken, async (req, res) => {
  const { uid } = req.user;
  try {
    const notificationsSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("notifications")
      .orderBy("timestamp", "desc")
      .limit(10)
      .get();

    const notifications = [];
    notificationsSnapshot.forEach((doc) => {
      notifications.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    console.log("=== NOTIFICATIONS DEBUG ===");
    console.log("Total notifications found:", notifications.length);
    notifications.forEach((notif, index) => {
      console.log(
        `${index + 1}. ${notif.type} - ${notif.message} - ${notif.timestamp}`
      );
    });

    res.json({ notifications, count: notifications.length });
  } catch (error) {
    console.error("Notifications debug error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. THIRD - Test webhook endpoint manually
app.post("/api/debug/webhook-test", verifyAuthToken, async (req, res) => {
  try {
    console.log("=== WEBHOOK TEST ===");

    // Create a test notification
    const testNotification = {
      type: "test",
      repo: "test/repo",
      message: "Test notification created manually",
      url: "https://github.com/test/repo",
      user: "testuser",
      read: false,
      timestamp: new Date(),
      timestampMs: Date.now(),
    };

    await db.collection("notifications").add(testNotification);

    console.log("Test notification created successfully");

    res.json({
      success: true,
      message: "Test notification created",
      notification: testNotification,
    });
  } catch (error) {
    console.error("Webhook test error:", error);
    res.status(500).json({ error: error.message });
  }
});
// Delete a specific notification
app.delete("/api/notifications/:id", verifyAuthToken, async (req, res) => {
  const { uid } = req.user;
  const { id } = req.params;
  try {
    const { id } = req.params;

    // Delete from Firestore
    await db
      .collection("users")
      .doc(uid)
      .collection("notifications")
      .doc(id)
      .delete();

    console.log(`Notification ${id} deleted successfully for user ${uid}.`);
    res.json({ success: true, message: "Notification deleted successfully." });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ error: "Failed to delete notification." });
  }
});
// Add this new route to your server.js file

app.post("/api/stocks/check-now", verifyAuthToken, async (req, res) => {
  const { uid } = req.user;
  console.log(`Manual stock check triggered for user: ${uid}`);
  let triggeredCount = 0;

  try {
    const alertsSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("stock_alerts")
      .where("status", "==", "active")
      .get();

    if (alertsSnapshot.empty) {
      return res.json({ success: true, message: "No active alerts to check." });
    }

    // This is the same logic from your cron job, but just for the current user
    for (const doc of alertsSnapshot.docs) {
      const alert = doc.data();
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${alert.ticker}&token=${process.env.FINNHUB_API_KEY}`
      );
      const data = await response.json();
      const currentPrice = data.c;

      if (currentPrice && currentPrice >= alert.targetPrice) {
        await doc.ref.update({
          status: "triggered",
          currentPrice: currentPrice,
          triggeredAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await db
          .collection("users")
          .doc(uid)
          .collection("notifications")
          .add({
            type: "stock",
            message: `📈 STOCK ALERT: ${alert.ticker} has reached your target of $${alert.targetPrice}!`,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
          });
        triggeredCount++;
      }
    }

    res.json({
      success: true,
      message: `Check complete. ${triggeredCount} new alert(s) triggered.`,
    });
  } catch (error) {
    console.error("Error during manual stock check:", error);
    res.status(500).json({ error: "Failed to check stock prices." });
  }
});
// --- Webhook Route (Requires Raw Body Parser) ---

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
// Add a token refresh endpoint
app.post("/api/auth/refresh-token", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: "Refresh token is required",
        code: "NO_REFRESH_TOKEN",
      });
    }

    res.json({
      success: true,
      message: "Token refresh initiated",
      action: "GET_NEW_TOKEN",
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      error: "Failed to refresh token",
      code: "REFRESH_FAILED",
    });
  }
});
// --- Smarter Order Scanning Route ---
app.post("/api/orders/scan-inbox", verifyAuthToken, async (req, res) => {
  try {
    const { uid } = req.user; // ADD THIS LINE
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists || !userDoc.data().google_tokens) {
      return res.status(401).json({
        error: "User is not authenticated with Google.",
        code: "NO_GOOGLE_TOKENS",
      });
    }

    // Create OAuth2 client and set credentials
    const requestOauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    requestOauth2Client.setCredentials(userDoc.data().google_tokens);

    // Check if token needs refresh
    try {
      if (requestOauth2Client.isTokenExpiring()) {
        console.log("Google token is expiring, attempting to refresh...");

        const { credentials } = await requestOauth2Client.refreshAccessToken();

        // Update the new tokens in Firestore
        await db.collection("users").doc(uid).update({
          google_tokens: credentials,
          last_token_refresh: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Update the client with new credentials
        requestOauth2Client.setCredentials(credentials);
        console.log("Google token refreshed successfully for inbox scan");
      }
    } catch (refreshError) {
      console.error("Google token refresh failed in inbox scan:", refreshError);
      return res.status(401).json({
        error:
          "Your Google session has expired. Please reconnect your Google account.",
        code: "TOKEN_REFRESH_FAILED",
      });
    }

    const gmail = google.gmail({ version: "v1", auth: requestOauth2Client });

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
      const orderData = await processOrderEmail(message, gmail, uid);
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

async function processOrderEmail(message, gmail, uid) {
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
        .collection("users")
        .doc(uid)
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
app.get("/api/orders/list", verifyAuthToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const ordersSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("orders")
      .orderBy("scannedAt", "desc")
      .limit(50)
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
app.get("/api/orders/:orderId", verifyAuthToken, async (req, res) => {
  const { orderId } = req.params;
  const { uid } = req.user;
  try {
    const orderDoc = await db
      .collection("users")
      .doc(uid)
      .collection("orders")
      .doc(orderId)
      .get();

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
          await db
            .collection("users")
            .doc(uid)
            .collection("orders")
            .doc(orderId)
            .update({
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
app.post("/api/orders/add-tracking", verifyAuthToken, async (req, res) => {
  const { uid } = req.user;
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
    await db
      .collection("users")
      .doc(uid)
      .collection("orders")
      .doc(orderId)
      .update({
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
app.post("/api/orders/bulk-update", verifyAuthToken, async (req, res) => {
  const { uid } = req.user;
  try {
    const ordersSnapshot = await db
      .collection("users")
      .doc(uid)
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
// --- Delete Order Route ---
app.delete("/api/orders/:orderId", verifyAuthToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { orderId } = req.params;

    // Check if the order exists first
    const orderDoc = await db
      .collection("users")
      .doc(uid)
      .collection("orders")
      .doc(orderId)
      .get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: "Order not found." });
    }

    const orderData = orderDoc.data();

    // If the order has AfterShip tracking, optionally remove it from AfterShip
    if (orderData.aftershipTrackingId) {
      try {
        const aftershipResponse = await fetch(
          `https://api.aftership.com/v4/trackings/${orderData.aftershipTrackingId}`,
          {
            method: "DELETE",
            headers: {
              "as-api-key": process.env.AFTERSHIP_API_KEY,
            },
          }
        );

        if (aftershipResponse.ok) {
          console.log(`Removed tracking from AfterShip for order ${orderId}`);
        } else {
          console.log(
            `Failed to remove tracking from AfterShip, but continuing with local deletion`
          );
        }
      } catch (aftershipError) {
        console.error(
          "Error removing tracking from AfterShip:",
          aftershipError
        );
        // Continue with local deletion even if AfterShip removal fails
      }
    }
    //this one is bt the proactive assistant
    // Add this route to your server.js file, preferably in the "Action Routes" section

    // --- Product Analysis Route (for Proactive Assistant) ---

    // Delete from Firestore
    await db
      .collection("users")
      .doc(uid)
      .collection("orders")
      .doc(orderId)
      .delete();

    console.log(`Order ${orderId} deleted successfully.`);
    res.json({
      success: true,
      message: "Order deleted successfully.",
      deletedOrderId: orderId,
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ error: "Failed to delete order." });
  }
});

app.post("/api/products/analyze", verifyAuthToken, async (req, res) => {
  const { productName, productDetails, userPreferences } = req.body;

  // Enhanced validation
  if (!productName) {
    return res.status(400).json({
      success: false,
      error: "Product name is required.",
    });
  }

  // Sanitize input to prevent prompt injection
  const sanitizedProductName = productName.replace(/[<>{}]/g, "").trim();
  if (sanitizedProductName.length < 3) {
    return res.status(400).json({
      success: false,
      error: "Product name must be at least 3 characters long.",
    });
  }

  // Build context from additional product details if available
  let contextInfo = "";
  if (productDetails) {
    if (productDetails.price) contextInfo += `Price: ${productDetails.price}\n`;
    if (productDetails.site) contextInfo += `Source: ${productDetails.site}\n`;
    if (productDetails.url) contextInfo += `URL: ${productDetails.url}\n`;
  }

  // Include user preferences if provided
  let preferencesContext = "";
  if (userPreferences) {
    if (userPreferences.budget)
      preferencesContext += `Budget: ${userPreferences.budget}\n`;
    if (userPreferences.useCase)
      preferencesContext += `Intended use: ${userPreferences.useCase}\n`;
    if (userPreferences.priorities)
      preferencesContext += `Priorities: ${userPreferences.priorities.join(
        ", "
      )}\n`;
  }

  const prompt = `
    Act as an expert product researcher and shopping advisor with deep knowledge of consumer electronics, fashion, home goods, and market trends. Analyze the following product and provide a comprehensive but concise analysis.

    Product: "${sanitizedProductName}"
    ${contextInfo ? `Additional Context:\n${contextInfo}` : ""}
    ${preferencesContext ? `User Preferences:\n${preferencesContext}` : ""}

    Please provide a detailed analysis with the following sections:

    ## 🔍 **Product Overview**
    Brief description of what this product is and its category.

    ## ⭐ **Key Features & Specifications**
    - List the most important features that make this product notable
    - Include technical specs if relevant
    - Highlight unique selling points

    ## 💰 **Price Analysis**
    - Categorize as budget/mid-range/premium
    - Compare to similar products in the market
    - Value proposition assessment
    ${
      productDetails?.price
        ? `- Analysis of the listed price: ${productDetails.price}`
        : ""
    }

    ## 👥 **Target Audience & Use Cases**
    - Who would benefit most from this product
    - Primary and secondary use cases
    - Skill level required (beginner/intermediate/expert)

    ## ✅ **Pros**
    - 3-4 main advantages
    - What users love about this product

    ## ❌ **Cons**
    - 2-3 potential drawbacks or limitations
    - Common complaints or issues

    ## 🏆 **Alternatives to Consider**
    - 2-3 competing products in similar price range
    - Brief explanation of how they differ

    ## 🎯 **Bottom Line & Recommendation**
    - Overall rating (out of 5 stars)
    - Clear recommendation: Buy/Consider/Skip
    - Best suited for specific user types
    ${
      preferencesContext
        ? `- Specific recommendation based on user preferences`
        : ""
    }

    Keep your response under 400 words while being comprehensive. Use clear markdown formatting with emojis for better readability. Be honest about both strengths and weaknesses.
  `;

  try {
    console.log(`Analyzing product: ${sanitizedProductName}`);

    // Add rate limiting check (optional)
    const clientIP = req.ip || req.connection.remoteAddress;
    // Implement rate limiting logic here if needed

    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const analysisTime = Date.now() - startTime;

    const analysis = result.response.text();

    // Enhanced response with metadata
    const response = {
      success: true,
      data: {
        analysis: analysis,
        productName: sanitizedProductName,
        analyzedAt: new Date().toISOString(),
        analysisTimeMs: analysisTime,
        ...(productDetails && { productDetails }),
        ...(userPreferences && { userPreferences }),
      },
      metadata: {
        model: "gemini", // or whatever model you're using
        version: "1.0",
        analysisTime: analysisTime,
      },
    };

    // Log successful analysis (for monitoring)
    console.log(
      `✅ Analysis completed for "${sanitizedProductName}" in ${analysisTime}ms`
    );

    res.json(response);
  } catch (error) {
    console.error("❌ Error analyzing product:", error);

    // Enhanced error handling
    let errorMessage = "Failed to analyze product.";
    let statusCode = 500;

    if (
      error.message?.includes("quota") ||
      error.message?.includes("rate limit")
    ) {
      errorMessage = "AI service quota exceeded. Please try again later.";
      statusCode = 429;
    } else if (error.message?.includes("timeout")) {
      errorMessage = "Analysis timed out. Please try again.";
      statusCode = 408;
    } else if (error.message?.includes("invalid")) {
      errorMessage = "Invalid product name or unsupported product type.";
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      productName: sanitizedProductName,
      timestamp: new Date().toISOString(),
    });
  }
});

// Additional endpoint for batch analysis (bonus feature)
app.post("/api/products/analyze-batch", verifyAuthToken, async (req, res) => {
  const { products } = req.body;

  if (!products || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({
      success: false,
      error: "Products array is required and must not be empty.",
    });
  }

  if (products.length > 5) {
    return res.status(400).json({
      success: false,
      error: "Maximum 5 products can be analyzed at once.",
    });
  }

  try {
    const analyses = [];

    for (const product of products) {
      if (!product.productName) continue;

      const sanitizedName = product.productName.replace(/[<>{}]/g, "").trim();

      const prompt = `
        Provide a brief product analysis for: "${sanitizedName}"
        
        Include:
        - Category and key features (2-3 points)
        - Price tier (budget/mid/premium)
        - Target user
        - Overall rating (1-5 stars)
        
        Keep under 100 words.
      `;

      const result = await model.generateContent(prompt);
      analyses.push({
        productName: sanitizedName,
        analysis: result.response.text(),
        ...(product.productDetails && {
          productDetails: product.productDetails,
        }),
      });

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    res.json({
      success: true,
      data: {
        analyses,
        analyzedAt: new Date().toISOString(),
        count: analyses.length,
      },
    });
  } catch (error) {
    console.error("Error in batch analysis:", error);
    res.status(500).json({
      success: false,
      error: "Failed to complete batch analysis.",
    });
  }
});

// Health check endpoint for the analyzer
app.get("/api/products/analyze/health", verifyAuthToken, (req, res) => {
  res.json({
    success: true,
    service: "Product Analyzer",
    status: "healthy",
    timestamp: new Date().toISOString(),
    endpoints: [
      "POST /api/products/analyze",
      "POST /api/products/analyze-batch",
    ],
  });
});
//debug model

app.post("/api/debug/followup", verifyAuthToken, async (req, res) => {
  const { previousAnalysis, newQuery } = req.body;

  if (!previousAnalysis || !newQuery) {
    return res
      .status(400)
      .json({ error: "Previous analysis and a new query are required." });
  }

  const prompt = `
    Act as an expert senior web developer continuing a debugging conversation.
    The user has received an initial analysis from you and is now asking a follow-up question.
    Use the previous analysis for context to provide a concise and helpful answer to the new question.

    **Previous Analysis:**
    ---
    ${previousAnalysis}
    ---

    **User's Follow-up Question:** "${newQuery}"

    **Your Answer:**
  `;

  try {
    console.log("Generating debug follow-up...");
    const result = await model.generateContent(prompt);
    const analysis = result.response.text();
    res.json({ success: true, summary: analysis });
  } catch (error) {
    console.error("Error generating debug follow-up:", error);
    res.status(500).json({
      error:
        "The AI model is currently overloaded. Please try again in a moment.",
    });
  }
});
// --- Snippet Saver Route ---
app.post("/api/snippets/save", verifyAuthToken, async (req, res) => {
  const { uid } = req.user;
  const { snippetText, sourceUrl } = req.body;

  // const { snippetText, sourceUrl } = req.body;
  if (!snippetText || !sourceUrl) {
    return res
      .status(400)
      .json({ error: "Snippet text and source URL are required." });
  }

  try {
    await db.collection("users").doc(uid).collection("snippets").add({
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
app.delete("/api/snippets/:id", verifyAuthToken, async (req, res) => {
  const { uid } = req.user;
  const { id } = req.params;
  try {
    const { id } = req.params;

    // Delete from Firestore
    await db
      .collection("users")
      .doc(uid)
      .collection("snippets")
      .doc(id)
      .delete();

    console.log(`Snippet ${id} deleted successfully.`);
    res.json({ success: true, message: "Snippet deleted successfully." });
  } catch (error) {
    console.error("Error deleting snippet:", error);
    res.status(500).json({ error: "Failed to delete snippet." });
  }
});

// --- Stock Alert Route ---
app.post("/api/stocks/add-alert", verifyAuthToken, async (req, res) => {
  const { uid } = req.user;
  const { ticker, targetPrice } = req.body;
  if (!ticker || !targetPrice) {
    return res
      .status(400)
      .json({ error: "Ticker and target price are required." });
  }

  try {
    await db
      .collection("users")
      .doc(uid)
      .collection("stock_alerts")
      .add({
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
// ADD THIS NEW BLOCK OF CODE
app.delete("/api/stocks/alert/:alertId", verifyAuthToken, async (req, res) => {
  const { uid } = req.user;
  const { alertId } = req.params;
  if (!alertId) {
    return res.status(400).json({ error: "Alert ID is required." });
  }

  try {
    await db
      .collection("users")
      .doc(uid)
      .collection("stock_alerts")
      .doc(alertId)
      .delete();
    console.log(`Alert ${alertId} deleted successfully.`);
    res.json({ success: true, message: "Alert deleted successfully!" });
  } catch (error) {
    console.error("Error deleting stock alert:", error);
    res.status(500).json({ error: "Failed to delete stock alert." });
  }
});
//  this for manual stock price updates:

app.post("/api/stocks/refresh-prices", verifyAuthToken, async (req, res) => {
  const { uid } = req.user;
  try {
    const alertsSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("stock_alerts")
      .where("status", "==", "triggered")
      .get();

    if (alertsSnapshot.empty) {
      return res.json({
        success: true,
        message: "No triggered alerts to refresh.",
        updated: 0,
      });
    }

    let updatedCount = 0;
    const batch = db.batch();

    for (const doc of alertsSnapshot.docs) {
      const alert = doc.data();
      try {
        const response = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${alert.ticker}&token=${process.env.FINNHUB_API_KEY}`
        );
        const data = await response.json();
        const currentPrice = data.c;

        if (currentPrice && currentPrice !== alert.currentPrice) {
          batch.update(doc.ref, {
            currentPrice: currentPrice,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          });
          updatedCount++;
          console.log(`Updated ${alert.ticker} price to $${currentPrice}`);
        }
      } catch (error) {
        console.error(`Failed to update price for ${alert.ticker}:`, error);
      }
    }

    if (updatedCount > 0) {
      await batch.commit();
    }

    res.json({
      success: true,
      message: `Updated ${updatedCount} stock prices.`,
      updated: updatedCount,
    });
  } catch (error) {
    console.error("Error refreshing stock prices:", error);
    res.status(500).json({ error: "Failed to refresh stock prices." });
  }
});
// END OF NEW BLOCK
// --- AI Content Composer Route ---
app.post("/api/ai/compose", verifyAuthToken, async (req, res) => {
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

app.post("/api/logout", verifyAuthToken, async (req, res) => {
  const { uid } = req.user;
  try {
    const userRef = db.collection("users").doc(uid);
    await userRef.update({
      google_tokens: admin.firestore.FieldValue.delete(),
      github_access_token: admin.firestore.FieldValue.delete(),
    });
    res.json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    res.status(500).json({ error: "Logout failed on the server." });
  }
});
app.post("/api/summarize", verifyAuthToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text)
      return res.status(400).json({ error: "Text content is required." });

    const prompt = `Summarize the following text:\n\n${text.substring(
      0,
      15000
    )}`;

    // Use the streaming model
    const result = await model.generateContent(prompt);
    res.json({ success: true, summary: result.response.text() });
    // Set headers for a streaming response
    // res.setHeader("Content-Type", "text/plain; charset=utf-8");
    // res.setHeader("Transfer-Encoding", "chunked");

    // Stream each chunk of text to the client as it's generated
    // for await (const chunk of result.stream) {
    //   res.write(chunk.text());
    // }

    // res.end(); // End the response when the stream is finished
  } catch (error) {
    console.error("Error in streaming summary:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate summary." });
    } else {
      res.end();
    }
  }
});
app.post("/api/gmail/draft", verifyAuthToken, async (req, res) => {
  console.log("--> Received request at /api/gmail/draft");

  const { uid } = req.user;
  const { pageContent } = req.body;

  try {
    const userDoc = await db.collection("users").doc(uid).get();
    const tokens = userDoc.data()?.google_tokens;

    if (!tokens) {
      return res.status(401).json({
        error: "Google account not connected. Please log in again.",
        code: "NO_GOOGLE_TOKENS",
      });
    }

    const requestOauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    requestOauth2Client.setCredentials(tokens);

    if (requestOauth2Client.isTokenExpiring()) {
      console.log("Google token is expiring, attempting to refresh...");
      try {
        const { credentials } = await requestOauth2Client.refreshAccessToken();
        await db
          .collection("users")
          .doc(uid)
          .update({
            google_tokens: {
              ...credentials,
              refresh_token: credentials.refresh_token || tokens.refresh_token,
            },
            last_token_refresh: admin.firestore.FieldValue.serverTimestamp(),
          });
        requestOauth2Client.setCredentials(credentials);
        console.log("✅ Google token refreshed successfully.");
      } catch (refreshError) {
        console.error("❌ Google token refresh failed:", refreshError);
        return res.status(401).json({
          error:
            "Your Google session has expired. Please reconnect your Google account.",
          code: "TOKEN_REFRESH_FAILED",
        });
      }
    }

    const gmail = google.gmail({ version: "v1", auth: requestOauth2Client });
    const prompt = `Based on the following text, generate a concise email subject line and a professional email body. Format the output ONLY as a JSON object with "subject" and "body" keys. Text: "${pageContent.substring(
      0,
      4000
    )}"`;
    const aiResult = await model.generateContent(prompt);
    const jsonString = aiResult.response
      .text()
      .replace(/```json\n|```/g, "")
      .trim();

    let subject, body;
    try {
      const jsonResponse = JSON.parse(jsonString);
      subject = jsonResponse.subject;
      body = jsonResponse.body;
    } catch (parseError) {
      console.warn(
        "⚠️ AI did not return valid JSON. Attempting to extract manually."
      );
      subject =
        jsonString.match(/Subject:\s*(.*)/)?.[1] || "Draft from AlturaAI";
      body = jsonString;
    }

    const email = `Content-Type: text/plain; charset="UTF-8"\nMIME-Version: 1.0\nto: \nsubject: ${subject}\n\n${body}`;
    const base64EncodedEmail = Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    await gmail.users.drafts.create({
      userId: "me",
      requestBody: { message: { raw: base64EncodedEmail } },
    });

    console.log("Gmail draft created successfully for user:", uid);
    res.json({ success: true, message: "Draft created successfully!" });
  } catch (error) {
    console.error("❌ Error creating Gmail draft:", error);
    if (error.code === 401 || error.message?.includes("Invalid Credentials")) {
      return res.status(401).json({
        error:
          "Your Google session has expired. Please reconnect your Google account.",
      });
    }
    if (error.code === 403) {
      return res.status(403).json({
        error:
          "Gmail access denied. Please check your Google account permissions.",
      });
    }
    res.status(500).json({ error: "Failed to create draft." });
  }
});
app.post("/api/github/pr/review", verifyAuthToken, async (req, res) => {
  const { uid } = req.user;
  const { prUrl } = req.body;

  if (!prUrl) {
    return res.status(400).json({ error: "Pull Request URL is required." });
  }
  try {
    // --- Start: New GitHub App Authentication ---
    const userDoc = await db.collection("users").doc(uid).get();
    const installationId = userDoc.data()?.github_installation_id;
    if (!installationId) {
      return res.status(401).json({ error: "GitHub App not installed." });
    }

    const appJwt = generateJwt();
    const tokenResponse = await fetch(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${appJwt}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) throw new Error("Failed to get installation token.");
    const accessToken = tokenData.token;
    // --- End: New GitHub App Authentication ---

    const apiUrl = prUrl
      .replace("github.com", "api.github.com/repos")
      .replace("/pull/", "/pulls/");

    const diffResponse = await fetch(apiUrl, {
      headers: {
        // Use the new accessToken here
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3.diff",
      },
    });

    if (!diffResponse.ok) {
      throw new Error(`Failed to fetch PR diff: ${diffResponse.statusText}`);
    }

    const diffText = await diffResponse.text();
    const prompt = `You are an expert code reviewer. Please review the following code changes (in .diff format) and provide a concise summary of potential issues, bugs, or style improvements. Format your response in Markdown.\n\nDiff:\n${diffText}`;

    const result = await model.generateContent(prompt);
    res.json({ review: result.response.text() });
  } catch (error) {
    console.error("Error generating PR review:", error);
    res.status(500).json({ error: "Failed to generate PR review." });
  }
});

app.post("/api/notion/create", verifyAuthToken, async (req, res) => {
  const { uid } = req.user;
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

app.post("/api/calendar/find-times", verifyAuthToken, async (req, res) => {
  try {
    // FIX: Get the user ID from the request object
    const { uid } = req.user;

    // The rest of your code is now correct because `uid` is defined.
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists || !userDoc.data().google_tokens) {
      return res
        .status(401)
        .json({ error: "User is not authenticated with Google." });
    }

    const googleOauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${BACKEND_BASE_URL}/api/auth/google/callback`
    );

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

app.post("/api/research/start", verifyAuthToken, async (req, res) => {
  const { topic } = req.body;
  const { uid } = req.user; // Get the user ID from the token

  if (!topic) {
    return res.status(400).json({ error: "Research topic is required." });
  }

  try {
    // Correctly reference the user's nested collection
    const userResearchCollectionRef = db
      .collection("users")
      .doc(uid)
      .collection("research_tasks");

    const taskRef = await userResearchCollectionRef.add({
      topic: topic,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(
      `New research task created with ID: ${taskRef.id} for user: ${uid}`
    );
    res.json({ success: true, message: `Research on "${topic}" has started.` });

    // The AI worker function also needs the correct collection reference
    (async () => {
      try {
        console.log(`Performing AI research for task ${taskRef.id}...`);
        const prompt = `Please conduct thorough research on the following topic and provide a detailed, well-structured summary. Include key points, relevant data, and a concluding paragraph. Topic: "${topic}"`;
        const result = await model.generateContent(prompt);
        const researchSummary = result.response.text();

        // Update the task in the correct user-specific collection
        await userResearchCollectionRef.doc(taskRef.id).update({
          status: "completed",
          result: researchSummary,
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(
          `Research task ${taskRef.id} has been completed for user: ${uid}.`
        );
      } catch (aiError) {
        console.error(`AI research failed for task ${taskRef.id}:`, aiError);
        await userResearchCollectionRef.doc(taskRef.id).update({
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
// In server.js, add this new route
app.post("/api/ai/momentum", verifyAuthToken, async (req, res) => {
  const { history } = req.body;
  if (!history || history.length === 0) {
    return res.status(400).json({ error: "User history is required." });
  }

  try {
    const prompt = `You are a professional AI productivity coach. Based on the user's recent browsing history, suggest a single, specific, and actionable "next step" to help them build momentum. Keep it under 50 words.

        Recent History:
        ${JSON.stringify(history, null, 2)}
        
        Next Action:`;

    const result = await model.generateContent(prompt);
    const suggestion = result.response.text();

    res.json({ success: true, message: suggestion });
  } catch (error) {
    console.error("Error generating momentum suggestion:", error);
    res.status(500).json({ error: "Failed to generate suggestion." });
  }
});
// You must also update your DELETE and DOWNLOAD routes to use this new path:
// Replace this: `db.collection("research_tasks").doc(taskId).delete()`
// With this: `db.collection("users").doc(uid).collection("research_tasks").doc(taskId).delete()`
app.delete("/api/research/task/:taskId", verifyAuthToken, async (req, res) => {
  const { uid } = req.user;
  const { taskId } = req.params;
  try {
    // FIX: Check and delete directly from the user's collection
    const taskRef = db
      .collection("users")
      .doc(uid)
      .collection("research_tasks")
      .doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      return res
        .status(404)
        .json({ error: "Research task not found for this user." });
    }

    await taskRef.delete();

    console.log(
      `Research task ${taskId} deleted successfully for user ${uid}.`
    );
    res.json({
      success: true,
      message: "Research task deleted successfully.",
      deletedTaskId: taskId,
    });
  } catch (error) {
    console.error("Error deleting research task:", error);
    res.status(500).json({ error: "Failed to delete research task." });
  }
});
// In server.js

app.post("/api/debug/webpage", verifyAuthToken, async (req, res) => {
  const { consoleErrors, pageHtml } = req.body;

  if (!pageHtml || !consoleErrors) {
    return res
      .status(400)
      .json({ error: "Console errors and page HTML are required." });
  }

  const prompt = `
    Act as an expert senior web developer and debugging specialist. I am providing you with the full HTML of a webpage and a list of JavaScript console errors that occurred when it loaded.

    Your task is to:
    1.  Analyze the HTML structure and the console errors together to identify the most likely root cause of the errors.
    2.  Provide a clear, step-by-step explanation of the problem in Markdown.
    3.  Suggest a specific, corrected code snippet to fix the issue.
    4.  Search the web for 1-2 highly relevant links (from Stack Overflow, MDN Web Docs, or official documentation) that directly address the primary error.
    5.  Format the entire response in clean Markdown. At the end, create a "Relevant Links" section for the URLs.

    Here is the data:

    **Console Errors:**
    \`\`\`json
    ${JSON.stringify(consoleErrors, null, 2)}
    \`\`\`

    **Page HTML:**
    \`\`\`html
    ${pageHtml.substring(0, 8000)}
    \`\`\`

    **Analysis, Solution, and Relevant Links:**
  `;

  try {
    console.log("Generating webpage debug analysis...");
    const result = await model.generateContent(prompt);
    const analysis = result.response.text();
    res.json({ success: true, summary: analysis }); // Sending back as 'summary' to match the existing handleAction flow
  } catch (error) {
    console.error("Error generating debug analysis:", error);
    res
      .status(500)
      .json({ error: "Failed to generate debug analysis from AI." });
  }
});
app.get(
  "/api/research/task/:taskId/download",
  verifyAuthToken,
  async (req, res) => {
    const { uid } = req.user;
    try {
      const { taskId } = req.params;

      // Fetch the research task from Firestore
      const taskDoc = await db
        .collection("users")
        .doc(uid)
        .collection("research_tasks")
        .doc(taskId)
        .get();
      if (!taskDoc.exists) {
        return res.status(404).json({ error: "Research task not found." });
      }

      const taskData = taskDoc.data();

      if (taskData.status !== "completed" || !taskData.result) {
        return res
          .status(400)
          .json({ error: "Research task is not completed or has no content." });
      }

      // Create a new PDF document
      const doc = new PDFDocument({
        margin: 50,
        size: "A4",
      });

      // Set response headers for PDF download
      const filename = `research-${taskData.topic
        .replace(/[^a-zA-Z0-9]/g, "-")
        .toLowerCase()}-${taskId}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      // Handle errors
      doc.on("error", (err) => {
        console.error("PDF document error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to generate PDF." });
        }
      });

      // Pipe the PDF to the response
      doc.pipe(res);

      // Add title
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("Research Report", { align: "center" })
        .moveDown();

      // Add topic
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Topic:", { continued: true })
        .font("Helvetica")
        .text(` ${taskData.topic}`)
        .moveDown();

      // Add creation date
      const createdDate = taskData.createdAt?.toDate
        ? taskData.createdAt.toDate().toLocaleDateString()
        : new Date().toLocaleDateString();

      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Created:", { continued: true })
        .font("Helvetica")
        .text(` ${createdDate}`)
        .moveDown();

      // Add completion date if available
      if (taskData.completedAt) {
        const completedDate = taskData.completedAt?.toDate
          ? taskData.completedAt.toDate().toLocaleDateString()
          : new Date().toLocaleDateString();

        doc
          .font("Helvetica-Bold")
          .text("Completed:", { continued: true })
          .font("Helvetica")
          .text(` ${completedDate}`)
          .moveDown();
      }

      // Add separator line
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown();

      // Process the content and remove markdown formatting for PDF
      let content = taskData.result;

      // Simple markdown to plain text conversion
      content = content
        .replace(/#{1,6}\s+/g, "") // Remove header markers
        .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold markers
        .replace(/\*(.*?)\*/g, "$1") // Remove italic markers
        .replace(/`(.*?)`/g, "$1") // Remove code markers
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Convert links to just text
        .replace(/^\s*[-*+]\s+/gm, "• ") // Convert list markers to bullets
        .replace(/^\s*\d+\.\s+/gm, "• "); // Convert numbered lists to bullets

      // Split content into paragraphs
      const paragraphs = content.split(/\n\s*\n/);

      // Add content with proper formatting
      doc.fontSize(11).font("Helvetica");

      for (const paragraph of paragraphs) {
        if (paragraph.trim()) {
          // Check if we need a new page
          if (doc.y > 700) {
            doc.addPage();
          }

          doc
            .text(paragraph.trim(), {
              align: "justify",
              lineGap: 2,
            })
            .moveDown();
        }
      }

      // Add footer to each page after content is complete
      const range = doc.bufferedPageRange();
      const pageCount = range.count;

      // Only add footers if there are pages
      if (pageCount > 0) {
        for (let i = 1; i <= pageCount; i++) {
          doc.switchToPage(i); // PDFKit uses 0-based indexing internally
          doc
            .fontSize(9)
            .font("Helvetica")
            .text(
              `Generated by AlturaAI - Page ${i} of ${pageCount}`,
              50,
              750,
              {
                align: "center",
              }
            );
        }
      }

      // Finalize the PDF and end the stream
      doc.end();

      console.log(`PDF generated for research task: ${taskId}`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to generate PDF." });
      }
    }
  }
);
// --- Background Task for Stock Monitoring ---
cron.schedule("*/5 * * * *", async () => {
  console.log("--- Running Stock Price Check for ALL USERS ---");
  try {
    // ✅ 1. Get all users from the 'users' collection
    const usersSnapshot = await db.collection("users").get();

    if (usersSnapshot.empty) {
      return;
    }

    // ✅ 2. Loop through each user
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;

      // ✅ 3. Query the user's PERSONAL stock_alerts collection
      const alertsSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("stock_alerts")
        .where("status", "==", "active")
        .get();

      if (alertsSnapshot.empty) {
        continue; // This user has no active alerts, move to the next user
      }

      console.log(`Checking ${alertsSnapshot.size} alerts for user: ${userId}`);
      for (const alertDoc of alertsSnapshot.docs) {
        const alert = alertDoc.data();
        try {
          const response = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${alert.ticker}&token=${process.env.FINNHUB_API_KEY}`
          );
          const data = await response.json();
          const currentPrice = data.c;

          if (currentPrice && currentPrice >= alert.targetPrice) {
            console.log(
              `!!! Stock alert triggered for user ${userId}, ticker ${alert.ticker} !!!`
            );

            // ✅ 4. Add notification to the correct user's feed
            await db
              .collection("users")
              .doc(userId)
              .collection("notifications")
              .add({
                type: "stock",
                message: `📈 STOCK ALERT: ${alert.ticker} has reached your target of $${alert.targetPrice}! Current price is $${currentPrice}.`,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                read: false,
              });

            // ✅ 5. Update the alert in the user's collection
            await alertDoc.ref.update({
              status: "triggered",
              currentPrice: currentPrice,
              triggeredAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        } catch (error) {
          console.error(
            `Failed to check stock price for ${alert.ticker} for user ${userId}:`,
            error
          );
        }
      }
    }
  } catch (error) {
    console.error("Error in Stock Price cron job:", error.message);
  }
});

// --- Background Task for Parcel Tracking ---
cron.schedule("*/10 * * * *", async () => {
  console.log("--- Running Parcel Tracking Check for ALL USERS ---");
  try {
    // ✅ 1. Get all users
    const usersSnapshot = await db.collection("users").get();

    if (usersSnapshot.empty) {
      return;
    }

    // ✅ 2. Loop through each user
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;

      // ✅ 3. Query the user's PERSONAL orders collection
      const ordersSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("orders")
        .where("aftershipTrackingId", "!=", null)
        .get();

      if (ordersSnapshot.empty) {
        continue; // No tracked orders for this user, move on
      }

      console.log(
        `Checking ${ordersSnapshot.size} tracked orders for user: ${userId}`
      );
      for (const orderDoc of ordersSnapshot.docs) {
        const order = orderDoc.data();

        if (order.status === "Delivered") {
          continue;
        }

        try {
          const response = await fetch(
            `https://api.aftership.com/v4/trackings/${order.aftershipTrackingId}`,
            { headers: { "as-api-key": process.env.AFTERSHIP_API_KEY } }
          );
          const data = await response.json();

          if (data && data.data && data.data.tracking) {
            const newStatus = data.data.tracking.tag;

            if (newStatus !== order.status) {
              console.log(
                `!!! Order status updated for user ${userId}, order ${orderDoc.id} !!!`
              );

              // ✅ 4. Add notification to the correct user's feed
              await db
                .collection("users")
                .doc(userId)
                .collection("notifications")
                .add({
                  type: "order",
                  message: `📦 Order Update: Your order for "${
                    order.itemName || "item"
                  }" is now ${newStatus}.`,
                  timestamp: admin.firestore.FieldValue.serverTimestamp(),
                  read: false,
                });

              // ✅ 5. Update the order in the user's collection
              await orderDoc.ref.update({ status: newStatus });
            }
          }
        } catch (error) {
          console.error(
            `Failed to check tracking for order ${orderDoc.id} for user ${userId}:`,
            error
          );
        }
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
