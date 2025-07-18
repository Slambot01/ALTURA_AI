import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import "./App.css";

// --- Add your Firebase project's configuration here ---
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function App() {
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false);
  const [isGithubLoggedIn, setIsGithubLoggedIn] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [isLoadingAction, setIsLoadingAction] = useState(false);

  // **NEW:** State for the PR review modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewContent, setReviewContent] = useState("");
  const [isReviewLoading, setIsReviewLoading] = useState(false);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!isGithubLoggedIn) {
      setLoading(false);
      setNotifications([]);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, "notifications"),
      orderBy("timestamp", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const newNotifications = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setNotifications(newNotifications);
        setLoading(false);
      },
      (err) => {
        setError("Could not connect to Firestore for notifications.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [isGithubLoggedIn]);

  const handleLoginClick = (service) => {
    const url = `http://localhost:3001/api/auth/${service}`;
    if (service === "github") {
      window.location.href = url; // Redirect for GitHub
    } else {
      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (data.url) chrome.tabs.create({ url: data.url });
        })
        .catch(() =>
          setError(`Could not connect to the ${service} login service.`)
        );
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

  // **NEW:** Function to handle PR Review request
  const handleReviewPR = async (prUrl) => {
    setIsReviewLoading(true);
    setIsReviewModalOpen(true);
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
    if (
      notification.type === "pull_request" &&
      notification.action === "opened"
    ) {
      handleReviewPR(notification.url);
    } else {
      window.open(notification.url, "_blank");
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
                  className={`notification-item ${
                    notif.type === "pull_request" && notif.action === "opened"
                      ? "clickable"
                      : ""
                  }`}
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

      {/* **NEW:** PR Review Modal */}
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
