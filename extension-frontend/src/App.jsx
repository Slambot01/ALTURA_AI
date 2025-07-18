// import React, { useState, useEffect } from "react";
// import { initializeApp } from "firebase/app";
// import {
//   getFirestore,
//   collection,
//   query,
//   orderBy,
//   onSnapshot,
// } from "firebase/firestore";
// import "./App.css";

// // --- Add your Firebase project's configuration here ---
// const firebaseConfig = {
//   apiKey: "AIzaSyCKzR8anjdxGdBdmvwWIbK7Njp87XQbGF0",
//   authDomain: "alturaai.firebaseapp.com",
//   projectId: "alturaai",
//   storageBucket: "alturaai.firebasestorage.app",
//   messagingSenderId: "296537793338",
//   appId: "1:296537793338:web:00814e384e648d4cc46603",
// };
// const app = initializeApp(firebaseConfig);
// const db = getFirestore(app);

// function App() {
//   const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false);
//   const [isGithubLoggedIn, setIsGithubLoggedIn] = useState(false);
//   const [notifications, setNotifications] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [summary, setSummary] = useState("");
//   const [isLoadingAction, setIsLoadingAction] = useState(false);

//   // **NEW:** State for the PR review modal
//   const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
//   const [reviewContent, setReviewContent] = useState("");
//   const [isReviewLoading, setIsReviewLoading] = useState(false);

//   // Check if running in Chrome extension context
//   const isExtension =
//     typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;

//   useEffect(() => {
//     if (isExtension) {
//       chrome.runtime.sendMessage({ action: "check_auth_status" });
//       chrome.storage.local.get(
//         ["isGoogleLoggedIn", "isGithubLoggedIn"],
//         (result) => {
//           setIsGoogleLoggedIn(!!result.isGoogleLoggedIn);
//           setIsGithubLoggedIn(!!result.isGithubLoggedIn);
//         }
//       );
//       const handleStorageChange = (changes, area) => {
//         if (area === "local") {
//           if (changes.isGoogleLoggedIn)
//             setIsGoogleLoggedIn(!!changes.isGoogleLoggedIn.newValue);
//           if (changes.isGithubLoggedIn)
//             setIsGithubLoggedIn(!!changes.isGithubLoggedIn.newValue);
//         }
//       };
//       chrome.storage.onChanged.addListener(handleStorageChange);
//       return () => chrome.storage.onChanged.removeListener(handleStorageChange);
//     } else {
//       // For web app, check auth status directly
//       checkAuthStatus();
//     }
//   }, []);

//   // Function to check auth status via API
//   const checkAuthStatus = async () => {
//     try {
//       const response = await fetch("http://localhost:3001/api/auth/status");
//       const data = await response.json();
//       setIsGoogleLoggedIn(data.isGoogleLoggedIn);
//       setIsGithubLoggedIn(data.isGithubLoggedIn);
//     } catch (err) {
//       console.error("Error checking auth status:", err);
//       setError("Could not connect to authentication service.");
//     }
//   };

//   useEffect(() => {
//     if (!isGithubLoggedIn) {
//       setLoading(false);
//       setNotifications([]);
//       return;
//     }
//     setLoading(true);
//     const q = query(
//       collection(db, "notifications"),
//       orderBy("timestamp", "desc")
//     );
//     const unsubscribe = onSnapshot(
//       q,
//       (querySnapshot) => {
//         const newNotifications = querySnapshot.docs.map((doc) => ({
//           id: doc.id,
//           ...doc.data(),
//         }));
//         setNotifications(newNotifications);
//         setLoading(false);
//       },
//       (err) => {
//         setError("Could not connect to Firestore for notifications.");
//         setLoading(false);
//       }
//     );
//     return () => unsubscribe();
//   }, [isGithubLoggedIn]);

//   const handleLoginClick = async (service) => {
//     console.log("=== LOGIN BUTTON CLICKED ===");
//     console.log("Service:", service);
//     console.log("Extension mode:", isExtension);

//     const url = `http://localhost:3001/api/auth/${service}`;
//     console.log("URL:", url);

