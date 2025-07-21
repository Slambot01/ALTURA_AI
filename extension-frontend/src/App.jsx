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

// // --- Firebase Configuration ---
// // IMPORTANT: Replace these placeholder values with your actual Firebase project's configuration.
// const firebaseConfig = {
//   apiKey: "AIzaSyCKzR8anjdxGdBdmvwWIbK7Njp87XQbGF0",
//   authDomain: "alturaai.firebaseapp.com",
//   projectId: "alturaai",
//   storageBucket: "alturaai.firebasestorage.app",
//   messagingSenderId: "296537793338",
//   appId: "1:296537793338:web:00814e384e648d4cc46603",
// };

// // Initialize Firebase for the frontend
// const app = initializeApp(firebaseConfig);
// const db = getFirestore(app);

// function App() {
//   // --- Main State Management ---
//   const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false);
//   const [isGithubLoggedIn, setIsGithubLoggedIn] = useState(false);
//   const [notifications, setNotifications] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [summary, setSummary] = useState("");
//   const [actionStatus, setActionStatus] = useState("");
//   const [isLoadingAction, setIsLoadingAction] = useState(false);
//   const [loadingActionName, setLoadingActionName] = useState("");
//   const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
//   const [reviewContent, setReviewContent] = useState("");
//   const [isReviewLoading, setIsReviewLoading] = useState(false);
//   const [meetingSlots, setMeetingSlots] = useState([]);
//   const [isFindingTimes, setIsFindingTimes] = useState(false);
//   const [researchTopic, setResearchTopic] = useState("");
//   const [researchTasks, setResearchTasks] = useState([]);
//   const [isResearching, setIsResearching] = useState(false);
//   const [orders, setOrders] = useState([]);
//   const [isScanning, setIsScanning] = useState(false);
//   const [trackingOrderId, setTrackingOrderId] = useState(null);

//   const isExtension =
//     typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;

//   // --- Helper function to reset UI states before an action ---
//   const resetActionStates = () => {
//     setSummary("");
//     setError("");
//     setActionStatus("");
//     setMeetingSlots([]);
//   };

//   // --- Effect for Authentication State ---
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
//           if (changes.isGoogleLoggedIn) {
//             setIsGoogleLoggedIn(!!changes.isGoogleLoggedIn.newValue);
//           }
//           if (changes.isGithubLoggedIn) {
//             setIsGithubLoggedIn(!!changes.isGithubLoggedIn.newValue);
//           }
//         }
//       };
//       chrome.storage.onChanged.addListener(handleStorageChange);
//       return () => chrome.storage.onChanged.removeListener(handleStorageChange);
//     }
//   }, [isExtension]);

//   // --- Effect for Fetching GitHub Notifications ---
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
//         if (!response.ok) throw new Error("Failed to fetch notifications.");
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

//   // --- Effect for Listening to Research Tasks ---
//   useEffect(() => {
//     const q = query(
//       collection(db, "research_tasks"),
//       orderBy("createdAt", "desc")
//     );
//     const unsubscribe = onSnapshot(q, (querySnapshot) => {
//       const tasks = [];
//       querySnapshot.forEach((doc) => {
//         tasks.push({ id: doc.id, ...doc.data() });
//       });
//       setResearchTasks(tasks);
//     });
//     return () => unsubscribe();
//   }, []);

//   // --- Effect for Listening to Orders ---
//   useEffect(() => {
//     if (!isGoogleLoggedIn) {
//       setOrders([]);
//       return;
//     }
//     const q = query(collection(db, "orders"), orderBy("scannedAt", "desc"));
//     const unsubscribe = onSnapshot(q, (querySnapshot) => {
//       const fetchedOrders = [];
//       querySnapshot.forEach((doc) => {
//         fetchedOrders.push({ id: doc.id, ...doc.data() });
//       });
//       setOrders(fetchedOrders);
//     });
//     return () => unsubscribe();
//   }, [isGoogleLoggedIn]);

//   // --- Action Handlers ---

//   const handleLoginClick = async (service) => {
//     try {
//       const response = await fetch(`http://localhost:3001/api/auth/${service}`);
//       const data = await response.json();
//       if (data.url) {
//         chrome.tabs.create({ url: data.url });
//         window.close();
//       }
//     } catch (e) {
//       setError(`Could not connect to the ${service} login service.`);
//     }
//   };

