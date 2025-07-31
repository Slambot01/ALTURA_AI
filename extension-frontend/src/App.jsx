import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import {
  Bell,
  Search,
  TrendingUp,
  GitBranch,
  FileText,
  Bot,
  Settings,
  CheckCircle,
  Code,
  DollarSign,
  Calendar,
  Mail,
  Youtube,
  BookOpen,
  LogOut,
  X,
  Package,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

import "./App.css";

// --- Firebase Configuration ---
// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const GoogleIcon = () => (
  <svg
    className="login-icon"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    width="20px"
    height="20px"
  >
    <path
      fill="#FFC107"
      d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
    />
    <path
      fill="#FF3D00"
      d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
    />
    <path
      fill="#4CAF50"
      d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
    />
    <path
      fill="#1976D2"
      d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.082,5.571l6.19,5.238C39.999,35.931,44,30.417,44,24C44,22.659,43.862,21.35,43.611,20.083z"
    />
  </svg>
);

const GithubIcon = () => (
  <svg
    className="login-icon"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    width="20px"
    height="20px"
  >
    <path
      fill="currentColor"
      d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
    />
  </svg>
);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function App() {
  // --- Main State Management (UNCHANGED) ---
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
  const [meetingSlots, setMeetingSlots] = useState([]);
  const [isFindingTimes, setIsFindingTimes] = useState(false);
  const [researchTopic, setResearchTopic] = useState("");
  const [researchTasks, setResearchTasks] = useState([]);
  const [isResearching, setIsResearching] = useState(false);
  const [orders, setOrders] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState(null);
  const [snippets, setSnippets] = useState([]);
  const [stockTicker, setStockTicker] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [stockAlerts, setStockAlerts] = useState([]);
  const [isSettingAlert, setIsSettingAlert] = useState(false);
  const [composeRequest, setComposeRequest] = useState("");
  const [composedText, setComposedText] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  // --- NEW State for UI Visibility ---
  const [expandedTasks, setExpandedTasks] = useState({});
  const [isGithubFeedVisible, setIsGithubFeedVisible] = useState(false);
  const [isSnippetsVisible, setIsSnippetsVisible] = useState(false);
  const [isOrdersVisible, setIsOrdersVisible] = useState(false);
  const [isResearchTasksVisible, setIsResearchTasksVisible] = useState(false);
  const [isStockAlertsVisible, setIsStockAlertsVisible] = useState(false);

  const isExtension =
    typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;

  // --- NEW: Helper function to toggle individual task expansion ---
  const toggleTaskExpansion = (taskId) => {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  // --- Helper function to reset UI states (UNCHANGED) ---
  const resetActionStates = () => {
    setSummary("");
    setError("");
    setActionStatus("");
    setMeetingSlots([]);
    setComposedText("");
  };

  // --- ALL EFFECTS (UNCHANGED) ---
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
          if (changes.isGoogleLoggedIn) {
            setIsGoogleLoggedIn(!!changes.isGoogleLoggedIn.newValue);
          }
          if (changes.isGithubLoggedIn) {
            setIsGithubLoggedIn(!!changes.isGithubLoggedIn.newValue);
          }
        }
      };
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }
  }, [isExtension]);

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
        // App.jsx inside the fetchNotifications function

        const data = await response.json();
        const githubNotifications = data.filter(
          (notif) => notif.type !== "stock"
        ); // <-- ADD THIS
        setNotifications(githubNotifications); // <-- MODIFY THIS
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

  useEffect(() => {
    const q = query(
      collection(db, "research_tasks"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasks = [];
      querySnapshot.forEach((doc) => {
        tasks.push({ id: doc.id, ...doc.data() });
      });
      setResearchTasks(tasks);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isGoogleLoggedIn) {
      setOrders([]);
      return;
    }
    const q = query(collection(db, "orders"), orderBy("scannedAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedOrders = [];
      querySnapshot.forEach((doc) => {
        fetchedOrders.push({ id: doc.id, ...doc.data() });
      });
      setOrders(fetchedOrders);
    });
    return () => unsubscribe();
  }, [isGoogleLoggedIn]);

  useEffect(() => {
    const q = query(collection(db, "snippets"), orderBy("savedAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedSnippets = [];
        querySnapshot.forEach((doc) => {
          fetchedSnippets.push({ id: doc.id, ...doc.data() });
        });
        setSnippets(fetchedSnippets);
      },
      (error) => {
        console.error("Error listening to snippets:", error);
        setError("Failed to load snippets from the database.");
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "stock_alerts"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const alerts = [];
      querySnapshot.forEach((doc) => {
        alerts.push({ id: doc.id, ...doc.data() });
      });
      setStockAlerts(alerts);
    });
    return () => unsubscribe();
  }, []);
  useEffect(() => {
    if (actionStatus) {
      const timer = setTimeout(() => {
        setActionStatus("");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [actionStatus]);

  // --- ALL ACTION HANDLERS (UNCHANGED) ---
  const handleLoginClick = async (service) => {
    try {
      const response = await fetch(`http://localhost:3001/api/auth/${service}`);
      const data = await response.json();
      if (data.url) {
        chrome.tabs.create({ url: data.url });
        window.close();
      }
    } catch (e) {
      setError(`Could not connect to the ${service} login service.`);
    }
  };

  const handleAction = (action, actionName) => {
    setIsLoadingAction(true);
    setLoadingActionName(actionName);
    resetActionStates();

    chrome.runtime.sendMessage({ action }, (response) => {
      if (response && response.error) {
        setError(response.error);
      } else if (response && response.summary) {
        setSummary(response.summary);
      } else if (response && response.message) {
        setActionStatus(response.message);
      } else {
        setError("Received an unexpected response from the backend.");
      }
      setIsLoadingAction(false);
      setLoadingActionName("");
    });
  };

  const handleCompose = () => {
    if (!composeRequest.trim()) {
      setError("Please enter a request for the composer.");
      return;
    }
    setIsComposing(true);
    resetActionStates();

    chrome.runtime.sendMessage(
      {
        action: "compose_content",
        userRequest: composeRequest,
      },
      (response) => {
        if (response && response.error) {
          setError(response.error);
        } else if (response && response.composedText) {
          setComposedText(response.composedText);
        } else {
          setError("Received an unexpected response from the composer.");
        }
        setIsComposing(false);
      }
    );
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
        resetActionStates();
        setNotifications([]);
      } else {
        const data = await response.json();
        throw new Error(data.error || "Logout failed");
      }
    } catch (err) {
      setError(`Logout failed: ${err.message}`);
    }
  };

  const handleFindMeetingTimes = async () => {
    setIsFindingTimes(true);
    resetActionStates();
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
      const freeSlots = findFreeSlots(data.busyTimes);
      setMeetingSlots(freeSlots);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsFindingTimes(false);
    }
  };

  const findFreeSlots = (busyTimes) => {
    const freeSlots = [];
    const now = new Date();
    const endOfWeek = new Date();
    endOfWeek.setDate(now.getDate() + 7);
    let currentTime = new Date(now);
    currentTime.setMinutes(0, 0, 0);
    currentTime.setHours(currentTime.getHours() + 1);

    while (currentTime < endOfWeek && freeSlots.length < 10) {
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
          if (currentTime < busyEnd && slotEnd > busyStart) {
            isBusy = true;
            break;
          }
        }
        if (!isBusy) {
          freeSlots.push(new Date(currentTime));
        }
      }
      currentTime.setHours(currentTime.getHours() + 1);
      if (currentTime.getHours() >= 17) {
        currentTime.setDate(currentTime.getDate() + 1);
        currentTime.setHours(9, 0, 0, 0);
      }
    }
    return freeSlots;
  };

  const handleStartResearch = async () => {
    if (!researchTopic.trim()) {
      setError("Please enter a research topic.");
      return;
    }
    setIsResearching(true);
    resetActionStates();
    try {
      const response = await fetch("http://localhost:3001/api/research/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: researchTopic }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to start research.");
      }
      setActionStatus(data.message);
      setResearchTopic("");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsResearching(false);
    }
  };

  const handleScanOrders = async () => {
    setIsScanning(true);
    resetActionStates();
    try {
      const response = await fetch(
        "http://localhost:3001/api/orders/scan-inbox",
        {
          method: "POST",
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to scan for orders.");
      }
      setActionStatus(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleStartTracking = async (order) => {
    setTrackingOrderId(order.id);
    resetActionStates();
    try {
      const response = await fetch(
        "http://localhost:3001/api/orders/add-tracking",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            trackingNumber: order.trackingNumber,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to start tracking.");
      }
      setActionStatus(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setTrackingOrderId(null);
    }
  };

  const handleSetStockAlert = async () => {
    if (!stockTicker.trim() || !targetPrice.trim()) {
      setError("Please enter a stock ticker and a target price.");
      return;
    }
    setIsSettingAlert(true);
    resetActionStates();
    try {
      const response = await fetch(
        "http://localhost:3001/api/stocks/add-alert",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker: stockTicker,
            targetPrice: targetPrice,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to set alert.");
      }
      setActionStatus(data.message);
      setStockTicker("");
      setTargetPrice("");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSettingAlert(false);
    }
  };
  // App.jsx

  // ADD THIS ENTIRE FUNCTION
  const handleDeleteStockAlert = async (alertId) => {
    // Prevent accidental clicks while another action is in progress
    if (isLoadingAction) return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/stocks/alert/${alertId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete the alert.");
      }

      // The UI will update automatically because of the onSnapshot listener.
      // We can optionally show a success message.
      setActionStatus("Stock alert removed.");
    } catch (err) {
      setError(err.message);
    }
  };

  // --- NEW JSX STRUCTURE with Collapsible Logic ---
  return (
    <div className="container">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-text">AlturaAI</span>
          </div>
          <div className="auth-sec">
            {isGoogleLoggedIn ? (
              <div className="status-indicator-green">
                <div className="status-dot animate-pulse"></div>
                <GoogleIcon />
                <span>Google</span>
              </div>
            ) : (
              <button
                className="btn-login"
                onClick={() => handleLoginClick("google")}
              >
                <GoogleIcon />
                <span>Login</span>
              </button>
            )}
            {isGithubLoggedIn ? (
              <div className="status-indicator-green">
                <div className="status-dot animate-pulse"></div>
                <GithubIcon />
                <span>Github</span>
              </div>
            ) : (
              <button
                className="btn-login"
                onClick={() => handleLoginClick("github")}
              >
                <GithubIcon />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
        <div className="header-right">
          {(isGoogleLoggedIn || isGithubLoggedIn) && (
            <LogOut
              className="icon-btn"
              onClick={handleLogout}
              title="Logout"
            />
          )}
        </div>
      </header>

      {/* Main Grid */}
      <div className="main-grid">
        {/* Left Column */}
        <div className="grid-column">
          <div className="card">
            <h3 className="card-title">
              <Bot className="title-icon" />
              AI Content Composer
            </h3>
            <div className="card-content">
              <textarea
                placeholder="Write a LinkedIn post about this..."
                className="input-textarea"
                value={composeRequest}
                onChange={(e) => setComposeRequest(e.target.value)}
                disabled={isComposing}
              />
              <button
                className="btn btn-primary"
                onClick={handleCompose}
                disabled={isComposing}
              >
                {isComposing ? "Generating..." : "Generate"}
              </button>
              {composedText && <pre className="result-box">{composedText}</pre>}
            </div>
          </div>

          <div className="card">
            <div className="card-title-wrapper">
              <h3 className="card-title">
                <Search className="title-icon text-green" /> Asynchronous
                Research
              </h3>
              <button
                className="card-title-toggle"
                onClick={() => setIsResearchTasksVisible((p) => !p)}
              >
                {isResearchTasksVisible ? <ChevronUp /> : <ChevronDown />}
              </button>
            </div>
            <div className="card-content">
              <input
                type="text"
                placeholder="Enter a topic to research..."
                className="input-field"
                value={researchTopic}
                onChange={(e) => setResearchTopic(e.target.value)}
                disabled={isResearching}
              />
              <button
                className="btn btn-secondary"
                onClick={handleStartResearch}
                disabled={isResearching}
              >
                {isResearching ? "Starting..." : "Start Research"}
              </button>
            </div>
            {isResearchTasksVisible && (
              <div className="task-list">
                <h4 className="list-subtitle">
                  <FileText className="subtitle-icon" /> Research Tasks
                </h4>
                {researchTasks.length > 0 ? (
                  researchTasks.map((task) => {
                    const isExpanded = !!expandedTasks[task.id];
                    const isLongText = task.result && task.result.length > 150;
                    return (
                      <div key={task.id} className="list-item">
                        <div className="list-item-header">
                          <h5 className="list-item-title">{task.topic}</h5>
                          {task.status === "completed" ? (
                            <CheckCircle className="icon-status-success" />
                          ) : task.status === "in-progress" ? (
                            <div className="status-dot-yellow animate-pulse" />
                          ) : null}
                        </div>
                        {task.status === "completed" && (
                          <>
                            <p className="list-item-summary">
                              {isLongText && !isExpanded
                                ? `${task.result.substring(0, 150)}...`
                                : task.result}
                            </p>
                            {isLongText && (
                              <button
                                className="btn-show-more"
                                onClick={() => toggleTaskExpansion(task.id)}
                              >
                                {isExpanded ? "Show less" : "Show more"}
                              </button>
                            )}
                          </>
                        )}
                        {task.status === "failed" && (
                          <p className="list-item-summary text-red">
                            {task.error}
                          </p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="empty-state">No research tasks initiated.</p>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="card-title">Quick Actions</h3>
            <div className="quick-actions-grid">
              <button
                className="btn btn-tertiary"
                onClick={() => handleAction("summarize_page", "Summarize")}
                disabled={isLoadingAction}
              >
                <FileText className="btn-icon" />
                <span>
                  {isLoadingAction && loadingActionName === "Summarize"
                    ? "..."
                    : "Summarize Page"}
                </span>
              </button>
              <button
                className="btn btn-tertiary"
                onClick={() => handleAction("draft_email", "Draft")}
                disabled={!isGoogleLoggedIn || isLoadingAction}
              >
                <Mail className="btn-icon" />
                <span>
                  {isLoadingAction && loadingActionName === "Draft"
                    ? "..."
                    : "Draft Email"}
                </span>
              </button>
              <button
                className="btn btn-tertiary"
                onClick={() => handleAction("create_notion_doc", "Notion")}
                disabled={isLoadingAction}
              >
                <BookOpen className="btn-icon" />
                <span>
                  {isLoadingAction && loadingActionName === "Notion"
                    ? "..."
                    : "Notion Doc"}
                </span>
              </button>
              <button
                className="btn btn-tertiary"
                onClick={handleFindMeetingTimes}
                disabled={!isGoogleLoggedIn || isFindingTimes}
              >
                <Calendar className="btn-icon" />
                <span>{isFindingTimes ? "..." : "Meeting Times"}</span>
              </button>
            </div>
            {/* <button
              className="btn btn-tertiary full-width"
              onClick={() => handleAction("summarize_youtube_video", "YouTube")}
              disabled={isLoadingAction}
            >
              <Youtube className="btn-icon" />
              <span>
                {isLoadingAction && loadingActionName === "YouTube"
                  ? "Summarizing..."
                  : "Summarize YouTube Video"}
              </span>
            </button> */}
            {summary && <div className="result-box">{summary}</div>}
            {meetingSlots.length > 0 && (
              <div className="result-box">
                <strong>Available Times:</strong>
                <ul>
                  {meetingSlots.map((slot, i) => (
                    <li key={i}>{slot.toLocaleString()}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Middle Column */}
        <div className="grid-column">
          <div className="card">
            <div className="card-title-wrapper">
              <h3 className="card-title">
                <GitBranch className="title-icon text-purple" /> GitHub Feed
              </h3>
              <button
                className="card-title-toggle"
                onClick={() => setIsGithubFeedVisible((p) => !p)}
              >
                {isGithubFeedVisible ? <ChevronUp /> : <ChevronDown />}
              </button>
            </div>
            {isGithubFeedVisible && (
              <div className="card-content">
                {isGithubLoggedIn ? (
                  loading ? (
                    <p className="empty-state">Loading feed...</p>
                  ) : notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className="list-item interactive"
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <div className="list-item-content-icon">
                          <div className="list-icon-wrapper-purple">
                            <Code className="list-icon" />
                          </div>
                          <div>
                            <p className="list-item-summary">{notif.message}</p>
                            <p className="list-item-meta">
                              {notif.repo} •{" "}
                              {new Date(
                                notif.timestamp.seconds * 1000
                              ).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="empty-state">
                      No notifications. Push a commit or open a PR.
                    </p>
                  )
                ) : (
                  <p className="empty-state">
                    Login with GitHub to see your feed.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title-wrapper">
              <h3 className="card-title">
                <Code className="title-icon text-cyan" /> My Snippets
              </h3>
              <button
                className="card-title-toggle"
                onClick={() => setIsSnippetsVisible((p) => !p)}
              >
                {isSnippetsVisible ? <ChevronUp /> : <ChevronDown />}
              </button>
            </div>
            {isSnippetsVisible && (
              <div className="card-content">
                {snippets.length > 0 ? (
                  snippets.map((snippet) => (
                    <div key={snippet.id} className="list-item">
                      <div className="list-item-header">
                        <a
                          href={snippet.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="list-item-title"
                        >
                          {snippet.text}
                        </a>
                        <span className="tag-cyan">
                          {new URL(snippet.url).hostname}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">
                    No snippets saved. Highlight text and right-click to save.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title-wrapper">
              <h3 className="card-title">
                <Package className="title-icon" /> Recent Orders
              </h3>
              <button
                className="card-title-toggle"
                onClick={() => setIsOrdersVisible((p) => !p)}
              >
                {isOrdersVisible ? <ChevronUp /> : <ChevronDown />}
              </button>
            </div>
            {isOrdersVisible && (
              <div className="card-content">
                <button
                  className="btn btn-secondary full-width"
                  onClick={handleScanOrders}
                  disabled={!isGoogleLoggedIn || isScanning}
                >
                  {isScanning ? "Scanning Gmail..." : "Scan for New Orders"}
                </button>
                <div className="task-list">
                  {isGoogleLoggedIn ? (
                    orders.length > 0 ? (
                      orders.map((order) => (
                        <div key={order.id} className="list-item">
                          <p className="list-item-title">{order.itemName}</p>
                          <p className="list-item-meta">
                            ETA: {order.eta} • Tracking: {order.trackingNumber}
                          </p>
                          {order.status && (
                            <p className="list-item-meta">
                              Status: {order.status}
                            </p>
                          )}
                          {order.trackingNumber &&
                            order.trackingNumber !== "N/A" &&
                            !order.aftershipTrackingId && (
                              <button
                                className="btn-track"
                                onClick={() => handleStartTracking(order)}
                                disabled={trackingOrderId === order.id}
                              >
                                {trackingOrderId === order.id
                                  ? "Starting..."
                                  : "Start Live Tracking"}
                              </button>
                            )}
                        </div>
                      ))
                    ) : (
                      <p className="empty-state">No orders found yet.</p>
                    )
                  ) : (
                    <p className="empty-state">
                      Login with Google to track your orders.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="grid-column">
          <div className="card">
            <h3 className="card-title">
              <TrendingUp className="title-icon text-green" /> Stock Price
              Monitor
            </h3>
            <div className="card-content">
              <input
                type="text"
                placeholder="e.g. GOOGL"
                className="input-field"
                value={stockTicker}
                onChange={(e) => setStockTicker(e.target.value.toUpperCase())}
                disabled={isSettingAlert}
              />
              <input
                type="number"
                placeholder="Target Price"
                className="input-field"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                disabled={isSettingAlert}
              />
              <button
                className="btn btn-secondary"
                onClick={handleSetStockAlert}
                disabled={isSettingAlert}
              >
                {isSettingAlert ? "Setting..." : "Set Alert"}
              </button>
            </div>
            <div className="task-list">
              <h4 className="list-subtitle">Active Alerts</h4>
              {stockAlerts.length > 0 ? (
                stockAlerts.map((alert) => (
                  <div key={alert.id} className={`active-alert-item ...`}>
                    <span>
                      {alert.ticker} > ${alert.targetPrice}
                    </span>
                    <span>({alert.status})</span>
                    {/* ADD THIS BUTTON */}
                    <button
                      className="btn-icon-delete"
                      onClick={() => handleDeleteStockAlert(alert.id)}
                      title="Delete this alert"
                    >
                      <X size={16} />
                    </button>
                    {/* END OF ADDED BUTTON */}
                  </div>
                ))
              ) : (
                <p className="empty-state">No active stock alerts.</p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-title-wrapper">
              <h3 className="card-title">
                <DollarSign className="title-icon text-yellow" /> Stock Alerts
              </h3>
              <button
                className="card-title-toggle"
                onClick={() => setIsStockAlertsVisible((p) => !p)}
              >
                {isStockAlertsVisible ? <ChevronUp /> : <ChevronDown />}
              </button>
            </div>
            {isStockAlertsVisible && (
              <div className="card-content">
                {stockAlerts.filter((a) => a.status === "triggered").length >
                0 ? (
                  stockAlerts
                    .filter((a) => a.status === "triggered")
                    .map((alert) => (
                      <div key={alert.id} className="list-item-success">
                        <div className="list-item-content-icon">
                          <div className="list-icon-wrapper-green">
                            <TrendingUp className="list-icon" />
                          </div>
                          <div>
                            <p className="list-item-title">
                              📈 {alert.ticker} reached target of $
                              {alert.targetPrice}!
                            </p>
                            <p className="list-item-summary-green">
                              Current price: $
                              {alert.currentPrice || "Fetching..."}
                            </p>
                            <p className="list-item-meta">
                              {new Date(
                                alert.createdAt.seconds * 1000
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="empty-state">No triggered alerts.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Messages */}
      {error && <div className="global-message error-message">{error}</div>}
      {actionStatus && (
        <div className="global-message success-message">{actionStatus}</div>
      )}

      {/* PR Review Modal */}
      {isReviewModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button
              className="modal-close"
              onClick={() => setIsReviewModalOpen(false)}
            >
              <X />
            </button>
            <h2 className="card-title">AI Pull Request Review</h2>
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