//     if (service === "github") {
//       if (isExtension) {
//         console.log("Opening GitHub auth in new tab...");
//         try {
//           chrome.tabs.create({ url: url }, (tab) => {
//             console.log("Tab created successfully:", tab.id);
//           });
//         } catch (err) {
//           console.error("Error creating tab:", err);
//           setError("Failed to open GitHub login. Please try again.");
//         }
//       } else {
//         console.log("Redirecting directly...");
//         window.location.href = url;
//       }
//     } else {
//       // For Google, get the auth URL first
//       try {
//         const response = await fetch(url);
//         const data = await response.json();
//         if (data.url) {
//           if (isExtension) {
//             chrome.tabs.create({ url: data.url });
//           } else {
//             window.open(data.url, "_blank");
//           }
//         }
//       } catch (err) {
//         setError(`Could not connect to the ${service} login service.`);
//       }
//     }
//   };

//   const handleAction = (action) => {
//     if (isExtension) {
//       // Chrome extension flow
//       setIsLoadingAction(true);
//       setSummary("");
//       setError("");
//       chrome.runtime.sendMessage({ action }, (response) => {
//         if (response.error) setError(response.error);
//         else if (response.summary) setSummary(response.summary);
//         else if (response.message) setSummary(response.message);
//         setIsLoadingAction(false);
//       });
//     } else {
//       // Web app flow - you'll need to implement this
//       setError("This feature is only available in the Chrome extension.");
//     }
//   };

//   // **NEW:** Function to handle PR Review request
//   const handleReviewPR = async (prUrl) => {
//     setIsReviewLoading(true);
//     setIsReviewModalOpen(true);
//     setReviewContent("");
//     setError("");

//     try {
//       const response = await fetch(
//         "http://localhost:3001/api/github/pr/review",
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ prUrl }),
//         }
//       );
//       const data = await response.json();
//       if (response.ok) {
//         setReviewContent(data.review);
//       } else {
//         throw new Error(data.error || "Failed to get review.");
//       }
//     } catch (err) {
//       setReviewContent(`Error: ${err.message}`);
//     } finally {
//       setIsReviewLoading(false);
//     }
//   };

//   const handleNotificationClick = (notification) => {
//     if (
//       notification.type === "pull_request" &&
//       notification.action === "opened"
//     ) {
//       handleReviewPR(notification.url);
//     } else {
//       window.open(notification.url, "_blank");
//     }
//   };

//   const handleLogout = async () => {
//     try {
//       const response = await fetch("http://localhost:3001/api/logout", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//       });
//       const data = await response.json();
//       if (response.ok) {
//         setIsGoogleLoggedIn(false);
//         setIsGithubLoggedIn(false);
//         setNotifications([]);
//         setSummary("");
//         setError("");
//         // Clear Chrome storage if in extension
//         if (isExtension) {
//           chrome.storage.local.remove(["isGoogleLoggedIn", "isGithubLoggedIn"]);
//         }
//       } else {
//         throw new Error(data.error || "Logout failed");
//       }
//     } catch (err) {
//       setError(`Logout failed: ${err.message}`);
//     }
//   };

//   return (
//     <div className="App">
//       <header className="App-header">
//         <h1>AlturaAI</h1>
//         <div className="auth-status">
//           {!isGoogleLoggedIn ? (
//             <button
//               onClick={() => handleLoginClick("google")}
//               className="login-button"
//             >
//               Login with Google
//             </button>
//           ) : (
//             <p className="status-ok">✔ Google Connected</p>
//           )}
//           {!isGithubLoggedIn ? (
//             <button
//               onClick={() => handleLoginClick("github")}
//               className="login-button"
//             >
//               Login with GitHub
//             </button>
//           ) : (
//             <p className="status-ok">✔ GitHub Connected</p>
//           )}

