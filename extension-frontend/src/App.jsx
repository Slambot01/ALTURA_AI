import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(""); // To show which button is loading
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [draftStatus, setDraftStatus] = useState(""); // For the draft success message

  useEffect(() => {
    chrome.runtime.sendMessage({ action: "check_auth_status" });
    chrome.storage.local.get(["isLoggedIn"], (result) => {
      if (result.isLoggedIn) setIsLoggedIn(true);
    });
    const handleStorageChange = (changes, area) => {
      if (area === "local" && changes.isLoggedIn) {
        setIsLoggedIn(changes.isLoggedIn.newValue);
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const handleSummarizeClick = () => {
    setIsLoading(true);
    setLoadingAction("summarize");
    setSummary("");
    setError(null);
    setDraftStatus("");
    chrome.runtime.sendMessage({ action: "summarize_page" }, (response) => {
      setIsLoading(false);
      setLoadingAction("");
      if (response.error) setError(response.error);
      else if (response.summary) setSummary(response.summary);
    });
  };

  // NEW: Function to handle drafting an email
  const handleDraftEmailClick = () => {
    setIsLoading(true);
    setLoadingAction("draft");
    setSummary("");
    setError(null);
    setDraftStatus("");
    chrome.runtime.sendMessage({ action: "draft_email" }, (response) => {
      setIsLoading(false);
      setLoadingAction("");
      if (response.error) setError(response.error);
      else if (response.success) setDraftStatus(response.message);
    });
  };

  const handleLoginClick = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/auth/google");
      const data = await response.json();
      if (data.url) chrome.tabs.create({ url: data.url });
    } catch (e) {
      setError("Could not connect to the login service.");
    }
  };

  const handleLogoutClick = () => {
    chrome.storage.local.set({ isLoggedIn: false });
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>AlturaAI</h1>
        {isLoggedIn ? (
          <div>
            <p className="welcome-message">Welcome!</p>
            <button onClick={handleLogoutClick} className="logout-button">
              Logout
            </button>
          </div>
        ) : (
          <button onClick={handleLoginClick} className="login-button">
            Login with Google
          </button>
        )}
      </header>
      <main className="App-main">
        <div className="action-buttons">
          <button
            onClick={handleSummarizeClick}
            disabled={isLoading || !isLoggedIn}
          >
            {isLoading && loadingAction === "summarize"
              ? "Summarizing..."
              : "Summarize Page"}
          </button>
          <button
            onClick={handleDraftEmailClick}
            disabled={isLoading || !isLoggedIn}
          >
            {isLoading && loadingAction === "draft"
              ? "Drafting..."
              : "Draft Email"}
          </button>
        </div>

        {draftStatus && <p className="success-message">{draftStatus}</p>}
        {summary && (
          <div className="summary-container">
            <h3>Summary</h3>
            <p className="summary-text">{summary}</p>
          </div>
        )}
        {error && (
          <p className="error-message" style={{ color: "red" }}>
            {error}
          </p>
        )}
      </main>
    </div>
  );
}

export default App;
