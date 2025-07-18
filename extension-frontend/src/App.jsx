// import React, { useState, useEffect } from "react";
// import "./App.css";

// function App() {
//   const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false);
//   const [isGithubLoggedIn, setIsGithubLoggedIn] = useState(false);
//   const [notifications, setNotifications] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [summary, setSummary] = useState("");
//   const [isLoadingAction, setIsLoadingAction] = useState(false);

//   const isExtension =
//     typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;

//   // This useEffect handles checking auth status
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
//     }
//   }, []);

//   // This useEffect securely fetches notifications from the backend
//   useEffect(() => {
//     if (!isGithubLoggedIn) {
//       setLoading(false);
//       setNotifications([]);
//       return;
//     }

//     const fetchNotifications = async () => {
//       setLoading(true);
//       try {
//         const response = await fetch("http://localhost:3001/api/notifications");
//         if (!response.ok) {
//           throw new Error("Failed to fetch notifications from the server.");
//         }
//         const data = await response.json();
//         setNotifications(data);
//       } catch (err) {
//         setError("Could not connect to the notification service.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchNotifications();

//     const intervalId = setInterval(fetchNotifications, 30000);
//     return () => clearInterval(intervalId);
//   }, [isGithubLoggedIn]);

//   const handleLoginClick = async (service) => {
//     try {
//       const response = await fetch(`http://localhost:3001/api/auth/${service}`);
//       const data = await response.json();
//       if (data.url) {
//         chrome.tabs.create({ url: data.url });
//       }
//     } catch (e) {
//       setError(`Could not connect to the ${service} login service.`);
//     }
//   };

//   const handleAction = (action) => {
//     setIsLoadingAction(true);
//     setSummary("");
//     setError("");
//     chrome.runtime.sendMessage({ action }, (response) => {
//       if (response.error) setError(response.error);
//       else if (response.summary) setSummary(response.summary);
//       else if (response.message) setSummary(response.message);
//       setIsLoadingAction(false);
//     });
//   };

//   const handleNotificationClick = (notification) => {
//     if (notification.url) {
//       chrome.tabs.create({ url: notification.url });
//     }
//   };

//   // NEW: Updated logout handler to call the backend
//   const handleLogout = async () => {
//     try {
//       const response = await fetch("http://localhost:3001/api/logout", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//       });
//       const data = await response.json();
//       if (response.ok) {
//         // Clear Chrome storage which will trigger the UI update via the listener
//         chrome.storage.local.set({
//           isGoogleLoggedIn: false,
//           isGithubLoggedIn: false,
//         });
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
//           {(isGoogleLoggedIn || isGithubLoggedIn) && (
//             <button onClick={handleLogout} className="logout-button">
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
//                   className="notification-item"
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

  // This useEffect securely fetches notifications from the backend
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

    const intervalId = setInterval(fetchNotifications, 30000);
    return () => clearInterval(intervalId);
  }, [isGithubLoggedIn]);

  const handleLoginClick = async (service) => {
    try {
      const response = await fetch(`http://localhost:3001/api/auth/${service}`);
      const data = await response.json();
      if (data.url) {
        chrome.tabs.create({ url: data.url });
      }
    } catch (e) {
      setError(`Could not connect to the ${service} login service.`);
    }
  };

  const handleAction = (action) => {
    setIsLoadingAction(true);
    setSummary("");
    setError("");
    chrome.runtime.sendMessage({ action }, (response) => {
      if (response.error) setError(response.error);
      else if (response.summary) setSummary(response.summary);
      else if (response.message) setSummary(response.message);
      setIsLoadingAction(false);
    });
  };

  // NEW: Updated PR Review handler to call the backend
  const handleReviewPR = async (prUrl) => {
    setIsReviewModalOpen(true);
    setIsReviewLoading(true);
    setReviewContent("");
    setError("");

    try {
      const response = await fetch(
        "http://localhost:3001/api/github/pr/review",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prUrl }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        setReviewContent(data.review);
      } else {
        throw new Error(data.error || "Failed to get review.");
      }
    } catch (err) {
      setReviewContent(`Error: ${err.message}`);
    } finally {
      setIsReviewLoading(false);
    }
  };

  const handleNotificationClick = (notification) => {
    // Only trigger the review modal for "opened" pull requests
    if (notification.type === "pr" && notification.message.includes("opened")) {
      handleReviewPR(notification.url);
    } else if (notification.url) {
      chrome.tabs.create({ url: notification.url });
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (response.ok) {
        chrome.storage.local.set({
          isGoogleLoggedIn: false,
          isGithubLoggedIn: false,
        });
      } else {
        throw new Error(data.error || "Logout failed");
      }
    } catch (err) {
      setError(`Logout failed: ${err.message}`);
    }
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
            <button onClick={handleLogout} className="logout-button">
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

      {/* PR Review Modal */}
      {isReviewModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button
              className="modal-close"
              onClick={() => setIsReviewModalOpen(false)}
            >
              X
            </button>
            <h2>AI Pull Request Review</h2>
            {isReviewLoading ? (
              <p>Analyzing code changes...</p>
            ) : (
              <pre className="review-text">{reviewContent}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