//           {/* Add logout button if either service is connected */}
//           {(isGoogleLoggedIn || isGithubLoggedIn) && (
//             <button
//               onClick={handleLogout}
//               className="logout-button"
//               style={{ marginLeft: "10px", backgroundColor: "#dc3545" }}
//             >
//               Logout
//             </button>
//           )}
//         </div>
//       </header>
//       <main className="App-main">
//         <div className="action-buttons">
//           <button
//             onClick={() => handleAction("summarize_page")}
//             disabled={!isGoogleLoggedIn || isLoadingAction}
//           >
//             Summarize Page
//           </button>
//           <button
//             onClick={() => handleAction("draft_email")}
//             disabled={!isGoogleLoggedIn || isLoadingAction}
//           >
//             Draft Email
//           </button>
//         </div>

//         {isLoadingAction && <p>Loading...</p>}
//         {error && <p className="error">{error}</p>}
//         {summary && <div className="summary-box">{summary}</div>}

//         <hr />

//         <h2>GitHub Feed</h2>
//         {isGithubLoggedIn ? (
//           loading ? (
//             <p>Loading feed...</p>
//           ) : notifications.length > 0 ? (
//             <ul className="notification-feed">
//               {notifications.map((notif) => (
//                 <li
//                   key={notif.id}
//                   className={`notification-item ${
//                     notif.type === "pull_request" && notif.action === "opened"
//                       ? "clickable"
//                       : ""
//                   }`}
//                   onClick={() => handleNotificationClick(notif)}
//                 >
//                   <p className="message">{notif.message}</p>
//                   <p className="meta">
//                     {notif.repo} -{" "}
//                     {new Date(notif.timestamp.seconds * 1000).toLocaleString()}
//                   </p>
//                 </li>
//               ))}
//             </ul>
//           ) : (
//             <p>No new notifications. Push a commit or open a PR to test.</p>
//           )
//         ) : (
//           <p>Login with GitHub to see your feed.</p>
//         )}
//       </main>

//       {/* **NEW:** PR Review Modal */}
//       {isReviewModalOpen && (
//         <div className="modal-overlay">
//           <div className="modal-content">
//             <button
//               className="modal-close"
//               onClick={() => setIsReviewModalOpen(false)}
//             >
//               X
//             </button>
//             <h2>AI Pull Request Review</h2>
//             {isReviewLoading ? (
//               <p>Analyzing code changes...</p>
//             ) : (
//               <pre className="review-text">{reviewContent}</pre>
//             )}
//           </div>
//         </div>
//       )}

//       {/* Debug info */}
//       <div style={{ fontSize: "12px", color: "#666", marginTop: "20px" }}>
//         <p>Extension mode: {isExtension ? "Yes" : "No"}</p>
//         <p>Google logged in: {isGoogleLoggedIn ? "Yes" : "No"}</p>
//         <p>GitHub logged in: {isGithubLoggedIn ? "Yes" : "No"}</p>
//       </div>
//     </div>
//   );
// }