//   const handleAction = (action, actionName) => {
//     setIsLoadingAction(true);
//     setLoadingActionName(actionName);
//     resetActionStates();

//     chrome.runtime.sendMessage({ action }, (response) => {
//       if (response && response.error) {
//         setError(response.error);
//       } else if (response && response.summary) {
//         setSummary(response.summary);
//       } else if (response && response.message) {
//         setActionStatus(response.message);
//       } else {
//         setError("Received an unexpected response from the backend.");
//       }
//       setIsLoadingAction(false);
//       setLoadingActionName("");
//     });
//   };

//   const handleReviewPR = async (prUrl) => {
//     setIsReviewModalOpen(true);
//     setIsReviewLoading(true);
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
//       if (response.ok) setReviewContent(data.review);
//       else throw new Error(data.error || "Failed to get review.");
//     } catch (err) {
//       setReviewContent(`Error: ${err.message}`);
//     } finally {
//       setIsReviewLoading(false);
//     }
//   };

//   const handleNotificationClick = (notification) => {
//     if (notification.type === "pr" && notification.message.includes("opened")) {
//       handleReviewPR(notification.url);
//     } else if (notification.url) {
//       chrome.tabs.create({ url: notification.url });
//     }
//   };

//   const handleLogout = async () => {
//     try {
//       const response = await fetch("http://localhost:3001/api/logout", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//       });
//       if (response.ok) {
//         chrome.storage.local.set({
//           isGoogleLoggedIn: false,
//           isGithubLoggedIn: false,
//         });
//         resetActionStates();
//         setNotifications([]);
//       } else {
//         const data = await response.json();
//         throw new Error(data.error || "Logout failed");
//       }
//     } catch (err) {
//       setError(`Logout failed: ${err.message}`);
//     }
//   };

//   const handleFindMeetingTimes = async () => {
//     setIsFindingTimes(true);
//     resetActionStates();
//     try {
//       const response = await fetch(
//         "http://localhost:3001/api/calendar/find-times",
//         {
//           method: "POST",
//         }
//       );
//       const data = await response.json();
//       if (!response.ok) {
//         throw new Error(data.error || "Failed to get calendar data.");
//       }
//       const freeSlots = findFreeSlots(data.busyTimes);
//       setMeetingSlots(freeSlots);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setIsFindingTimes(false);
//     }
//   };

//   const findFreeSlots = (busyTimes) => {
//     const freeSlots = [];
//     const now = new Date();
//     const endOfWeek = new Date();
//     endOfWeek.setDate(now.getDate() + 7);
//     let currentTime = new Date(now);
//     currentTime.setMinutes(0, 0, 0);
//     currentTime.setHours(currentTime.getHours() + 1);

//     while (currentTime < endOfWeek && freeSlots.length < 10) {
//       const dayOfWeek = currentTime.getDay();
//       if (
//         currentTime.getHours() >= 9 &&
//         currentTime.getHours() < 17 &&
//         dayOfWeek > 0 &&
//         dayOfWeek < 6
//       ) {
//         const slotEnd = new Date(currentTime);
//         slotEnd.setHours(slotEnd.getHours() + 1);
//         let isBusy = false;
//         for (const busy of busyTimes) {
//           const busyStart = new Date(busy.start);
//           const busyEnd = new Date(busy.end);
//           if (currentTime < busyEnd && slotEnd > busyStart) {
//             isBusy = true;
//             break;
//           }
//         }
//         if (!isBusy) {
//           freeSlots.push(new Date(currentTime));
//         }
//       }
//       currentTime.setHours(currentTime.getHours() + 1);
//       if (currentTime.getHours() >= 17) {
//         currentTime.setDate(currentTime.getDate() + 1);
//         currentTime.setHours(9, 0, 0, 0);
//       }
//     }
//     return freeSlots;
//   };

