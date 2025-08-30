// Fixed auth.js - Chrome Identity API version
document.addEventListener("DOMContentLoaded", function () {
  function updateStatus(message) {
    const statusElement = document.querySelector("p");
    if (statusElement) {
      statusElement.textContent = message;
    }
    console.log("Auth Status:", message);
  }

  async function doSignIn() {
    try {
      updateStatus("Authenticating with Google...");

      // Use Chrome Identity API instead of Firebase
      chrome.identity.getAuthToken(
        {
          interactive: true,
          scopes: [
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/gmail.compose",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/calendar.events.readonly",
          ],
        },
        async function (token) {
          try {
            if (chrome.runtime.lastError) {
              throw new Error(chrome.runtime.lastError.message);
            }

            if (!token) {
              throw new Error("No token received from Chrome Identity");
            }

            updateStatus("Getting user information...");

            // Get user info using the token
            const userInfoResponse = await fetch(
              `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${token}`
            );

            if (!userInfoResponse.ok) {
              throw new Error(
                `Failed to get user info: ${userInfoResponse.status}`
              );
            }

            const userInfo = await userInfoResponse.json();

            updateStatus("Storing authentication data...");

            await chrome.storage.local.set({
              authToken: token, // Use authToken instead of idToken for Chrome Identity
              userInfo: {
                id: userInfo.id,
                email: userInfo.email,
                name: userInfo.name,
                picture: userInfo.picture,
              },
              isAuthenticated: true,
            });

            // Send success message to background script
            chrome.runtime.sendMessage({
              action: "AUTH_SUCCESS",
              token: token,
              userInfo: userInfo,
            });

            updateStatus("Authentication successful! Closing...");
            setTimeout(() => window.close(), 2000);
          } catch (error) {
            console.error("Error in auth callback:", error);
            updateStatus(`Authentication failed: ${error.message}`);

            // Show retry button
            document.body.innerHTML = `
              <h1>Sign-in Failed</h1>
              <p><strong>Error:</strong> ${error.message}</p>
              <button onclick="location.reload()" style="
                background: white;
                color: #667eea;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-weight: bold;
                margin-top: 20px;
              ">Try Again</button>
            `;
          }
        }
      );
    } catch (error) {
      console.error("Chrome Identity Auth Error:", error);
      updateStatus(`Authentication failed: ${error.message}`);

      document.body.innerHTML = `
        <h1>Sign-in Failed</h1>
        <p><strong>Error:</strong> ${error.message}</p>
        <button onclick="location.reload()" style="
          background: white;
          color: #667eea;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          margin-top: 20px;
        ">Try Again</button>
      `;
    }
  }

  doSignIn();
});

// Note: The chrome.identity.onSignInChanged listener should be in background.js, not auth.js