// export default App;
import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false);
  const [isGithubLoggedIn, setIsGithubLoggedIn] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [isLoadingAction, setIsLoadingAction] = useState(false);

  // State for the PR review modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewContent, setReviewContent] = useState("");
  const [isReviewLoading, setIsReviewLoading] = useState(false);

  const isExtension =
    typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;

  // This useEffect handles checking auth status
  useEffect(() => {
    if (isExtension) {
      chrome.runtime.sendMessage({ action: "check_auth_status" });
      chrome.storage.local.get(
        ["isGoogleLoggedIn", "isGithubLoggedIn"],
        (result) => {
          setIsGoogleLoggedIn(!!result.isGoogleLoggedIn);
          setIsGithubLoggedIn(!!result.isGithubLoggedIn);
        }
      );
      const handleStorageChange = (changes, area) => {
        if (area === "local") {
          if (changes.isGoogleLoggedIn)
            setIsGoogleLoggedIn(!!changes.isGoogleLoggedIn.newValue);
          if (changes.isGithubLoggedIn)
            setIsGithubLoggedIn(!!changes.isGithubLoggedIn.newValue);
        }
      };
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }
  }, []);

  // **MODIFIED**: This useEffect now securely fetches notifications from the backend
  useEffect(() => {
    if (!isGithubLoggedIn) {
      setLoading(false);
      setNotifications([]);
      return;
    }

    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const response = await fetch("http://localhost:3001/api/notifications");
        if (!response.ok) {
          throw new Error("Failed to fetch notifications from the server.");
        }
        const data = await response.json();
        setNotifications(data);
      } catch (err) {
        setError("Could not connect to the notification service.");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Optional: Poll for new notifications every 30 seconds
    const intervalId = setInterval(fetchNotifications, 30000);
    return () => clearInterval(intervalId);
  }, [isGithubLoggedIn]);

  const handleLoginClick = async (service) => {
    const url = `http://localhost:3001/api/auth/${service}`;
    if (service === "github") {
      if (isExtension) chrome.tabs.create({ url });
      else window.location.href = url;
    } else {
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.url) {
          if (isExtension) chrome.tabs.create({ url: data.url });
          else window.open(data.url, "_blank");
        }
      } catch (err) {
        setError(`Could not connect to the ${service} login service.`);
      }
    }
  };

  const handleAction = (action) => {
    if (isExtension) {
      setIsLoadingAction(true);
      setSummary("");
      setError("");
      chrome.runtime.sendMessage({ action }, (response) => {
        if (response.error) setError(response.error);
        else if (response.summary) setSummary(response.summary);
        else if (response.message) setSummary(response.message);
        setIsLoadingAction(false);
      });
    } else {
      setError("This feature is only available in the Chrome extension.");
    }
  };

  const handleReviewPR = async (prUrl) => {
    // This will not work until the /api/github/pr/review endpoint is added to server.js
    setError("PR Review feature is not yet implemented on the server.");
  };

  const handleNotificationClick = (notification) => {
    if (
      notification.type === "pull_request" &&
      notification.action === "opened"
    ) {
      handleReviewPR(notification.url);
    } else {
      window.open(notification.url, "_blank");
    }
  };

  const handleLogout = async () => {
    // This will not work until the /api/logout endpoint is added to server.js
    setError("Logout feature is not yet implemented on the server.");
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>AlturaAI</h1>
        <div className="auth-status">
          {!isGoogleLoggedIn ? (
            <button
              onClick={() => handleLoginClick("google")}
              className="login-button"
            >
              Login with Google
            </button>
          ) : (
            <p className="status-ok">✔ Google Connected</p>
          )}
          {!isGithubLoggedIn ? (
            <button
              onClick={() => handleLoginClick("github")}
              className="login-button"
            >
              Login with GitHub
            </button>
          ) : (
            <p className="status-ok">✔ GitHub Connected</p>
          )}
          {(isGoogleLoggedIn || isGithubLoggedIn) && (
            <button
              onClick={handleLogout}
              className="logout-button"
              style={{ marginLeft: "10px", backgroundColor: "#dc3545" }}
            >
              Logout
            </button>
          )}
        </div>
      </header>
      <main className="App-main">
        <div className="action-buttons">
          <button
            onClick={() => handleAction("summarize_page")}
            disabled={!isGoogleLoggedIn || isLoadingAction}
          >
            Summarize Page
          </button>
          <button
            onClick={() => handleAction("draft_email")}
            disabled={!isGoogleLoggedIn || isLoadingAction}
          >
            Draft Email
          </button>
        </div>

        {isLoadingAction && <p>Loading...</p>}
        {error && <p className="error">{error}</p>}
        {summary && <div className="summary-box">{summary}</div>}

        <hr />

        <h2>GitHub Feed</h2>
        {isGithubLoggedIn ? (
          loading ? (
            <p>Loading feed...</p>
          ) : notifications.length > 0 ? (
            <ul className="notification-feed">
              {notifications.map((notif) => (
                <li
                  key={notif.id}
                  className="notification-item"
                  onClick={() => handleNotificationClick(notif)}
                >
                  <p className="message">{notif.message}</p>
                  <p className="meta">
                    {notif.repo} -{" "}
                    {new Date(notif.timestamp.seconds * 1000).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p>No new notifications. Push a commit or open a PR to test.</p>
          )
        ) : (
          <p>Login with GitHub to see your feed.</p>
        )}
      </main>
    </div>
  );
}

export default App;