//   const handleStartResearch = async () => {
//     if (!researchTopic.trim()) {
//       setError("Please enter a research topic.");
//       return;
//     }
//     setIsResearching(true);
//     resetActionStates();
//     try {
//       const response = await fetch("http://localhost:3001/api/research/start", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ topic: researchTopic }),
//       });
//       const data = await response.json();
//       if (!response.ok) {
//         throw new Error(data.error || "Failed to start research.");
//       }
//       setActionStatus(data.message);
//       setResearchTopic("");
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setIsResearching(false);
//     }
//   };

//   const handleScanOrders = async () => {
//     setIsScanning(true);
//     resetActionStates();
//     try {
//       const response = await fetch(
//         "http://localhost:3001/api/orders/scan-inbox",
//         {
//           method: "POST",
//         }
//       );
//       const data = await response.json();
//       if (!response.ok) {
//         throw new Error(data.error || "Failed to scan for orders.");
//       }
//       setActionStatus(data.message);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setIsScanning(false);
//     }
//   };

//   const handleStartTracking = async (order) => {
//     setTrackingOrderId(order.id);
//     resetActionStates();
//     try {
//       const response = await fetch(
//         "http://localhost:3001/api/orders/add-tracking",
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             orderId: order.id,
//             trackingNumber: order.trackingNumber,
//           }),
//         }
//       );
//       const data = await response.json();
//       if (!response.ok) {
//         throw new Error(data.error || "Failed to start tracking.");
//       }
//       setActionStatus(data.message);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setTrackingOrderId(null);
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
//             onClick={() => handleAction("summarize_page", "Summarize")}
//             disabled={isLoadingAction}
//           >
//             {isLoadingAction && loadingActionName === "Summarize"
//               ? "Summarizing..."
//               : "Summarize Page"}
//           </button>
//           <button
//             onClick={() => handleAction("draft_email", "Draft")}
//             disabled={!isGoogleLoggedIn || isLoadingAction}
//           >
//             {isLoadingAction && loadingActionName === "Draft"
//               ? "Drafting..."
//               : "Draft Email"}
//           </button>
//           <button
//             onClick={() => handleAction("create_notion_doc", "Notion")}
//             disabled={isLoadingAction}
//           >
//             {isLoadingAction && loadingActionName === "Notion"
//               ? "Creating..."
//               : "Create Notion Doc"}
//           </button>
//           <button
//             onClick={handleFindMeetingTimes}
//             disabled={!isGoogleLoggedIn || isFindingTimes}
//           >
//             {isFindingTimes ? "Finding Times..." : "Find Meeting Times"}
//           </button>
//         </div>

//         <div className="research-container">
//           <h3>Asynchronous Research</h3>
//           <div className="research-input-group">
//             <input
//               type="text"
//               value={researchTopic}
//               onChange={(e) => setResearchTopic(e.target.value)}
//               placeholder="Enter a topic to research..."
//               disabled={isResearching}
//             />
//             <button onClick={handleStartResearch} disabled={isResearching}>
//               {isResearching ? "Starting..." : "Start Research"}
//             </button>
//           </div>
//         </div>

//         {actionStatus && <p className="success-message">{actionStatus}</p>}
//         {summary && <div className="summary-box">{summary}</div>}
//         {error && <p className="error">{error}</p>}

//         {meetingSlots.length > 0 && (
//           <div className="results-container">
//             <h3>Available Meeting Times:</h3>
//             <ul className="slots-list">
//               {meetingSlots.map((slot, index) => (
//                 <li key={index}>{slot.toLocaleString()}</li>
//               ))}
//             </ul>
//           </div>
//         )}

//         <hr />

//         <div className="orders-container">
//           <h2>My Orders</h2>
//           <button
//             onClick={handleScanOrders}
//             disabled={!isGoogleLoggedIn || isScanning}
//           >
//             {isScanning ? "Scanning Gmail..." : "Scan for New Orders"}
//           </button>
//           {isGoogleLoggedIn ? (
//             orders.length > 0 ? (
//               <ul className="orders-list">
//                 {orders.map((order) => (
//                   <li key={order.id} className="order-item">
//                     <p>
//                       <strong>Item:</strong> {order.itemName}
//                     </p>
//                     <p>
//                       <strong>ETA:</strong> {order.eta}
//                     </p>
//                     <p>
//                       <strong>Tracking:</strong> {order.trackingNumber}
//                     </p>
//                     {order.status && (
//                       <p>
//                         <strong>Status:</strong> {order.status}
//                       </p>
//                     )}
//                     {order.trackingNumber &&
//                       order.trackingNumber !== "N/A" &&
//                       !order.aftershipTrackingId && (
//                         <button
//                           onClick={() => handleStartTracking(order)}
//                           disabled={trackingOrderId === order.id}
//                           className="track-button"
//                         >
//                           {trackingOrderId === order.id
//                             ? "Starting..."
//                             : "Start Live Tracking"}
//                         </button>
//                       )}
//                   </li>
//                 ))}
//               </ul>
//             ) : (
//               <p>
//                 No orders found yet. Click "Scan for New Orders" to search your
//                 Gmail.
//               </p>
//             )
//           ) : (
//             <p>Login with Google to track your orders.</p>
//           )}
//         </div>

