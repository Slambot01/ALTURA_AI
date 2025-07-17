import { useState } from "react";
import "./App.css"; // You can add styles here later

function App() {
  // State to store the generated summary
  const [summary, setSummary] = useState("");
  // State to handle loading status while summarizing
  const [isLoading, setIsLoading] = useState(false);
  // State to store any potential errors
  const [error, setError] = useState(null);

  const handleSummarizeClick = () => {
    setIsLoading(true);
    setSummary("");
    setError(null);

    // Send a message to the background script to start the process
    chrome.runtime.sendMessage({ action: "summarize_page" }, (response) => {
      setIsLoading(false);

      // Check for errors from the background script
      if (chrome.runtime.lastError) {
        console.error(
          "Error from background script:",
          chrome.runtime.lastError.message
        );
        setError("An error occurred. Please try again.");
        return;
      }

      if (response.error) {
        setError(response.error);
      } else if (response.content) {
        // For now, we'll just display the raw text content from the page.
        // Later, we will send this to our backend for summarization.
        setSummary(response.content);
      }
    });
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>AlturaAI</h1>
        <p>Your AI Copilot</p>
      </header>
      <main className="App-main">
        <button onClick={handleSummarizeClick} disabled={isLoading}>
          {isLoading ? "Getting Content..." : "Summarize Current Page"}
        </button>

        {/* Show a loading message while the summary is being generated */}
        {isLoading && <p>Reading page content...</p>}

        {/* Display the summary (or raw content for now) once it's available */}
        {summary && (
          <div className="summary-container">
            <h3>Page Content</h3>
            {/* We use a <textarea> to better display large blocks of text */}
            <textarea readOnly value={summary} rows={10} />
          </div>
        )}

        {/* Display any errors that occur */}
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
