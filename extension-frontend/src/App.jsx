import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // useEffect now actively checks the status when the popup opens.
  useEffect(() => {
    // Immediately ask the background script to check the status.
    chrome.runtime.sendMessage({ action: "check_auth_status" });

    // Check storage immediately when the component loads
    chrome.storage.local.get(["isLoggedIn"], (result) => {
      if (result.isLoggedIn) {
        setIsLoggedIn(true);
      }
    });

    // Set up a listener for any changes in chrome.storage
    const handleStorageChange = (changes, area) => {
      if (area === "local" && changes.isLoggedIn) {
        setIsLoggedIn(changes.isLoggedIn.newValue);
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);

    // Cleanup function
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const handleSummarizeClick = () => {
    // ... (This function remains the same)
    setIsLoading(true);
    setSummary("");
    setError(null);
    chrome.runtime.sendMessage({ action: "summarize_page" }, (response) => {
      setIsLoading(false);
      if (chrome.runtime.lastError || response.error) {
        setError(response?.error || "An error occurred.");
      } else if (response.summary) {
        setSummary(response.summary);
      }
    });
  };

  const handleLoginClick = async () => {
    // ... (This function remains the same)
    try {
      const response = await fetch("http://localhost:3001/api/auth/google");
      const data = await response.json();
      if (data.url) {
        chrome.tabs.create({ url: data.url });
      }
    } catch (e) {
      console.error("Login failed:", e);
      setError("Could not connect to the login service.");
    }
  };

  // NEW: Function to handle logout for debugging
  const handleLogoutClick = () => {
    // Clear the tokens on the backend (we'll build this next)
    // For now, just clear the local storage
    chrome.storage.local.set({ isLoggedIn: false }, () => {
      setIsLoggedIn(false);
      console.log("User logged out.");
    });
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>AlturaAI</h1>
        {isLoggedIn ? (
          <div>
            <p className="welcome-message">Welcome!</p>
            {/* NEW: Logout button for easy testing */}
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
        <button
          onClick={handleSummarizeClick}
          disabled={isLoading || !isLoggedIn}
        >
          {isLoading ? "Summarizing..." : "Summarize Current Page"}
        </button>
        {isLoading && <p>Generating summary, this may take a moment...</p>}
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