//         <div className="research-tasks-container">
//           <h2>Research Tasks</h2>
//           {researchTasks.length > 0 ? (
//             <ul className="research-list">
//               {researchTasks.map((task) => (
//                 <li
//                   key={task.id}
//                   className={`research-item status-${task.status}`}
//                 >
//                   <div className="task-header">
//                     <strong>{task.topic}</strong>
//                     <span>{task.status}</span>
//                   </div>
//                   {task.status === "completed" && (
//                     <p className="task-result">{task.result}</p>
//                   )}
//                   {task.status === "failed" && (
//                     <p className="task-result error">{task.error}</p>
//                   )}
//                 </li>
//               ))}
//             </ul>
//           ) : (
//             <p>No research tasks yet.</p>
//           )}
//         </div>

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
//     </div>
//   );
// }

// export default App;

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

// // --- Firebase Configuration ---
// // IMPORTANT: Replace these placeholder values with your actual Firebase project's configuration.
// const firebaseConfig = {
//   apiKey: "AIzaSyCKzR8anjdxGdBdmvwWIbK7Njp87XQbGF0",
//   authDomain: "alturaai.firebaseapp.com",
//   projectId: "alturaai",
//   storageBucket: "alturaai.firebasestorage.app",
//   messagingSenderId: "296537793338",
//   appId: "1:296537793338:web:00814e384e648d4cc46603",
// };

// // Initialize Firebase for the frontend
// const app = initializeApp(firebaseConfig);
// const db = getFirestore(app);

// function App() {
//   // --- Main State Management ---
//   const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false);
//   const [isGithubLoggedIn, setIsGithubLoggedIn] = useState(false);
//   const [notifications, setNotifications] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [summary, setSummary] = useState("");
//   const [actionStatus, setActionStatus] = useState("");
//   const [isLoadingAction, setIsLoadingAction] = useState(false);
//   const [loadingActionName, setLoadingActionName] = useState("");
//   const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
//   const [reviewContent, setReviewContent] = useState("");
//   const [isReviewLoading, setIsReviewLoading] = useState(false);
//   const [meetingSlots, setMeetingSlots] = useState([]);
//   const [isFindingTimes, setIsFindingTimes] = useState(false);
//   const [researchTopic, setResearchTopic] = useState("");
//   const [researchTasks, setResearchTasks] = useState([]);
//   const [isResearching, setIsResearching] = useState(false);
//   const [orders, setOrders] = useState([]);
//   const [isScanning, setIsScanning] = useState(false);
//   const [trackingOrderId, setTrackingOrderId] = useState(null);

//   const isExtension =
//     typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;

//   // --- Helper function to reset UI states before an action ---
//   const resetActionStates = () => {
//     setSummary("");
//     setError("");
//     setActionStatus("");
//     setMeetingSlots([]);
//   };

//   // --- Effect for Authentication State ---
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
//           if (changes.isGoogleLoggedIn) {
//             setIsGoogleLoggedIn(!!changes.isGoogleLoggedIn.newValue);
//           }
//           if (changes.isGithubLoggedIn) {
//             setIsGithubLoggedIn(!!changes.isGithubLoggedIn.newValue);
//           }
//         }
//       };
//       chrome.storage.onChanged.addListener(handleStorageChange);
//       return () => chrome.storage.onChanged.removeListener(handleStorageChange);
//     }
//   }, [isExtension]);

