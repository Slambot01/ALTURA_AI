import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false);
  const [isGithubLoggedIn, setIsGithubLoggedIn] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [actionStatus, setActionStatus] = useState("");
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [loadingActionName, setLoadingActionName] = useState("");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewContent, setReviewContent] = useState("");
  const [isReviewLoading, setIsReviewLoading] = useState(false);

  // NEW: State for calendar feature
  const [meetingSlots, setMeetingSlots] = useState([]);
  const [isFindingTimes, setIsFindingTimes] = useState(false);

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
        if (!response.ok) throw new Error("Failed to fetch notifications.");
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

  // --- Action Handlers ---

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

  const handleAction = (action, actionName) => {
    setIsLoadingAction(true);
    setLoadingActionName(actionName);
    setSummary("");
    setError("");
    setActionStatus("");
    chrome.runtime.sendMessage({ action }, (response) => {
      if (response.error) setError(response.error);
      else if (response.summary) setSummary(response.summary);
      else if (response.message) setActionStatus(response.message);
      setIsLoadingAction(false);
      setLoadingActionName("");
    });
  };

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
      if (response.ok) setReviewContent(data.review);
      else throw new Error(data.error || "Failed to get review.");
    } catch (err) {
      setReviewContent(`Error: ${err.message}`);
    } finally {
      setIsReviewLoading(false);
    }
  };

  const handleNotificationClick = (notification) => {
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
      if (response.ok) {
        chrome.storage.local.set({
          isGoogleLoggedIn: false,
          isGithubLoggedIn: false,
        });
      } else {
        const data = await response.json();
        throw new Error(data.error || "Logout failed");
      }
    } catch (err) {
      setError(`Logout failed: ${err.message}`);
    }
  };

  // --- NEW: Calendar Handler ---
  const handleFindMeetingTimes = async () => {
    setIsFindingTimes(true);
    setMeetingSlots([]);
    setError("");
    setActionStatus("");
    setSummary("");
    try {
      const response = await fetch(
        "http://localhost:3001/api/calendar/find-times",
        {
          method: "POST",
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to get calendar data.");
      }

      // Process busy times to find free slots
      const freeSlots = findFreeSlots(data.busyTimes);
      setMeetingSlots(freeSlots);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsFindingTimes(false);
    }
  };

  // --- Helper Function to Find Free Slots ---
  const findFreeSlots = (busyTimes) => {
    const freeSlots = [];
    const now = new Date();
    const endOfWeek = new Date();
    endOfWeek.setDate(now.getDate() + 7);

    let currentTime = new Date(now);

    // Start from the next round hour
    currentTime.setMinutes(0, 0, 0);
    currentTime.setHours(currentTime.getHours() + 1);

    while (currentTime < endOfWeek && freeSlots.length < 10) {
      // Only consider working hours (e.g., 9 AM to 5 PM) and weekdays (Monday=1 to Friday=5)
      const dayOfWeek = currentTime.getDay();
      if (
        currentTime.getHours() >= 9 &&
        currentTime.getHours() < 17 &&
        dayOfWeek > 0 &&
        dayOfWeek < 6
      ) {
        const slotEnd = new Date(currentTime);
        slotEnd.setHours(slotEnd.getHours() + 1);

        let isBusy = false;
        for (const busy of busyTimes) {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          // Check for overlap
          if (currentTime < busyEnd && slotEnd > busyStart) {
            isBusy = true;
            break;
          }
        }

        if (!isBusy) {
          freeSlots.push(new Date(currentTime));
        }
      }
      // Move to the next hour
      currentTime.setHours(currentTime.getHours() + 1);

      // If it's the end of the workday, jump to the next morning
      if (currentTime.getHours() >= 17) {
        currentTime.setDate(currentTime.getDate() + 1);
        currentTime.setHours(9, 0, 0, 0);
      }
    }
    return freeSlots; // Return up to 10 available slots
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
            onClick={() => handleAction("summarize_page", "Summarize")}
            disabled={isLoadingAction}
          >
            {isLoadingAction && loadingActionName === "Summarize"
              ? "Summarizing..."
              : "Summarize Page"}
          </button>
          <button
            onClick={() => handleAction("draft_email", "Draft")}
            disabled={!isGoogleLoggedIn || isLoadingAction}
          >
            {isLoadingAction && loadingActionName === "Draft"
              ? "Drafting..."
              : "Draft Email"}
          </button>
          <button
            onClick={() => handleAction("create_notion_doc", "Notion")}
            disabled={isLoadingAction}
          >
            {isLoadingAction && loadingActionName === "Notion"
              ? "Creating..."
              : "Create Notion Doc"}
          </button>
          <button
            onClick={handleFindMeetingTimes}
            disabled={!isGoogleLoggedIn || isFindingTimes}
          >
            {isFindingTimes ? "Finding Times..." : "Find Meeting Times"}
          </button>
        </div>

        {actionStatus && <p className="success-message">{actionStatus}</p>}
        {summary && <div className="summary-box">{summary}</div>}
        {error && <p className="error">{error}</p>}

        {meetingSlots.length > 0 && (
          <div className="results-container">
            <h3>Available Meeting Times:</h3>
            <ul className="slots-list">
              {meetingSlots.map((slot, index) => (
                <li key={index}>{slot.toLocaleString()}</li>
              ))}
            </ul>
          </div>
        )}

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
