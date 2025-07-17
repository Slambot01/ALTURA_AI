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
    // This function will eventually contain the logic to:
    // 1. Message the background script to get the page content.
    // 2. Send that content to our backend's summarize endpoint.
    // 3. Display the result.

    // For now, we'll just show a placeholder message.
    setSummary("This button will soon summarize the page!");
    setError(null); // Clear previous errors
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>AlturaAI</h1>
        <p>Your AI Copilot</p>
      </header>
      <main className="App-main">
        <button onClick={handleSummarizeClick} disabled={isLoading}>
          {isLoading ? "Summarizing..." : "Summarize Current Page"}
        </button>

        {/* Show a loading message while the summary is being generated */}
        {isLoading && <p>Getting summary...</p>}

        {/* Display the summary once it's available */}
        {summary && (
          <div className="summary-container">
            <h3>Summary</h3>
            <p>{summary}</p>
          </div>
        )}

        {/* Display any errors that occur */}
        {error && <p className="error-message">{error}</p>}
      </main>
    </div>
  );
}

export default App;