//   // --- Effect for Fetching GitHub Notifications ---
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
//         if (!response.ok) throw new Error("Failed to fetch notifications.");
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

//   // --- Effect for Listening to Research Tasks ---
//   useEffect(() => {
//     const q = query(
//       collection(db, "research_tasks"),
//       orderBy("createdAt", "desc")
//     );
//     const unsubscribe = onSnapshot(q, (querySnapshot) => {
//       const tasks = [];
//       querySnapshot.forEach((doc) => {
//         tasks.push({ id: doc.id, ...doc.data() });
//       });
//       setResearchTasks(tasks);
//     });
//     return () => unsubscribe();
//   }, []);

//   // --- Effect for Listening to Orders ---
//   useEffect(() => {
//     if (!isGoogleLoggedIn) {
//       setOrders([]);
//       return;
//     }
//     const q = query(collection(db, "orders"), orderBy("scannedAt", "desc"));
//     const unsubscribe = onSnapshot(q, (querySnapshot) => {
//       const fetchedOrders = [];
//       querySnapshot.forEach((doc) => {
//         fetchedOrders.push({ id: doc.id, ...doc.data() });
//       });
//       setOrders(fetchedOrders);
//     });
//     return () => unsubscribe();
//   }, [isGoogleLoggedIn]);

//   // --- Action Handlers ---

//   const handleLoginClick = async (service) => {
//     try {
//       const response = await fetch(`http://localhost:3001/api/auth/${service}`);
//       const data = await response.json();
//       if (data.url) {
//         chrome.tabs.create({ url: data.url });
//         window.close();
//       }
//     } catch (e) {
//       setError(`Could not connect to the ${service} login service.`);
//     }
//   };

//   const handleAction = (action, actionName) => {
//     setIsLoadingAction(true);
//     setLoadingActionName(actionName);
//     resetActionStates();

//     chrome.runtime.sendMessage({ action }, (response) => {
//       if (response && response.error) {
//         setError(response.error);
//       } else if (response && response.summary) {
//         setSummary(response.summary);
//       } else if (response && response.message) {
//         setActionStatus(response.message);
//       } else {
//         setError("Received an unexpected response from the backend.");
//       }
//       setIsLoadingAction(false);
//       setLoadingActionName("");
//     });
//   };

//   const handleReviewPR = async (prUrl) => {
//     setIsReviewModalOpen(true);
//     setIsReviewLoading(true);
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
//       if (response.ok) setReviewContent(data.review);
//       else throw new Error(data.error || "Failed to get review.");
//     } catch (err) {
//       setReviewContent(`Error: ${err.message}`);
//     } finally {
//       setIsReviewLoading(false);
//     }
//   };

//   const handleNotificationClick = (notification) => {
//     if (notification.type === "pr" && notification.message.includes("opened")) {
//       handleReviewPR(notification.url);
//     } else if (notification.url) {
//       chrome.tabs.create({ url: notification.url });
//     }
//   };

//   const handleLogout = async () => {
//     try {
//       const response = await fetch("http://localhost:3001/api/logout", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//       });
//       if (response.ok) {
//         chrome.storage.local.set({
//           isGoogleLoggedIn: false,
//           isGithubLoggedIn: false,
//         });
//         resetActionStates();
//         setNotifications([]);
//       } else {
//         const data = await response.json();
//         throw new Error(data.error || "Logout failed");
//       }
//     } catch (err) {
//       setError(`Logout failed: ${err.message}`);
//     }
//   };

//   const handleFindMeetingTimes = async () => {
//     setIsFindingTimes(true);
//     resetActionStates();
//     try {
//       const response = await fetch(
//         "http://localhost:3001/api/calendar/find-times",
//         {
//           method: "POST",
//         }
//       );
//       const data = await response.json();
//       if (!response.ok) {
//         throw new Error(data.error || "Failed to get calendar data.");
//       }
//       const freeSlots = findFreeSlots(data.busyTimes);
//       setMeetingSlots(freeSlots);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setIsFindingTimes(false);
//     }
//   };

//   const findFreeSlots = (busyTimes) => {
//     const freeSlots = [];
//     const now = new Date();
//     const endOfWeek = new Date();
//     endOfWeek.setDate(now.getDate() + 7);
//     let currentTime = new Date(now);
//     currentTime.setMinutes(0, 0, 0);
//     currentTime.setHours(currentTime.getHours() + 1);

//     while (currentTime < endOfWeek && freeSlots.length < 10) {
//       const dayOfWeek = currentTime.getDay();
//       if (
//         currentTime.getHours() >= 9 &&
//         currentTime.getHours() < 17 &&
//         dayOfWeek > 0 &&
//         dayOfWeek < 6
//       ) {
//         const slotEnd = new Date(currentTime);
//         slotEnd.setHours(slotEnd.getHours() + 1);
//         let isBusy = false;
//         for (const busy of busyTimes) {
//           const busyStart = new Date(busy.start);
//           const busyEnd = new Date(busy.end);
//           if (currentTime < busyEnd && slotEnd > busyStart) {
//             isBusy = true;
//             break;
//           }
//         }
//         if (!isBusy) {
//           freeSlots.push(new Date(currentTime));
//         }
//       }
//       currentTime.setHours(currentTime.getHours() + 1);
//       if (currentTime.getHours() >= 17) {
//         currentTime.setDate(currentTime.getDate() + 1);
//         currentTime.setHours(9, 0, 0, 0);
//       }
//     }
//     return freeSlots;
//   };

//   const handleStartResearch = async () => {
//     if (!researchTopic.trim()) {
//       setError("Please enter a research topic.");
//       return;
//     }
//     setIsResearching(true);
//     resetActionStates();
//     try {
//       const response = await fetch("http://localhost:3001/api/research/start", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ topic: researchTopic }),
//       });
//       const data = await response.json();
//       if (!response.ok) {
//         throw new Error(data.error || "Failed to start research.");
//       }
//       setActionStatus(data.message);
//       setResearchTopic("");
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setIsResearching(false);
//     }
//   };

//   const handleScanOrders = async () => {
//     setIsScanning(true);
//     resetActionStates();
//     try {
//       const response = await fetch(
//         "http://localhost:3001/api/orders/scan-inbox",
//         {
//           method: "POST",
//         }
//       );
//       const data = await response.json();
//       if (!response.ok) {
//         throw new Error(data.error || "Failed to scan for orders.");
//       }
//       setActionStatus(data.message);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setIsScanning(false);
//     }
//   };

//   const handleStartTracking = async (order) => {
//     setTrackingOrderId(order.id);
//     resetActionStates();
//     try {
//       const response = await fetch(
//         "http://localhost:3001/api/orders/add-tracking",
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             orderId: order.id,
//             trackingNumber: order.trackingNumber,
//           }),
//         }
//       );
//       const data = await response.json();
//       if (!response.ok) {
//         throw new Error(data.error || "Failed to start tracking.");
//       }
//       setActionStatus(data.message);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setTrackingOrderId(null);
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
//             onClick={() => handleAction("summarize_page", "Summarize")}
//             disabled={isLoadingAction}
//           >
//             {isLoadingAction && loadingActionName === "Summarize"
//               ? "Summarizing..."
//               : "Summarize Page"}
//           </button>
//           <button
//             onClick={() => handleAction("draft_email", "Draft")}
//             disabled={!isGoogleLoggedIn || isLoadingAction}
//           >
//             {isLoadingAction && loadingActionName === "Draft"
//               ? "Drafting..."
//               : "Draft Email"}
//           </button>
//           <button
//             onClick={() => handleAction("create_notion_doc", "Notion")}
//             disabled={isLoadingAction}
//           >
//             {isLoadingAction && loadingActionName === "Notion"
//               ? "Creating..."
//               : "Create Notion Doc"}
//           </button>
//           <button
//             onClick={handleFindMeetingTimes}
//             disabled={!isGoogleLoggedIn || isFindingTimes}
//           >
//             {isFindingTimes ? "Finding Times..." : "Find Meeting Times"}
//           </button>
//         </div>

//         <div className="research-container">
//           <h3>Asynchronous Research</h3>
//           <div className="research-input-group">
//             <input
//               type="text"
//               value={researchTopic}
//               onChange={(e) => setResearchTopic(e.target.value)}
//               placeholder="Enter a topic to research..."
//               disabled={isResearching}
//             />
//             <button onClick={handleStartResearch} disabled={isResearching}>
//               {isResearching ? "Starting..." : "Start Research"}
//             </button>
//           </div>
//         </div>

//         {actionStatus && <p className="success-message">{actionStatus}</p>}
//         {summary && <div className="summary-box">{summary}</div>}
//         {error && <p className="error">{error}</p>}

//         {meetingSlots.length > 0 && (
//           <div className="results-container">
//             <h3>Available Meeting Times:</h3>
//             <ul className="slots-list">
//               {meetingSlots.map((slot, index) => (
//                 <li key={index}>{slot.toLocaleString()}</li>
//               ))}
//             </ul>
//           </div>
//         )}

//         <hr />

//         <div className="orders-container">
//           <h2>My Orders</h2>
//           <button
//             onClick={handleScanOrders}
//             disabled={!isGoogleLoggedIn || isScanning}
//           >
//             {isScanning ? "Scanning Gmail..." : "Scan for New Orders"}
//           </button>
//           {isGoogleLoggedIn ? (
//             orders.length > 0 ? (
//               <ul className="orders-list">
//                 {orders.map((order) => (
//                   <li key={order.id} className="order-item">
//                     <p>
//                       <strong>Item:</strong> {order.itemName}
//                     </p>
//                     <p>
//                       <strong>ETA:</strong> {order.eta}
//                     </p>
//                     <p>
//                       <strong>Tracking:</strong> {order.trackingNumber}
//                     </p>
//                     {order.status && (
//                       <p>
//                         <strong>Status:</strong> {order.status}
//                       </p>
//                     )}
//                     {/* THIS IS THE NEW BUTTON */}
//                     {order.trackingNumber &&
//                       order.trackingNumber !== "N/A" &&
//                       !order.aftershipTrackingId && (
//                         <button
//                           onClick={() => handleStartTracking(order)}
//                           disabled={trackingOrderId === order.id}
//                           className="track-button"
//                         >
//                           {trackingOrderId === order.id
//                             ? "Starting..."
//                             : "Start Live Tracking"}
//                         </button>
//                       )}
//                   </li>
//                 ))}
//               </ul>
//             ) : (
//               <p>
//                 No orders found yet. Click "Scan for New Orders" to search your
//                 Gmail.
//               </p>
//             )
//           ) : (
//             <p>Login with Google to track your orders.</p>
//           )}
//         </div>

//         <div className="research-tasks-container">
//           <h2>Research Tasks</h2>
//           {researchTasks.length > 0 ? (
//             <ul className="research-list">
//               {researchTasks.map((task) => (
//                 <li
//                   key={task.id}
//                   className={`research-item status-${task.status}`}
//                 >
//                   <div className="task-header">
//                     <strong>{task.topic}</strong>
//                     <span>{task.status}</span>
//                   </div>
//                   {task.status === "completed" && (
//                     <p className="task-result">{task.result}</p>
//                   )}
//                   {task.status === "failed" && (
//                     <p className="task-result error">{task.error}</p>
//                   )}
//                 </li>
//               ))}
//             </ul>
//           ) : (
//             <p>No research tasks yet.</p>
//           )}
//         </div>

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
//     </div>
//   );
// }

// export default App;

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

// --- Firebase Configuration ---
// IMPORTANT: Replace these placeholder values with your actual Firebase project's configuration.
const firebaseConfig = {
  apiKey: "AIzaSyCKzR8anjdxGdBdmvwWIbK7Njp87XQbGF0",
  authDomain: "alturaai.firebaseapp.com",
  projectId: "alturaai",
  storageBucket: "alturaai.firebasestorage.app",
  messagingSenderId: "296537793338",
  appId: "1:296537793338:web:00814e384e648d4cc46603",
};

// Initialize Firebase for the frontend
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function App() {
  // --- Main State Management ---
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

  // --- NEW: State for Stock Monitor ---
  const [stockTicker, setStockTicker] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [stockAlerts, setStockAlerts] = useState([]);
  const [isSettingAlert, setIsSettingAlert] = useState(false);

  const isExtension =
    typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;

  // --- Helper function to reset UI states before an action ---
  const resetActionStates = () => {
    setSummary("");
    setError("");
    setActionStatus("");
    setMeetingSlots([]);
  };

  // --- Effect for Authentication State ---
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

  // --- Effect for Fetching GitHub Notifications ---
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

  // --- Effect for Listening to Research Tasks ---
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

  // --- Effect for Listening to Orders ---
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

  // --- Effect for Listening to Snippets ---
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

  // --- NEW: Effect for Listening to Stock Alerts ---
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

  // --- Action Handlers ---

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

        <div className="research-container">
          <h3>Asynchronous Research</h3>
          <div className="research-input-group">
            <input
              type="text"
              value={researchTopic}
              onChange={(e) => setResearchTopic(e.target.value)}
              placeholder="Enter a topic to research..."
              disabled={isResearching}
            />
            <button onClick={handleStartResearch} disabled={isResearching}>
              {isResearching ? "Starting..." : "Start Research"}
            </button>
          </div>
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

        <div className="stock-container">
          <h2>Stock Price Monitor</h2>
          <div className="stock-input-group">
            <input
              type="text"
              value={stockTicker}
              onChange={(e) => setStockTicker(e.target.value.toUpperCase())}
              placeholder="e.g., GOOGL"
              disabled={isSettingAlert}
            />
            <input
              type="number"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="Target Price"
              disabled={isSettingAlert}
            />
            <button onClick={handleSetStockAlert} disabled={isSettingAlert}>
              {isSettingAlert ? "Setting..." : "Set Alert"}
            </button>
          </div>
          {stockAlerts.length > 0 ? (
            <ul className="stock-alerts-list">
              {stockAlerts.map((alert) => (
                <li
                  key={alert.id}
                  className={`stock-item status-${alert.status}`}
                >
                  <span>
                    {alert.ticker} > ${alert.targetPrice}
                  </span>
                  <span>({alert.status})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No active stock alerts.</p>
          )}
        </div>

        <div className="orders-container">
          <h2>My Orders</h2>
          <button
            onClick={handleScanOrders}
            disabled={!isGoogleLoggedIn || isScanning}
          >
            {isScanning ? "Scanning Gmail..." : "Scan for New Orders"}
          </button>
          {isGoogleLoggedIn ? (
            orders.length > 0 ? (
              <ul className="orders-list">
                {orders.map((order) => (
                  <li key={order.id} className="order-item">
                    <p>
                      <strong>Item:</strong> {order.itemName}
                    </p>
                    <p>
                      <strong>ETA:</strong> {order.eta}
                    </p>
                    <p>
                      <strong>Tracking:</strong> {order.trackingNumber}
                    </p>
                    {order.status && (
                      <p>
                        <strong>Status:</strong> {order.status}
                      </p>
                    )}
                    {order.trackingNumber &&
                      order.trackingNumber !== "N/A" &&
                      !order.aftershipTrackingId && (
                        <button
                          onClick={() => handleStartTracking(order)}
                          disabled={trackingOrderId === order.id}
                          className="track-button"
                        >
                          {trackingOrderId === order.id
                            ? "Starting..."
                            : "Start Live Tracking"}
                        </button>
                      )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No orders found yet.</p>
            )
          ) : (
            <p>Login with Google to track your orders.</p>
          )}
        </div>

        <div className="research-tasks-container">
          <h2>Research Tasks</h2>
          {researchTasks.length > 0 ? (
            <ul className="research-list">
              {researchTasks.map((task) => (
                <li
                  key={task.id}
                  className={`research-item status-${task.status}`}
                >
                  <div className="task-header">
                    <strong>{task.topic}</strong>
                    <span>{task.status}</span>
                  </div>
                  {task.status === "completed" && (
                    <p className="task-result">{task.result}</p>
                  )}
                  {task.status === "failed" && (
                    <p className="task-result error">{task.error}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No research tasks yet.</p>
          )}
        </div>

        <div className="snippets-container">
          <h2>My Snippets</h2>
          {snippets.length > 0 ? (
            <ul className="snippets-list">
              {snippets.map((snippet) => (
                <li key={snippet.id} className="snippet-item">
                  <p className="snippet-text">"{snippet.text}"</p>
                  <a
                    href={snippet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="snippet-source"
                  >
                    Source
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              No snippets saved yet. Highlight text on a page and right-click to
              save.
            </p>
          )}
        </div>

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
