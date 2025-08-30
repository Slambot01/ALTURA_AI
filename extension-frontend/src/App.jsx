// import React, { useState, useEffect } from "react";
// import { initializeApp } from "firebase/app";
// import { signOut } from "firebase/auth";import { signOut } from "firebase/auth";
// import {
//   getAuth,
//   GoogleAuthProvider,
//   signInWithPopup,
//   onAuthStateChanged,
// } from "firebase/auth";
// import {
//   getFirestore,
//   collection,
//   query,
//   orderBy,
//   onSnapshot,
// } from "firebase/firestore";
// import {
//   Bell,
//   Search,
//   TrendingUp,
//   GitBranch,
//   FileText,
//   Bot,
//   Settings,
//   CheckCircle,
//   Code,
//   DollarSign,
//   Calendar,
//   Mail,
//   Youtube,
//   BookOpen,
//   LogOut,
//   X,
//   Package,
//   ChevronUp,
//   ChevronDown,
//   Lock,
//   Trash2,
//   Download,
//   Sparkles,
//   Zap,
// } from "lucide-react";

// import "./App.css";

// // --- Firebase Configuration ---

// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
//   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
//   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
//   storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
//   appId: import.meta.env.VITE_FIREBASE_APP_ID,
// };
// const GoogleIcon = () => (
//   <svg
//     className="login-icon"
//     xmlns="http://www.w3.org/2000/svg"
//     viewBox="0 0 48 48"
//     width="20px"
//     height="20px"
//   >
//     <path
//       fill="#FFC107"
//       d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
//     />
//     <path
//       fill="#FF3D00"
//       d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
//     />
//     <path
//       fill="#4CAF50"
//       d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
//     />
//     <path
//       fill="#1976D2"
//       d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.082,5.571l6.19,5.238C39.999,35.931,44,30.417,44,24C44,22.659,43.862,21.35,43.611,20.083z"
//     />
//   </svg>
// );

// const GithubIcon = () => (
//   <svg
//     className="login-icon"
//     xmlns="http://www.w3.org/2000/svg"
//     viewBox="0 0 16 16"
//     width="20px"
//     height="20px"
//   >
//     <path
//       fill="currentColor"
//       d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
//     />
//   </svg>
// );
// const renderMarkdown = (text) => {
//   if (!text) return "";

//   return (
//     text
//       // Headers
//       .replace(
//         /^### (.*$)/gm,
//         '<h3 style="margin: 16px 0 8px 0; font-weight: 600; color: #5f7a7d;;">$1</h3>'
//       )
//       .replace(
//         /^## (.*$)/gm,
//         '<h2 style="margin: 20px 0 12px 0; font-weight: 600; color: #5f7a7d;; font-size: 1.25rem;">$1</h2>'
//       )
//       .replace(
//         /^# (.*$)/gm,
//         '<h1 style="margin: 24px 0 16px 0; font-weight: 600; color: #5f7a7d;; font-size: 1.5rem;">$1</h1>'
//       )

//       // Bold text
//       .replace(
//         /\*\*(.*?)\*\*/g,
//         '<strong style="font-weight: 600; color: ##5f7a7d;;">$1</strong>'
//       )

//       // Italic text
//       .replace(/\*(.*?)\*/g, "<em>$1</em>")

//       // Line breaks and paragraphs
//       .replace(/\n\n/g, '</p><p style="margin: 12px 0; line-height: 1.6;">')
//       .replace(/\n/g, "<br>")

//       // Wrap in paragraph tags
//       .replace(
//         /^(?!<[h|p])(.)/gm,
//         '<p style="margin: 12px 0; line-height: 1.6;">$1'
//       )
//       .replace(/(?<!>)(.)$/gm, "$1</p>")

//       // Clean up
//       .replace(/<p[^>]*><\/p>/g, "")
//       .replace(/<p[^>]*>(<[h1-6])/g, "$1")
//       .replace(/(<\/[h1-6]>)<\/p>/g, "$1")
//   );
// };
// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);
// const db = getFirestore(app);

// function App() {
//   // --- Main State Management ---
//   // const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false);
//   // const [isGithubLoggedIn, setIsGithubLoggedIn] = useState(false);
//   const [user, setUser] = useState(null);
// const [idToken, setIdToken] = useState(null);
// const [isLoadingAuth, setIsLoadingAuth] = useState(true);
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
//   const [snippets, setSnippets] = useState([]);
//   const [stockTicker, setStockTicker] = useState("");
//   const [targetPrice, setTargetPrice] = useState("");
//   const [stockAlerts, setStockAlerts] = useState([]);
//   const [isSettingAlert, setIsSettingAlert] = useState(false);
//   const [composeRequest, setComposeRequest] = useState("");
//   const [composedText, setComposedText] = useState("");
//   const [isComposing, setIsComposing] = useState(false);
//   const [deletingNotificationId, setDeletingNotificationId] = useState(null);
//   const [deletingSnippetId, setDeletingSnippetId] = useState(null);
//   const [deletingOrderId, setDeletingOrderId] = useState(null);
//   const [downloadingTaskId, setDownloadingTaskId] = useState(null);
//   const [isNotionConnected, setIsNotionConnected] = useState(false);
//   const [followUpQuery, setFollowUpQuery] = useState("");
//   const [currentUrl, setCurrentUrl] = useState("");

//   // const [isProactiveOn, setIsProactiveOn] = useState(false);
//   // const [proactiveAnalysis, setProactiveAnalysis] = useState(null);

//   // const [isLoadingProactive, setIsLoadingProactive] = useState(false);
//   // --- UI Visibility State ---
//   const [expandedTasks, setExpandedTasks] = useState({});
//   const [isGithubFeedVisible, setIsGithubFeedVisible] = useState(false);
//   const [isSnippetsVisible, setIsSnippetsVisible] = useState(false);
//   const [isOrdersVisible, setIsOrdersVisible] = useState(false);
//   const [isResearchTasksVisible, setIsResearchTasksVisible] = useState(false);
//   const [isStockAlertsVisible, setIsStockAlertsVisible] = useState(false);
//   const [isGithubAppInstalled, setIsGithubAppInstalled] = useState(false);

//   const isExtension =
//     typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;

//   // Check if user is authenticated (either Google OR GitHub)
//   const isAuthenticated = !!user;

//   // Helper function to toggle individual task expansion
//   const toggleTaskExpansion = (taskId) => {
//     setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
//   };

//   // Helper function to reset UI states
//   const resetActionStates = () => {
//     setSummary("");
//     setError("");
//     setActionStatus("");
//     setMeetingSlots([]);
//     setComposedText("");
//   };

//   // --- ALL EFFECTS (UNCHANGED) ---
//   // In App.jsx, replace your entire first useEffect with this one
//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
//       if (currentUser) {
//         setUser(currentUser);
//         const token = await currentUser.getIdToken();
//         setIdToken(token);
//         // Also save token to chrome.storage.local so background script can access it
//         chrome.storage.local.set({ idToken: token });
//       } else {
//         setUser(null);
//         setIdToken(null);
//         chrome.storage.local.remove("idToken");
//       }
//     });
//     return () => unsubscribe(); // Cleanup on component unmount
//   }, []);
//   useEffect(() => {
//     if (isExtension) {
//       chrome.runtime.sendMessage({ action: "check_auth_status" });

//       // This block now correctly gets all three statuses when the app loads
//       chrome.storage.local.get(
//         [
//           "isGoogleLoggedIn",
//           "isNotionConnected",
//           "isGithubAppInstalled",
//           // "isProactiveAssistantOn",
//         ],
//         (result) => {
//           console.log("=== FRONTEND AUTH STATUS ===");
//           console.log("Google logged in:", !!result.isGoogleLoggedIn);
//           console.log("Notion connected:", !!result.isNotionConnected);

//           console.log("GitHub app installed:", !!result.isGithubAppInstalled);

//           setIsGoogleLoggedIn(!!result.isGoogleLoggedIn);
//           setIsNotionConnected(!!result.isNotionConnected); // Fixed
//           setIsGithubAppInstalled(!!result.isGithubAppInstalled); // Fixed
//           // setIsProactiveOn(!!result.isProactiveAssistantOn);
//         }
//       );

//       // This block now correctly listens for changes to all three statuses
//       const handleStorageChange = (changes, area) => {
//         if (area === "local") {
//           if (changes.isGoogleLoggedIn) {
//             setIsGoogleLoggedIn(!!changes.isGoogleLoggedIn.newValue);
//           }
//           if (changes.isNotionConnected) {
//             // Added this block
//             setIsNotionConnected(!!changes.isNotionConnected.newValue);
//           }
//           if (changes.isGithubAppInstalled) {
//             setIsGithubAppInstalled(!!changes.isGithubAppInstalled.newValue);
//           }
//           // if (changes.isProactiveAssistantOn) {
//           //   setIsProactiveOn(!!changes.isProactiveAssistantOn.newValue);
//           // }
//         }
//       };

//       chrome.storage.onChanged.addListener(handleStorageChange);
//       return () => chrome.storage.onChanged.removeListener(handleStorageChange);
//     }
//   }, [isExtension]);
//   useEffect(() => {
//     if (!isGithubAppInstalled) {
//       setLoading(false);
//       setNotifications([]);
//       return;
//     }
//     const authedFetchNotifications = async () => {
//       setLoading(true);
//       try {
//         const response = await authedFetch("  'https://alturaai-production.up.railway.app'/api/notifications");
//         if (!response.ok) throw new Error("Failed to authedFetch notifications.");
//         const data = await response.json();
//         const githubNotifications = data.filter(
//           (notif) => notif.type !== "stock"
//         );
//         setNotifications(githubNotifications);
//       } catch (err) {
//         setError("Could not connect to the notification service.");
//       } finally {
//         setLoading(false);
//       }
//     };
//     authedFetchNotifications();
//     const intervalId = setInterval(authedFetchNotifications, 30000);
//     return () => clearInterval(intervalId);
//   }, [isGithubAppInstalled]);
//   useEffect(() => {
//     if (isExtension) {
//       chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//         if (tabs[0]) {
//           setCurrentUrl(tabs[0].url);
//         }
//       });
//     }
//   }, [isExtension]);

//   useEffect(() => {
//     if (user) {
//       const q = query(
//         collection(db, "users", user.id, "research_tasks"),
//         orderBy("createdAt", "desc")
//       );
//       const unsubscribe = onSnapshot(q, (snapshot) =>
//         setResearchTasks(
//           snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
//         )
//       );
//       return () => unsubscribe();
//     }
//   }, [user]);

//   useEffect(() => {
//     if (user) {
//       // Only run if a user is logged in
//       // Query the "orders" sub-collection inside the specific user's document
//       const q = query(
//         collection(db, "users", user.id, "orders"),
//         orderBy("scannedAt", "desc")
//       );
//       const unsubscribe = onSnapshot(q, (querySnapshot) => {
//         const authedFetchedOrders = [];
//         querySnapshot.forEach((doc) => {
//           authedFetchedOrders.push({ id: doc.id, ...doc.data() });
//         });
//         setOrders(authedFetchedOrders);
//       });
//       return () => unsubscribe();
//     } else {
//       setOrders([]); // Clear orders if user logs out
//     }
//   }, [user]);
//   useEffect(() => {
//     if (user) {
//       const q = query(
//         collection(db, "users", user.id, "snippets"),
//         orderBy("savedAt", "desc")
//       );
//       const unsubscribe = onSnapshot(q, (snapshot) =>
//         setSnippets(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
//       );
//       return () => unsubscribe();
//     }
//   }, [user]);

//   useEffect(() => {
//     if (user) {
//       const q = query(
//         collection(db, "users", user.id, "stock_alerts"),
//         orderBy("createdAt", "desc")
//       );
//       const unsubscribe = onSnapshot(q, (snapshot) =>
//         setStockAlerts(
//           snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
//         )
//       );
//       return () => unsubscribe();
//     }
//   }, [user]);
//   useEffect(() => {
//     if (actionStatus) {
//       const timer = setTimeout(() => {
//         setActionStatus("");
//       }, 4000);
//       return () => clearTimeout(timer);
//     }
//   }, [actionStatus]);

//   const formatTimestamp = (timestamp) => {
//     try {
//       if (!timestamp) {
//         return "Unknown time";
//       }

//       // Create date object from ISO string or other formats
//       const date = new Date(timestamp);

//       // Check if date is valid
//       if (isNaN(date.getTime())) {
//         console.error("Invalid timestamp:", timestamp);
//         return "Invalid date";
//       }

//       // Format the date and time
//       const now = new Date();
//       const diffMs = now - date;
//       const diffMins = Math.floor(diffMs / 60000);
//       const diffHours = Math.floor(diffMs / 3600000);
//       const diffDays = Math.floor(diffMs / 86400000);

//       // Show relative time for recent events
//       if (diffMins < 1) {
//         return "Just now";
//       } else if (diffMins < 60) {
//         return `${diffMins}m ago`;
//       } else if (diffHours < 24) {
//         return `${diffHours}h ago`;
//       } else if (diffDays < 7) {
//         return `${diffDays}d ago`;
//       } else {
//         // Show full date for older events
//         return (
//           date.toLocaleDateString() +
//           " " +
//           date.toLocaleTimeString([], {
//             hour: "2-digit",
//             minute: "2-digit",
//           })
//         );
//       }
//     } catch (error) {
//       console.error(
//         "Error formatting timestamp:",
//         error,
//         "Raw timestamp:",
//         timestamp
//       );
//       return "Invalid date";
//     }
//   };

//       useEffect(() => {
//         if (!user) return;
//         const listeners = [
//             onSnapshot(query(collection(db, "users", user.id, "notifications"), orderBy("timestamp", "desc")), (snapshot) => setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))),
//             onSnapshot(query(collection(db, "users", user.id, "orders"), orderBy("scannedAt", "desc")), (snapshot) => setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))),
//             onSnapshot(query(collection(db, "users", user.id, "snippets"), orderBy("savedAt", "desc")), (snapshot) => setSnippets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))),
//             onSnapshot(query(collection(db, "users", user.id, "research_tasks"), orderBy("createdAt", "desc")), (snapshot) => setResearchTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))),
//             onSnapshot(query(collection(db, "users", user.id, "stock_alerts"), orderBy("createdAt", "desc")), (snapshot) => setStockAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))))
//         ];
//         return () => listeners.forEach(unsubscribe => unsubscribe());
//     }, [user]);
// const handleAction = useCallback((action, actionName) => {
//     if (!idToken) return setError("Please log in to perform this action.");

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
//   }, [idToken]);
//   const handleLoginClick = async () => {
//     const provider = new GoogleAuthProvider();
//     try {
//       await signInWithPopup(auth, provider);
//     } catch (error) {
//       setError("Failed to sign in with Google.");
//     }
//   };

//   const handleLogout = async () => {
//     await signOut(auth);
//   };

//   const handleCompose = () => {
//     if (!composeRequest.trim()) {
//       setError("Please enter a request for the composer.");
//       return;
//     }
//     setIsComposing(true);
//     resetActionStates();

//     chrome.runtime.sendMessage(
//       {
//         action: "compose_content",
//         userRequest: composeRequest,
//       },
//       (response) => {
//         if (response && response.error) {
//           setError(response.error);
//         } else if (response && response.composedText) {
//           setComposedText(response.composedText);
//         } else {
//           setError("Received an unexpected response from the composer.");
//         }
//         setIsComposing(false);
//       }
//     );
//   };
//   // const handleToggleProactive = (e) => {
//   //   const isChecked = e.target.checked;
//   //   setIsProactiveOn(isChecked);
//   //   // Save the setting so the background script can read it
//   //   chrome.storage.local.set({ isProactiveAssistantOn: isChecked });
//   // };
//   const handleReviewPR = useCallback(async (prUrl) => {
//     if (!idToken) return setError("Please log in to review a PR.");
//     setIsReviewModalOpen(true);
//     setIsReviewLoading(true);
//     setReviewContent("");
//     setError("");
//     try {
//         // ✅ Using authedFetch, which automatically adds the token
//         const data = await authedFetch("/api/github/pr/review", {
//             method: "POST",
//             body: JSON.stringify({ prUrl }),
//         });
//         setReviewContent(data.review);
//     } catch (err) {
//         setReviewContent(`Error: ${err.message}`);
//     } finally {
//         setIsReviewLoading(false);
//     }
// }, [authedFetch, idToken]); // Use useCallback for performance

//   const handleNotificationClick = (notification) => {
//     if (notification.type === "pr" && notification.message.includes("opened")) {
//       handleReviewPR(notification.url);
//     } else if (notification.url) {
//       chrome.tabs.create({ url: notification.url });
//     }
//   };

//   const handleLogout = async () => {
//     try {
//       const response = await authedFetch("  'https://alturaai-production.up.railway.app'/api/logout", {
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
//   const authedFetch = async (url, options = {}) => {
//     if (!idToken) {
//       throw new Error("User is not authenticated.");
//     }
//     const headers = {
//       ...options.headers,
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${idToken}`,
//     };
//     const response = await authedFetch(`  'https://alturaai-production.up.railway.app'${url}`, {
//       ...options,
//       headers,
//     });
//     if (!response.ok) {
//       const errorData = await response.json();
//       throw new Error(errorData.error || "An API error occurred.");
//     }
//     return response.json();
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
//       const response = await authedFetch("  'https://alturaai-production.up.railway.app'/api/research/start", {
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
//   const handleDownloadResearchPDF = async (taskId, taskTopic) => {
//     if (downloadingTaskId) return; // Prevent multiple simultaneous downloads

//     setDownloadingTaskId(taskId);

//     try {
//       const response = await authedFetch(
//         `  'https://alturaai-production.up.railway.app'/api/research/task/${taskId}/download`
//       );

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.error || "Failed to download PDF");
//       }

//       const blob = await response.blob();
//       const url = window.URL.createObjectURL(blob);
//       const link = document.createElement("a");
//       link.href = url;
//       const filename = `research-${taskTopic
//         .replace(/[^a-zA-Z0-9]/g, "-")
//         .toLowerCase()}-${taskId}.pdf`;
//       link.download = filename;
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//       window.URL.revokeObjectURL(url);
//       setActionStatus("PDF downloaded successfully!");
//     } catch (error) {
//       setError(`Failed to download PDF: ${error.message}`);
//     } finally {
//       setDownloadingTaskId(null);
//     }
//   };
//   const [deletingTaskId, setDeletingTaskId] = useState(null);

//   const handleDeleteResearchTask = async (taskId) => {
//     if (deletingTaskId) return; // Prevent multiple simultaneous deletions

//     setDeletingTaskId(taskId);
//     resetActionStates();

//     try {
//       const response = await authedFetch(
//         `  'https://alturaai-production.up.railway.app'/api/research/task/${taskId}`,
//         {
//           method: "DELETE",
//         }
//       );

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.error || "Failed to delete the research task.");
//       }

//       // Remove from local state immediately for better UX
//       setResearchTasks((prev) => prev.filter((task) => task.id !== taskId));
//       setActionStatus("Research task deleted successfully.");
//     } catch (err) {
//       setError(`Failed to delete research task: ${err.message}`);
//     } finally {
//       setDeletingTaskId(null);
//     }
//   };

//   // Example fix for handleScanOrders
//   const handleScanOrders = useCallback(async () => {
//     setIsScanning(true);
//     resetActionStates();
//     try {
//       // ✅ Use the new authedFetch function
//       const data = await authedFetch("/api/orders/scan-inbox", {
//         method: "POST",
//       });
//       setActionStatus(data.message);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setIsScanning(false);
//     }
//   }, [authedFetch]);
//   const handleStartTracking = async (order) => {
//     setTrackingOrderId(order.id);
//     resetActionStates();
//     try {
//       const response = await authedFetch(
//         "  'https://alturaai-production.up.railway.app'/api/orders/add-tracking",
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
//   const handleDeleteOrder = async (orderId) => {
//     if (deletingOrderId) return; // Prevent multiple simultaneous deletions

//     setDeletingOrderId(orderId);
//     resetActionStates();

//     try {
//       const response = await authedFetch(
//         `  'https://alturaai-production.up.railway.app'/api/orders/${orderId}`,
//         {
//           method: "DELETE",
//         }
//       );

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.error || "Failed to delete the order.");
//       }

//       // Remove from local state immediately for better UX
//       setOrders((prev) => prev.filter((order) => order.id !== orderId));
//       setActionStatus("Order deleted successfully.");
//     } catch (err) {
//       setError(`Failed to delete order: ${err.message}`);
//     } finally {
//       setDeletingOrderId(null);
//     }
//   };
//   const handleConnectNotion = async () => {
//     try {
//       const response = await authedFetch("  'https://alturaai-production.up.railway.app'/api/auth/notion");
//       const data = await response.json();
//       if (data.url) {
//         chrome.tabs.create({ url: data.url });
//       }
//     } catch (e) {
//       setError("Could not connect to the Notion service.");
//     }
//   };
// //   const authedFetch = async (url, options = {}) => {
// //   const token = idToken;

// //   if (!token) {
// //     throw new Error("User is not authenticated.");
// //   }

// //   const headers = {
// //     ...options.headers,
// //     "Content-Type": "application/json",
// //     Authorization: `Bearer ${token}`,
// //   };

// //   const response = await authedFetch(`  'https://alturaai-production.up.railway.app'${url}`, {
// //     ...options,
// //     headers,
// //   });
// //   return response.json();
// // };

//   const handleInstallGitHubApp = async () => {
//     try {
//       const response = await authedFetch("  'https://alturaai-production.up.railway.app'/api/github/install");
//       const data = await response.json();
//       if (data.url) {
//         chrome.tabs.create({ url: data.url });

//         // After opening the tab, wait 5 seconds then force a status check
//         setTimeout(() => {
//           console.log("Re-checking auth status after installation attempt...");
//           chrome.runtime.sendMessage({ action: "check_auth_status" });
//         }, 5000); // 5 seconds
//       }
//     } catch (e) {
//       setError("Could not connect to the GitHub App service.");
//     }
//   };
//   const handleSetStockAlert = async () => {
//     if (!stockTicker.trim() || !targetPrice.trim()) {
//       setError("Please enter a stock ticker and a target price.");
//       return;
//     }
//     setIsSettingAlert(true);
//     resetActionStates();
//     try {
//       const response = await authedFetch(
//         "  'https://alturaai-production.up.railway.app'/api/stocks/add-alert",
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             ticker: stockTicker,
//             targetPrice: targetPrice,
//           }),
//         }
//       );
//       const data = await response.json();
//       if (!response.ok) {
//         throw new Error(data.error || "Failed to set alert.");
//       }
//       setActionStatus(data.message);
//       setStockTicker("");
//       setTargetPrice("");
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setIsSettingAlert(false);
//     }
//   };

//   const handleDeleteStockAlert = async (alertId) => {
//     if (isLoadingAction) return;

//     try {
//       const response = await authedFetch(
//         `  'https://alturaai-production.up.railway.app'/api/stocks/alert/${alertId}`,
//         {
//           method: "DELETE",
//         }
//       );

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.error || "Failed to delete the alert.");
//       }

//       setActionStatus("Stock alert removed.");
//     } catch (err) {
//       setError(err.message);
//     }
//   };
//   const handleDeleteNotification = async (notificationId) => {
//     setDeletingNotificationId(notificationId);
//     try {
//       const response = await authedFetch(
//         `  'https://alturaai-production.up.railway.app'/api/notifications/${notificationId}`,
//         {
//           method: "DELETE",
//         }
//       );

//       if (!response.ok) {
//         throw new Error("Failed to delete notification");
//       }

//       // Remove from local state immediately for better UX
//       setNotifications((prev) =>
//         prev.filter((notif) => notif.id !== notificationId)
//       );
//       setActionStatus("Notification deleted");
//     } catch (err) {
//       setError(`Failed to delete notification: ${err.message}`);
//     } finally {
//       setDeletingNotificationId(null);
//     }
//   };
//   const handleDebugFollowUp = async () => {
//     if (!followUpQuery.trim()) return;

//     setIsLoadingAction(true); // Reuse existing loading state
//     const currentAnalysis = summary; // Get the current analysis text

//     try {
//       const response = await authedFetch("  'https://alturaai-production.up.railway.app'/api/debug/followup", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           previousAnalysis: currentAnalysis,
//           newQuery: followUpQuery,
//         }),
//       });
//       const data = await response.json();
//       if (!response.ok) throw new Error(data.error);

//       // Append the new question and answer to the summary for a conversational feel
//       const updatedSummary = `${currentAnalysis}\n\n---\n\n**My Follow-up:** ${followUpQuery}\n\n**AlturaAI:**\n${data.summary}`;
//       setSummary(updatedSummary);
//       setFollowUpQuery(""); // Clear the input
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setIsLoadingAction(false);
//     }
//   };
// const handleDeleteSnippet = useCallback(async (snippetId) => {
//   // Add a check to ensure the user is logged in
//   if (!idToken) return setError("Please log in to delete snippets.");

//   setDeletingSnippetId(snippetId);
//   try {

//     const data = await authedFetch(`/api/snippets/${snippetId}`, {
//       method: 'DELETE'
//     });

//     setActionStatus(data.message);

//   } catch (err) {
//     setError(`Failed to delete snippet: ${err.message}`);
//   } finally {
//     setDeletingSnippetId(null);
//   }
// }, [authedFetch, idToken]); // Dependencies for useCallback
//   // --- RENDER ---
//   return (
//      <div className={`container ${!isAuthenticated ? "unauthenticated" : ""}`}>
//       {!isAuthenticated ? (
//         <div className="auth-overlay">
//           <div className="auth-modal">
//             <Lock size={48} />
//             <h2 className="auth-modal-title">Welcome to AlturaAI</h2>
//             <p className="auth-modal-subtitle">Please sign in with Google to continue.</p>
//             <button className="btn-auth-modal" onClick={handleLoginClick}>
//               <GoogleIcon />
//               <span>Continue with Google</span>
//             </button>
//              {error && <p className="auth-error">{error}</p>}
//           </div>
//         </div>
//       ) : (
//       <>
//       <header className="app-header">
//         <div className="header-left">
//           <div className="logo">
//             <span className="logo-text">AlturaAI</span>
//           </div>
//           <div className="auth-sec">
//             {isGoogleLoggedIn ? (
//               <div className="status-indicator-green">
//                 <div className="status-dot animate-pulse"></div>
//                 <GoogleIcon />
//                 <span>Google</span>
//               </div>
//             ) : (
//               <button
//                 className="btn-login"
// onClick={handleLoginClick}              >
//                 <GoogleIcon />
//                 <span>Login</span>
//               </button>
//             )}
//             {isGithubAppInstalled ? (
//               <div className="status-indicator-green">
//                 <div className="status-dot animate-pulse"></div>
//                 <GithubIcon />
//                 <span>App Installed</span>
//               </div>
//             ) : (
//               <button className="btn-login" onClick={handleInstallGitHubApp}>
//                 <GithubIcon />
//                 <span>Install App</span>
//               </button>
//             )}
//           </div>
//         </div>
//         <div className="header-right">
//           {(isGoogleLoggedIn || isGithubAppInstalled) && (
//             <LogOut
//               className="icon-btn"
//               onClick={handleLogout}
//               title="Logout"
//             />
//           )}
//         </div>
//       </header>

//       {/* Main Grid with Corrected Conditional Logic */}
//       <div className="main-grid">
//         {/* // VIEW 2: If no analysis is ready, show the normal dashboard */}
//         <div>
//           <div className="grid-column">
//             {/* --- Left Column Cards --- */}

//             {/* <div className="card">
//                 <h3 className="card-title">
//                   <Sparkles className="title-icon" />
//                   Proactive Assistant
//                 </h3>
//                 <div
//                   className="card-content"
//                   style={{
//                     flexDirection: "row",
//                     justifyContent: "space-between",
//                     alignItems: "center",
//                   }}
//                 >
//                   <span>Analyze products automatically</span>
//                   <label className="switch">
//                     <input
//                       type="checkbox"
//                       checked={isProactiveOn}
//                       onChange={handleToggleProactive}
//                     />
//                     <span className="slider round"></span>
//                   </label>
//                 </div>
//               </div> */}
//             <div className="card">
//               <h3 className="card-title">
//                 <Bot className="title-icon" />
//                 AI Content Composer
//               </h3>
//               <div className="card-content">
//                 <textarea
//                   placeholder="Write a LinkedIn post about this..."
//                   className="input-textarea"
//                   value={composeRequest}
//                   onChange={(e) => setComposeRequest(e.target.value)}
//                   disabled={isComposing}
//                 />
//                 <button
//                   className="btn btn-primary"
//                   onClick={handleCompose}
//                   disabled={isComposing}
//                 >
//                   {isComposing ? "Generating..." : "Generate"}
//                 </button>
//                 {composedText && (
//                   <pre className="result-box">{composedText}</pre>
//                 )}
//               </div>
//             </div>
//             <div className="card">
//               <div className="card-title-wrapper">
//                 <h3 className="card-title">
//                   <Search className="title-icon text-green" /> Asynchronous
//                   Research
//                 </h3>
//                 <button
//                   className="card-title-toggle"
//                   onClick={() => setIsResearchTasksVisible((p) => !p)}
//                 >
//                   {isResearchTasksVisible ? <ChevronUp /> : <ChevronDown />}
//                 </button>
//               </div>
//               <div className="card-content">
//                 <input
//                   type="text"
//                   placeholder="Enter a topic to research..."
//                   className="input-field"
//                   value={researchTopic}
//                   onChange={(e) => setResearchTopic(e.target.value)}
//                   disabled={isResearching}
//                 />
//                 <button
//                   className="btn btn-secondary"
//                   onClick={handleStartResearch}
//                   disabled={isResearching}
//                 >
//                   {isResearching ? "Starting..." : "Start Research"}
//                 </button>
//               </div>
//               {isResearchTasksVisible && (
//                 <div className="task-list">
//                   <h4 className="list-subtitle">
//                     <FileText className="subtitle-icon" /> Research Tasks
//                   </h4>
//                   {researchTasks.length > 0 ? (
//                     researchTasks.map((task) => {
//                       const isExpanded = !!expandedTasks[task.id];
//                       const isLongText =
//                         task.result && task.result.length > 150;
//                       return (
//                         <div
//                           key={task.id}
//                           className="list-item research-task-item"
//                         >
//                           <div className="list-item-content">
//                             <div className="list-item-header">
//                               <h5 className="list-item-title">{task.topic}</h5>
//                               <div className="task-header-actions">
//                                 {/* Only show in-progress status, remove completed status */}
//                                 {task.status === "in-progress" && (
//                                   <div className="status-dot-yellow animate-pulse" />
//                                 )}
//                                 {/* Delete button moved to header */}
//                                 <button
//                                   className="btn-icon-delete"
//                                   onClick={(e) => {
//                                     e.stopPropagation();
//                                     handleDeleteResearchTask(task.id);
//                                   }}
//                                   disabled={deletingTaskId === task.id}
//                                   title="Delete research task"
//                                 >
//                                   {deletingTaskId === task.id ? (
//                                     <div className="status-dot animate-pulse" />
//                                   ) : (
//                                     <Trash2 size={16} />
//                                   )}
//                                 </button>
//                               </div>
//                             </div>
//                             {task.status === "completed" && (
//                               <>
//                                 <div
//                                   className="list-item-summary"
//                                   dangerouslySetInnerHTML={{
//                                     __html:
//                                       isLongText && !isExpanded
//                                         ? renderMarkdown(
//                                             task.result.substring(0, 150)
//                                           ) + "..."
//                                         : renderMarkdown(task.result),
//                                   }}
//                                 />
//                                 {isLongText && (
//                                   <button
//                                     className="btn-show-more"
//                                     onClick={() => toggleTaskExpansion(task.id)}
//                                   >
//                                     {isExpanded ? "Show less" : "Show more"}
//                                   </button>
//                                 )}
//                               </>
//                             )}
//                             {task.status === "failed" && (
//                               <p className="list-item-summary text-red">
//                                 {task.error}
//                               </p>
//                             )}
//                           </div>
//                         </div>
//                       );
//                     })
//                   ) : (
//                     <p className="empty-state">No research tasks initiated.</p>
//                   )}
//                 </div>
//               )}
//             </div>
//             <div className="card">
//               <h3 className="card-title">Quick Actions</h3>
//               <div className="quick-actions-grid">
//                 <button
//                   className="btn btn-tertiary"
//                   onClick={() => handleAction("debug_page", "Debug")}
//                   disabled={isLoadingAction}
//                 >
//                   <Code className="btn-icon" />
//                   <span>
//                     {isLoadingAction && loadingActionName === "Debug"
//                       ? "Debugging..."
//                       : "Debug Page"}
//                   </span>
//                 </button>
//                 <button
//                   className="btn btn-tertiary"
//                   onClick={() => handleAction("summarize_page", "Summarize")}
//                   disabled={isLoadingAction}
//                 >
//                   <FileText className="btn-icon" />
//                   <span>
//                     {isLoadingAction && loadingActionName === "Summarize"
//                       ? "..."
//                       : "Summarize Page"}
//                   </span>
//                 </button>
//                 <button
//                   className="btn btn-tertiary"
//                   onClick={() => handleAction("draft_email", "Draft")}
//                   disabled={!isGoogleLoggedIn || isLoadingAction}
//                 >
//                   <Mail className="btn-icon" />
//                   <span>
//                     {isLoadingAction && loadingActionName === "Draft"
//                       ? "..."
//                       : "Draft Email"}
//                   </span>
//                 </button>
//                 <button
//                   className="btn btn-tertiary"
//                   onClick={() => handleAction("create_notion_doc", "Notion")}
//                   disabled={isLoadingAction}
//                 >
//                   <BookOpen className="btn-icon" />
//                   <span>
//                     {isLoadingAction && loadingActionName === "Notion"
//                       ? "..."
//                       : "Notion Doc"}
//                   </span>
//                 </button>
//               </div>
//               {summary && (
//                 <>
//                   <div
//                     className="result-box"
//                     dangerouslySetInnerHTML={{
//                       __html: renderMarkdown(summary),
//                     }}
//                   />
//                   <div
//                     className="follow-up-container"
//                     style={{ marginTop: "1rem" }}
//                   >
//                     <textarea
//                       placeholder="Ask a follow-up question..."
//                       className="input-textarea"
//                       value={followUpQuery}
//                       onChange={(e) => setFollowUpQuery(e.target.value)}
//                       disabled={isLoadingAction}
//                     />
//                     <button
//                       className="btn btn-secondary"
//                       onClick={handleDebugFollowUp}
//                       disabled={isLoadingAction}
//                       style={{ marginTop: "0.5rem" }}
//                     >
//                       {isLoadingAction ? "Thinking..." : "Send Follow-up"}
//                     </button>
//                   </div>
//                 </>
//               )}
//             </div>
//           </div>

//           <div className="grid-column">
//             {/* --- Middle Column Cards --- */}
//             <div className="card">
//               <div className="card-title-wrapper">
//                 <h3 className="card-title">
//                   <GitBranch className="title-icon text-purple" /> GitHub Feed
//                 </h3>
//                 <button
//                   className="card-title-toggle"
//                   onClick={() => setIsGithubFeedVisible((p) => !p)}
//                 >
//                   {isGithubFeedVisible ? <ChevronUp /> : <ChevronDown />}
//                 </button>
//               </div>
//               {isGithubFeedVisible && (
//                 <div className="card-content">
//                   {isGithubAppInstalled ? (
//                     loading ? (
//                       <p className="empty-state">Loading feed...</p>
//                     ) : notifications.length > 0 ? (
//                       notifications.map((notif) => (
//                         <div key={notif.id} className="list-item">
//                           <div
//                             className="list-item-content-icon interactive"
//                             onClick={() => handleNotificationClick(notif)}
//                           >
//                             <div className="list-icon-wrapper-purple">
//                               <Code className="list-icon" />
//                             </div>
//                             <div>
//                               <p className="list-item-summary">
//                                 {notif.message}
//                               </p>
//                               <p className="list-item-meta">
//                                 {notif.repo} •{" "}
//                                 {formatTimestamp(notif.timestamp)}
//                               </p>
//                             </div>
//                           </div>
//                           <button
//                             className="btn-icon-delete"
//                             onClick={(e) => {
//                               e.stopPropagation();
//                               handleDeleteNotification(notif.id);
//                             }}
//                             disabled={deletingNotificationId === notif.id}
//                             title="Delete notification"
//                           >
//                             {deletingNotificationId === notif.id ? (
//                               <div className="status-dot animate-pulse" />
//                             ) : (
//                               <Trash2 size={16} />
//                             )}
//                           </button>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="empty-state">
//                         No notifications. Push a commit or open a PR.
//                       </p>
//                     )
//                   ) : (
//                     <p className="empty-state">
//                       Install the GitHub App to see your feed.
//                     </p>
//                   )}
//                 </div>
//               )}
//             </div>
//             <div className="card">
//               <div className="card-title-wrapper">
//                 <h3 className="card-title">
//                   <Code className="title-icon text-cyan" /> My Snippets
//                 </h3>
//                 <button
//                   className="card-title-toggle"
//                   onClick={() => setIsSnippetsVisible((p) => !p)}
//                 >
//                   {isSnippetsVisible ? <ChevronUp /> : <ChevronDown />}
//                 </button>
//               </div>
//               {isSnippetsVisible && (
//                 <div className="card-content">
//                   {snippets.length > 0 ? (
//                     snippets.map((snippet) => (
//                       <div key={snippet.id} className="list-item">
//                         <div className="list-item-header">
//                           <a
//                             href={snippet.url}
//                             target="_blank"
//                             rel="noopener noreferrer"
//                             className="list-item-title"
//                           >
//                             {snippet.text}
//                           </a>
//                           <span className="tag-cyan">
//                             {new URL(snippet.url).hostname}
//                           </span>
//                         </div>
//                         <button
//                           className="btn-icon-delete"
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             handleDeleteSnippet(snippet.id);
//                           }}
//                           disabled={deletingSnippetId === snippet.id}
//                           title="Delete snippet"
//                         >
//                           {deletingSnippetId === snippet.id ? (
//                             <div className="status-dot animate-pulse" />
//                           ) : (
//                             <Trash2 size={16} />
//                           )}
//                         </button>
//                       </div>
//                     ))
//                   ) : (
//                     <p className="empty-state">
//                       No snippets saved. Highlight text and right-click to save.
//                     </p>
//                   )}
//                 </div>
//               )}
//             </div>
//             <div className="card">
//               <div className="card-title-wrapper">
//                 <h3 className="card-title">
//                   <Package className="title-icon" /> Recent Orders
//                 </h3>
//                 <button
//                   className="card-title-toggle"
//                   onClick={() => setIsOrdersVisible((p) => !p)}
//                 >
//                   {isOrdersVisible ? <ChevronUp /> : <ChevronDown />}
//                 </button>
//               </div>
//               {isOrdersVisible && (
//                 <div className="card-content">
//                   <button
//                     className="btn btn-secondary full-width"
//                     onClick={handleScanOrders}
//                     disabled={!isGoogleLoggedIn || isScanning}
//                   >
//                     {isScanning ? "Scanning Gmail..." : "Scan for New Orders"}
//                   </button>
//                   <div className="task-list">
//                     {isGoogleLoggedIn ? (
//                       orders.length > 0 ? (
//                         orders.map((order) => (
//                           <div key={order.id} className="list-item">
//                             <div className="list-item-content">
//                               <div className="list-item-header">
//                                 <div>
//                                   <p className="list-item-title">
//                                     {order.itemName}
//                                   </p>
//                                   <p className="list-item-meta">
//                                     ETA: {order.eta} • Tracking:{" "}
//                                     {order.trackingNumber}
//                                   </p>
//                                   {order.status && (
//                                     <p className="list-item-meta">
//                                       Status: {order.status}
//                                     </p>
//                                   )}
//                                 </div>
//                                 {/* Delete button moved to header - top right */}
//                                 <button
//                                   className="btn-icon-delete"
//                                   onClick={(e) => {
//                                     e.stopPropagation();
//                                     handleDeleteOrder(order.id);
//                                   }}
//                                   disabled={deletingOrderId === order.id}
//                                   title="Delete order"
//                                 >
//                                   {deletingOrderId === order.id ? (
//                                     <div className="status-dot animate-pulse" />
//                                   ) : (
//                                     <Trash2 size={16} />
//                                   )}
//                                 </button>
//                               </div>
//                               <div className="order-actions">
//                                 {order.trackingNumber &&
//                                   order.trackingNumber !== "N/A" &&
//                                   !order.aftershipTrackingId && (
//                                     <button
//                                       className="btn-track"
//                                       onClick={() => handleStartTracking(order)}
//                                       disabled={trackingOrderId === order.id}
//                                     >
//                                       {trackingOrderId === order.id
//                                         ? "Starting..."
//                                         : "Start Live Tracking"}
//                                     </button>
//                                   )}
//                               </div>
//                             </div>
//                           </div>
//                         ))
//                       ) : (
//                         <p className="empty-state">No orders found yet.</p>
//                       )
//                     ) : (
//                       <p className="empty-state">
//                         Login with Google to track your orders.
//                       </p>
//                     )}
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>

//           <div className="grid-column">
//             {/* --- Right Column Cards --- */}

//             <div className="card">
//               <h3 className="card-title">
//                 <TrendingUp className="title-icon text-green" /> Stock Price
//                 Monitor
//               </h3>
//               <div className="card-content">
//                 <input
//                   type="text"
//                   placeholder="e.g. GOOGL"
//                   className="input-field"
//                   value={stockTicker}
//                   onChange={(e) => setStockTicker(e.target.value.toUpperCase())}
//                   disabled={isSettingAlert}
//                 />
//                 <input
//                   type="number"
//                   placeholder="Target Price in USD"
//                   className="input-field"
//                   value={targetPrice}
//                   onChange={(e) => setTargetPrice(e.target.value)}
//                   disabled={isSettingAlert}
//                 />
//                 <button
//                   className="btn btn-secondary"
//                   onClick={handleSetStockAlert}
//                   disabled={isSettingAlert}
//                 >
//                   {isSettingAlert ? "Setting..." : "Set Alert"}
//                 </button>
//               </div>
//               <div className="task-list">
//                 <h4 className="list-subtitle">Active Alerts</h4>
//                 {stockAlerts.length > 0 ? (
//                   stockAlerts.map((alert) => (
//                     <div key={alert.id} className="active-alert-item">
//                       <span>
//                         {alert.ticker} > ${alert.targetPrice}
//                       </span>
//                       <span>({alert.status})</span>
//                       <button
//                         className="btn-icon-delete"
//                         onClick={() => handleDeleteStockAlert(alert.id)}
//                         disabled={isLoadingAction}
//                         title="Delete this alert"
//                       >
//                         <Trash2 size={16} />
//                       </button>
//                     </div>
//                   ))
//                 ) : (
//                   <p className="empty-state">No active stock alerts.</p>
//                 )}
//               </div>
//             </div>
//           </div>
//           <div className="card">
//             <div className="card-title-wrapper">
//               <h3 className="card-title">
//                 <DollarSign className="title-icon text-yellow" /> Stock Alerts
//               </h3>
//               <button
//                 className="card-title-toggle"
//                 onClick={() => setIsStockAlertsVisible((p) => !p)}
//               >
//                 {isStockAlertsVisible ? <ChevronUp /> : <ChevronDown />}
//               </button>
//             </div>
//             {isStockAlertsVisible && (
//               <div className="card-content">
//                 {stockAlerts.filter((a) => a.status === "triggered").length >
//                 0 ? (
//                   stockAlerts
//                     .filter((a) => a.status === "triggered")
//                     .map((alert) => (
//                       <div key={alert.id} className="list-item-success">
//                         <div className="list-item-content-icon">
//                           <div className="list-icon-wrapper-green">
//                             <TrendingUp className="list-icon" />
//                           </div>
//                           <div>
//                             <p className="list-item-title">
//                               {alert.ticker} reached target of $
//                               {alert.targetPrice}!
//                               <button
//                                 className="btn-icon-delete"
//                                 onClick={() => handleDeleteStockAlert(alert.id)}
//                                 disabled={isLoadingAction}
//                                 title="Delete this alert"
//                               >
//                                 <Trash2 size={16} />
//                               </button>
//                             </p>
//                             <p className="list-item-summary-green">
//                               Current price: $
//                               {alert.currentPrice
//                                 ? alert.currentPrice.toFixed(2)
//                                 : "Updating..."}
//                             </p>
//                             <p className="list-item-meta">
//                               {alert.triggeredAt
//                                 ? new Date(
//                                     alert.triggeredAt.seconds * 1000
//                                   ).toLocaleString()
//                                 : alert.createdAt
//                                 ? new Date(
//                                     alert.createdAt.seconds * 1000
//                                   ).toLocaleString()
//                                 : "Recently"}
//                             </p>
//                           </div>
//                         </div>
//                         {/* <button
//                           className="btn-icon-delete"
//                           onClick={() => handleDeleteStockAlert(alert.id)}
//                           disabled={isLoadingAction}
//                           title="Delete this alert"
//                         >
//                           <Trash2 size={16} />
//                         </button> */}
//                       </div>
//                     ))
//                 ) : (
//                   <p className="empty-state">No triggered alerts.</p>
//                 )}
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Global Messages and Modals */}
//       {error && <div className="global-message error-message">{error}</div>}
//       {actionStatus && (
//         <div className="global-message success-message">{actionStatus}</div>
//       )}
//       {isReviewModalOpen && (
//         <div className="modal-overlay">
//           <div className="modal-content">
//             <button
//               className="modal-close"
//               onClick={() => setIsReviewModalOpen(false)}
//             >
//               <X />
//             </button>
//             <h2 className="card-title">AI Pull Request Review</h2>
//             {isReviewLoading ? (
//               <p>Analyzing code changes...</p>
//             ) : (
//               <pre className="review-text">{reviewContent}</pre>
//             )}
//           </div>
//         </div>
//         </>
//       )}
//     </div>
//   );
// }
import React, { useState, useEffect, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onIdTokenChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInWithCredential,
} from "firebase/auth";
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
  Lock,
  Trash2,
  Download,
  Sparkles,
  Zap,
} from "lucide-react";

import "./App.css";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Helper Components ---
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

const renderMarkdown = (text) => {
  if (!text) return "";

  return (
    text
      // Headers
      .replace(
        /^### (.*$)/gm,
        '<h3 style="margin: 16px 0 8px 0; font-weight: 600; color: #5f7a7d;">$1</h3>'
      )
      .replace(
        /^## (.*$)/gm,
        '<h2 style="margin: 20px 0 12px 0; font-weight: 600; color: #5f7a7d; font-size: 1.25rem;">$1</h2>'
      )
      .replace(
        /^# (.*$)/gm,
        '<h1 style="margin: 24px 0 16px 0; font-weight: 600; color: #5f7a7d; font-size: 1.5rem;">$1</h1>'
      )

      // Bold text
      .replace(
        /\*\*(.*?)\*\*/g,
        '<strong style="font-weight: 600; color: #5f7a7d;">$1</strong>'
      )

      // Italic text
      .replace(/\*(.*?)\*/g, "<em>$1</em>")

      // Line breaks and paragraphs
      .replace(/\n\n/g, '</p><p style="margin: 12px 0; line-height: 1.6;">')
      .replace(/\n/g, "<br>")

      // Wrap in paragraph tags
      .replace(
        /^(?!<[h|p])(.)/gm,
        '<p style="margin: 12px 0; line-height: 1.6;">$1'
      )
      .replace(/(?<!>)(.)$/gm, "$1</p>")

      // Clean up
      .replace(/<p[^>]*><\/p>/g, "")
      .replace(/<p[^>]*>(<[h1-6])/g, "$1")
      .replace(/(<\/[h1-6]>)<\/p>/g, "$1")
  );
};

function App() {
  // --- Auth State ---
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false);
  const [isGithubLoggedIn, setIsGithubLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [momentumScore, setMomentumScore] = useState(0);
  const [nextAction, setNextAction] = useState("");
  // --- Integration Status State ---
  const [isGithubAppInstalled, setIsGithubAppInstalled] = useState(false);
  const [isNotionConnected, setIsNotionConnected] = useState(false);

  // --- UI & Data State ---
  const [error, setError] = useState("");
  const [actionStatus, setActionStatus] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [orders, setOrders] = useState([]);
  const [snippets, setSnippets] = useState([]);
  const [researchTasks, setResearchTasks] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [summary, setSummary] = useState("");
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [loadingActionName, setLoadingActionName] = useState("");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewContent, setReviewContent] = useState("");
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [meetingSlots, setMeetingSlots] = useState([]);
  const [isFindingTimes, setIsFindingTimes] = useState(false);
  const [researchTopic, setResearchTopic] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState(null);
  const [stockTicker, setStockTicker] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [isSettingAlert, setIsSettingAlert] = useState(false);
  const [composeRequest, setComposeRequest] = useState("");
  const [composedText, setComposedText] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [deletingNotificationId, setDeletingNotificationId] = useState(null);
  const [deletingSnippetId, setDeletingSnippetId] = useState(null);
  const [deletingOrderId, setDeletingOrderId] = useState(null);
  const [downloadingTaskId, setDownloadingTaskId] = useState(null);
  const [followUpQuery, setFollowUpQuery] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [deletingTaskId, setDeletingTaskId] = useState(null);

  // --- UI Visibility State ---
  const [expandedTasks, setExpandedTasks] = useState({});
  const [isGithubFeedVisible, setIsGithubFeedVisible] = useState(false);
  const [isSnippetsVisible, setIsSnippetsVisible] = useState(false);
  const [isOrdersVisible, setIsOrdersVisible] = useState(false);
  const [isResearchTasksVisible, setIsResearchTasksVisible] = useState(false);
  const [isStockAlertsVisible, setIsStockAlertsVisible] = useState(false);

  const isAuthenticated = !!user;

  const isExtension =
    typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;

  const authedFetch = useCallback(
    async (url, options = {}) => {
      if (!idToken) {
        throw new Error("User is not authenticated. Please log in.");
      }
      const headers = {
        ...options.headers,
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      };

      const response = await fetch(
        `https://alturaai-production.up.railway.app${url}`,
        {
          ...options,
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "API request failed");
      }

      return response.json();
    },
    [idToken]
  );
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

  const toggleTaskExpansion = (taskId) => {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  // Helper function to reset UI states
  const resetActionStates = () => {
    setSummary("");
    setError("");
    setActionStatus("");
    setMeetingSlots([]);
    setComposedText("");
    setNextAction("");
  };

  // --- FIREBASE AUTH & STATUS LISTENER (FIXED) ---

  // ...
  // useEffect(() => {
  //   const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
  //     if (currentUser) {
  //       const token = await currentUser.getIdToken(true);
  //       setUser(currentUser);
  //       setIdToken(token);

  //       // FIX: Store the ID token in local storage for the background script
  //       chrome.storage.local.set({ idToken: token });

  //       try {
  //         const response = await fetch(
  //           "https://alturaai-production.up.railway.app/api/auth/status",
  //           {
  //             headers: {
  //               Authorization: `Bearer ${token}`,
  //             },
  //           }
  //         );
  //         const status = await response.json();
  //         if (status && status.connections) {
  //           setIsGoogleLoggedIn(status.connections.isGoogleLoggedIn || false);
  //           setIsGithubAppInstalled(
  //             status.connections.isGithubAppInstalled || false
  //           );
  //           setIsNotionConnected(status.connections.isNotionConnected || false);
  //         }
  //       } catch (err) {
  //         console.error("Failed to fetch status after login:", err);
  //       }
  //     } else {
  //       setUser(null);
  //       setIdToken(null);
  //       setIsGoogleLoggedIn(false);
  //       setIsGithubAppInstalled(false);
  //       setIsNotionConnected(false);

  //       // FIX: Remove the token from storage on logout
  //       chrome.storage.local.remove(["idToken"]);
  //     }
  //     setIsLoadingAuth(false);
  //   });
  //   return () => unsubscribe();
  // }, []);
  // ADD THIS INSTEAD
  useEffect(() => {
    // Function to check storage and update React state
    const syncAuthState = async () => {
      try {
        const result = await chrome.storage.local.get([
          "isAuthenticated",
          "userInfo",
          "authToken", // Use the token from chrome.identity
        ]);

        if (result.isAuthenticated && result.userInfo) {
          setUser(result.userInfo);
          setIdToken(result.authToken); // This will power your authedFetch
        } else {
          setUser(null);
          setIdToken(null);
        }
      } catch (e) {
        console.error("Error syncing auth state:", e);
        setUser(null);
        setIdToken(null);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    // Check the state immediately when the app loads
    syncAuthState();

    // Listen for changes from the background script
    const listener = (changes, namespace) => {
      if (
        namespace === "local" &&
        (changes.isAuthenticated || changes.userInfo || changes.authToken)
      ) {
        console.log("Auth state changed from background, re-syncing...");
        syncAuthState();
      }
    };

    chrome.storage.onChanged.addListener(listener);

    // Cleanup function to remove the listener when the component unmounts
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []); // Empty dependency array ensures this runs only once on mount
  useEffect(() => {
    if (!user) return;

    const listeners = [
      onSnapshot(
        query(
          collection(db, "users", user.id, "notifications"),
          orderBy("timestamp", "desc")
        ),
        (snapshot) =>
          setNotifications(
            snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
          )
      ),
      onSnapshot(
        query(
          collection(db, "users", user.id, "orders"),
          orderBy("scannedAt", "desc")
        ),
        (snapshot) =>
          setOrders(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
      ),
      onSnapshot(
        query(
          collection(db, "users", user.id, "snippets"),
          orderBy("savedAt", "desc")
        ),
        (snapshot) =>
          setSnippets(
            snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
          )
      ),
      onSnapshot(
        query(
          collection(db, "users", user.id, "research_tasks"),
          orderBy("createdAt", "desc")
        ),
        (snapshot) =>
          setResearchTasks(
            snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
          )
      ),
      onSnapshot(
        query(
          collection(db, "users", user.id, "stock_alerts"),
          orderBy("createdAt", "desc")
        ),
        (snapshot) =>
          setStockAlerts(
            snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
          )
      ),
    ];
    return () => listeners.forEach((unsubscribe) => unsubscribe());
  }, [user]);

  useEffect(() => {
    if (actionStatus) {
      const timer = setTimeout(() => {
        setActionStatus("");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [actionStatus]);

  useEffect(() => {
    if (isExtension) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          setCurrentUrl(tabs[0].url);
        }
      });
    }
  }, [isExtension]);

  // --- UTILITY FUNCTIONS ---
  const formatTimestamp = (timestamp) => {
    try {
      if (!timestamp) return "Unknown time";

      let date;

      // Handle Firestore Timestamp objects
      if (timestamp && typeof timestamp === "object" && timestamp.seconds) {
        // Firestore Timestamp format: { seconds: number, nanoseconds: number }
        date = new Date(timestamp.seconds * 1000);
      }
      // Handle Firestore Timestamp with toDate() method
      else if (timestamp && typeof timestamp.toDate === "function") {
        date = timestamp.toDate();
      }
      // Handle regular JavaScript timestamp (number)
      else if (typeof timestamp === "number") {
        date = new Date(timestamp);
      }
      // Handle string timestamps
      else if (typeof timestamp === "string") {
        date = new Date(timestamp);
      }
      // Handle Date objects
      else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        console.warn("Unknown timestamp format:", timestamp);
        return "Invalid date format";
      }

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid date created from timestamp:", timestamp);
        return "Invalid date";
      }

      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      // Return relative time for recent timestamps
      if (diffMins < 1) return "Just now";
      else if (diffMins < 60) return `${diffMins}m ago`;
      else if (diffHours < 24) return `${diffHours}h ago`;
      else if (diffDays < 7) return `${diffDays}d ago`;
      else {
        // For older timestamps, return full date and time
        return (
          date.toLocaleDateString() +
          " " +
          date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        );
      }
    } catch (error) {
      console.error(
        "Error formatting timestamp:",
        error,
        "Timestamp:",
        timestamp
      );
      return "Date error";
    }
  };

  // --- HANDLER FUNCTIONS ---
  // const handleLoginClick = () => {
  //   // Use the Chrome Identity API to get an OAuth token.
  //   chrome.identity.getAuthToken({ interactive: true }, (token) => {
  //     if (chrome.runtime.lastError || !token) {
  //       console.error(chrome.runtime.lastError);
  //       setError("Google sign-in failed. Please try again.");
  //       return;
  //     }

  //     // Now, use the token to sign into Firebase.
  //     const credential = GoogleAuthProvider.credential(null, token);

  //     signInWithCredential(auth, credential).catch((error) => {
  //       console.error("Firebase sign-in error:", error);
  //       setError("Could not sign in with Firebase.");
  //     });
  //   });
  // };
  // const handleLoginClick = async () => {
  //   const provider = new GoogleAuthProvider();
  //   try {
  //     // This opens a universal popup that works in all browsers
  //     await signInWithPopup(auth, provider);
  //     // Your onIdTokenChanged listener will automatically detect the successful login
  //   } catch (error) {
  //     console.error("Firebase sign-in error:", error);
  //     setError("Google sign-in failed. Please try again.");
  //   }
  // };
  const handleLoginClick = () => {
    const authPageUrl = chrome.runtime.getURL("auth.html");
    // Open the auth page in a new, small popup window
    window.open(authPageUrl, "authWindow", "width=400,height=600");
  };
  // App.jsx
  const handleConnectGoogle = async () => {
    if (!idToken) return setError("Please log in first.");

    try {
      const response = await authedFetch("/api/auth/google", { method: "GET" });
      if (response.url) {
        // Open the new tab for the user to grant permissions
        chrome.tabs.create({ url: response.url });
      }
    } catch (e) {
      setError("Failed to start Google connection.");
    }
  };
  // AFTER (Works with your background script)
  const handleLogout = () => {
    // Send a message to the background script to handle the logout.
    chrome.runtime.sendMessage({ action: "LOGOUT" }, () => {
      // The UI will update automatically thanks to our storage listener,
      // but we can also clear the state here for an instant visual change.
      setUser(null);
      setIdToken(null);
    });
  };
  // In app.jsx
  // In App.jsx, replace the entire handleAction function
  const handleAction = useCallback(
    (action, actionName) => {
      if (!idToken) {
        setError("Please log in to perform this action.");
        return;
      }
      setIsLoadingAction(true);
      setLoadingActionName(actionName);
      setSummary("");
      setNextAction("");
      setError("");
      setActionStatus("");

      chrome.runtime.sendMessage(
        { action: action, type: action },
        (response) => {
          if (response && response.error) {
            setError(response.error);
          } else if (response && response.summary) {
            setSummary(response.summary);
          } else if (response && response.message) {
            setActionStatus(response.message);
          } else if (response && response.nextAction) {
            // FIX: Correctly set the persistent 'nextAction' state
            setNextAction(response.nextAction);
          }
          setIsLoadingAction(false);
          setLoadingActionName("");
        }
      );
    },
    [idToken]
  );
  // const handleAction = useCallback(
  //   (action, actionName) => {
  //     if (!idToken) {
  //       setError("Please log in to perform this action.");
  //       return;
  //     }

  //     setIsLoadingAction(true);
  //     setLoadingActionName(actionName);
  //     resetActionStates();

  //     // First get the active tab
  //     chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  //       if (!tabs[0]) {
  //         setIsLoadingAction(false);
  //         setError("No active tab found");
  //         return;
  //       }

  //       // Then get the page content
  //       chrome.tabs.sendMessage(
  //         tabs[0].id,
  //         { action: "get_page_content" },
  //         async (response) => {
  //           if (chrome.runtime.lastError) {
  //             setIsLoadingAction(false);
  //             setError("Please refresh the page and try again");
  //             return;
  //           }

  //           try {
  //             // Send to your backend
  //             const result = await authedFetch("/api/analyze", {
  //               method: "POST",
  //               body: JSON.stringify({
  //                 action,
  //                 content: response.content,
  //                 url: tabs[0].url,
  //               }),
  //             });

  //             if (result.summary) {
  //               setSummary(result.summary);
  //             }
  //             setActionStatus(`${actionName} completed successfully!`);
  //           } catch (error) {
  //             setError(error.message);
  //           } finally {
  //             setIsLoadingAction(false);
  //             setLoadingActionName("");
  //           }
  //         }
  //       );
  //     });
  //   },
  //   [idToken, authedFetch]
  // );
  const handleCompose = useCallback(() => {
    if (!composeRequest.trim()) {
      return setError("Please enter a request for the composer.");
    }
    setIsComposing(true);
    resetActionStates();

    // Sends only the user's request, no page content
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
        }
        setIsComposing(false);
      }
    );
  }, [composeRequest]);

  const handleReviewPR = useCallback(
    async (prUrl) => {
      if (!idToken) return setError("Please log in to review a PR.");
      setIsReviewModalOpen(true);
      setIsReviewLoading(true);
      setReviewContent("");
      setError("");
      try {
        const data = await authedFetch("/api/github/pr/review", {
          method: "POST",
          body: JSON.stringify({ prUrl }),
        });
        setReviewContent(data.review);
      } catch (err) {
        setReviewContent(`Error: ${err.message}`);
      } finally {
        setIsReviewLoading(false);
      }
    },
    [authedFetch, idToken]
  );
  const handleFindMeetingTimes = async () => {
    setIsFindingTimes(true);
    resetActionStates();
    try {
      const data = await authedFetch("/api/calendar/find-times", {
        method: "POST",
      });
      const freeSlots = findFreeSlots(data.busyTimes);
      setMeetingSlots(freeSlots);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsFindingTimes(false);
    }
  };
  const handleNotificationClick = (notification) => {
    if (notification.type === "pr" && notification.message.includes("opened")) {
      handleReviewPR(notification.url);
    } else if (notification.url && isExtension) {
      chrome.tabs.create({ url: notification.url });
    }
  };

  // const handleInstallGitHubApp = useCallback(async () => {
  //   if (!idToken) return setError("Please log in first.");
  //   try {
  //     const data = await authedFetch("/api/github/install");
  //     if (data.url && isExtension) {
  //       chrome.tabs.create({ url: data.url });
  //       setTimeout(() => {
  //         console.log("Re-checking auth status after installation attempt...");
  //         chrome.runtime.sendMessage({ action: "check_auth_status" });
  //       }, 5000);
  //     }
  //   } catch (e) {
  //     setError("Could not connect to the GitHub App service.");
  //   }
  // }, [authedFetch, idToken, isExtension]);
  const handleInstallGitHubApp = useCallback(async () => {
    if (!idToken) return setError("Please log in first.");
    try {
      const data = await authedFetch("/api/github/install");
      if (data.url && isExtension) {
        // This just opens the tab. The user will manually return and reopen the popup later.
        chrome.tabs.create({ url: data.url });
      }
    } catch (e) {
      setError("Could not connect to the GitHub App service.");
    }
  }, [authedFetch, idToken, isExtension]);
  const handleStartResearch = async () => {
    if (!researchTopic.trim()) {
      setError("Please enter a research topic.");
      return;
    }
    setIsResearching(true);
    resetActionStates();
    try {
      const data = await authedFetch("/api/research/start", {
        method: "POST",
        body: JSON.stringify({ topic: researchTopic }),
      });
      setActionStatus(data.message);
      setResearchTopic("");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsResearching(false);
    }
  };
  const handleSummarize = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Add timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out")), 15000)
      );

      const responsePromise = new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: "get_page_content" },
            resolve
          );
        });
      });

      const response = await Promise.race([responsePromise, timeoutPromise]);

      if (!response?.success) {
        throw new Error(response?.error || "Failed to get page content");
      }
      const result = await authedFetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "summarize",
          content: response.content,
          url: currentTab.url,
        }),
      });

      if (result.success && result.summary) {
        setSummary(result.summary);
      } else {
        throw new Error(result.error || "Failed to summarize content");
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  const handleDownloadResearchPDF = async (taskId, taskTopic) => {
    if (downloadingTaskId) return;

    setDownloadingTaskId(taskId);

    try {
      const response = await fetch(
        `https://alturaai-production.up.railway.app/api/research/task/${taskId}/download`,
        {
          headers: { Authorization: `Bearer ${idToken}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to download PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const filename = `research-${taskTopic
        .replace(/[^a-zA-Z0-9]/g, "-")
        .toLowerCase()}-${taskId}.pdf`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setActionStatus("PDF downloaded successfully!");
    } catch (error) {
      setError(`Failed to download PDF: ${error.message}`);
    } finally {
      setDownloadingTaskId(null);
    }
  };

  const handleDeleteResearchTask = async (taskId) => {
    if (deletingTaskId) return;

    setDeletingTaskId(taskId);
    resetActionStates();

    try {
      const data = await authedFetch(`/api/research/task/${taskId}`, {
        method: "DELETE",
      });

      setResearchTasks((prev) => prev.filter((task) => task.id !== taskId));
      setActionStatus("Research task deleted successfully.");
    } catch (err) {
      setError(`Failed to delete research task: ${err.message}`);
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handleScanOrders = useCallback(async () => {
    setIsScanning(true);
    resetActionStates();
    try {
      const data = await authedFetch("/api/orders/scan-inbox", {
        method: "POST",
      });
      setActionStatus(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsScanning(false);
    }
  }, [authedFetch]);

  const handleStartTracking = async (order) => {
    setTrackingOrderId(order.id);
    resetActionStates();
    try {
      const data = await authedFetch("/api/orders/add-tracking", {
        method: "POST",
        body: JSON.stringify({
          orderId: order.id,
          trackingNumber: order.trackingNumber,
        }),
      });
      setActionStatus(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setTrackingOrderId(null);
    }
  };

  const handleDeleteOrder = useCallback(
    async (orderId) => {
      if (deletingOrderId) return;

      setDeletingOrderId(orderId);
      resetActionStates();

      try {
        const data = await authedFetch(`/api/orders/${orderId}`, {
          method: "DELETE",
        });

        setOrders((prev) => prev.filter((order) => order.id !== orderId));
        setActionStatus("Order deleted successfully.");
      } catch (err) {
        setError(`Failed to delete order: ${err.message}`);
      } finally {
        setDeletingOrderId(null);
      }
    },
    [authedFetch]
  );

  const handleSetStockAlert = async () => {
    if (!stockTicker.trim() || !targetPrice.trim()) {
      setError("Please enter a stock ticker and a target price.");
      return;
    }
    setIsSettingAlert(true);
    resetActionStates();

    try {
      // Step 1: Set the alert in the database as before.
      const setData = await authedFetch("/api/stocks/add-alert", {
        method: "POST",
        body: JSON.stringify({
          ticker: stockTicker,
          targetPrice: targetPrice,
        }),
      });
      setActionStatus(setData.message); // Show "Alert set..."

      // Step 2: Immediately trigger a manual check for all active alerts.
      // We reuse the same logic from the "Refresh" button we discussed before.
      const checkData = await authedFetch("/api/stocks/check-now", {
        method: "POST",
      });

      // Optionally, update the status message if an alert was triggered instantly.
      if (checkData.message && checkData.message.includes("triggered")) {
        setActionStatus("Alert set and triggered instantly!");
      }

      setStockTicker("");
      setTargetPrice("");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSettingAlert(false);
    }
  };

  const handleDeleteStockAlert = async (alertId) => {
    if (isLoadingAction) return;

    try {
      const data = await authedFetch(`/api/stocks/alert/${alertId}`, {
        method: "DELETE",
      });

      setActionStatus("Stock alert removed.");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    setDeletingNotificationId(notificationId);
    try {
      await authedFetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });

      setNotifications((prev) =>
        prev.filter((notif) => notif.id !== notificationId)
      );
      setActionStatus("Notification deleted");
    } catch (err) {
      setError(`Failed to delete notification: ${err.message}`);
    } finally {
      setDeletingNotificationId(null);
    }
  };

  const handleDeleteSnippet = useCallback(
    async (snippetId) => {
      if (!idToken) return setError("Please log in to delete snippets.");

      setDeletingSnippetId(snippetId);
      try {
        const data = await authedFetch(`/api/snippets/${snippetId}`, {
          method: "DELETE",
        });

        setActionStatus(data.message);
      } catch (err) {
        setError(`Failed to delete snippet: ${err.message}`);
      } finally {
        setDeletingSnippetId(null);
      }
    },
    [authedFetch, idToken]
  );

  const handleDebugFollowUp = async () => {
    if (!followUpQuery.trim()) return;

    setIsLoadingAction(true);
    const currentAnalysis = summary;

    try {
      const data = await authedFetch("/api/debug/followup", {
        method: "POST",
        body: JSON.stringify({
          previousAnalysis: currentAnalysis,
          newQuery: followUpQuery,
        }),
      });

      const updatedSummary = `${currentAnalysis}\n\n---\n\n**My Follow-up:** ${followUpQuery}\n\n**AlturaAI:**\n${data.summary}`;
      setSummary(updatedSummary);
      setFollowUpQuery("");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoadingAction(false);
    }
  };

  // In App.jsx
  const handleConnectNotion = useCallback(async () => {
    if (!idToken) return setError("Please log in first.");
    try {
      const data = await authedFetch("/api/auth/notion");
      if (data.url && isExtension) {
        // FIX: Tell the background script that a Notion connection has started
        chrome.runtime.sendMessage({ action: "notion_auth_start" }, () => {
          chrome.tabs.create({ url: data.url });
        });
      }
    } catch (e) {
      setError("Could not connect to the Notion service.");
    }
  }, [authedFetch, idToken, isExtension]);
  // Loading screen
  if (isLoadingAuth) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Authenticating...</p>
      </div>
    );
  }

  // --- RENDER ---
  return (
    <div className={`container ${!isAuthenticated ? "unauthenticated" : ""}`}>
      {!isAuthenticated ? (
        <div className="auth-overlay">
          <div className="auth-modal">
            <Lock size={48} />
            <h2 className="auth-modal-title">Welcome to AlturaAI</h2>
            <p className="auth-modal-subtitle">
              Please sign in with Google to continue.
            </p>
            <button className="btn-auth-modal" onClick={handleLoginClick}>
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>
            {error && <p className="auth-error">{error}</p>}
          </div>
        </div>
      ) : (
        <>
          <header className="app-header">
            <div className="header-left">
              <div className="logo">
                <span className="logo-text">AlturaAI</span>
              </div>
              <div className="auth-sec">
                {isAuthenticated && !isGoogleLoggedIn ? (
                  <button className="btn-login" onClick={handleConnectGoogle}>
                    <GoogleIcon />
                    <span>Connect Google</span>
                  </button>
                ) : (
                  <div className="status-indicator-green">
                    <div className="status-dot animate-pulse"></div>
                    <GoogleIcon />
                    <span>Google Connected</span>
                  </div>
                )}

                {isGithubAppInstalled ? (
                  <div className="status-indicator-green">
                    <div className="status-dot animate-pulse"></div>
                    <GithubIcon />
                    <span>App Installed</span>
                  </div>
                ) : (
                  <button
                    className="btn-login"
                    onClick={handleInstallGitHubApp}
                  >
                    <GithubIcon />
                    <span>Install App</span>
                  </button>
                )}

                {isNotionConnected ? (
                  <div className="status-indicator-green">
                    <div className="status-dot animate-pulse"></div>
                    <BookOpen className="login-icon" />
                    <span>Notion Connected</span>
                  </div>
                ) : (
                  <button className="btn-login" onClick={handleConnectNotion}>
                    <BookOpen className="login-icon" />
                    <span>Connect Notion</span>
                  </button>
                )}
              </div>
            </div>
            <div className="header-right">
              {isAuthenticated && (
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
              {/* AI Content Composer Card */}
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
                  {composedText && (
                    <pre className="result-box">{composedText}</pre>
                  )}
                </div>
              </div>

              {/* Research Card */}
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
                        const isLongText =
                          task.result && task.result.length > 150;
                        return (
                          <div
                            key={task.id}
                            className="list-item research-task-item"
                          >
                            <div className="list-item-content">
                              <div className="list-item-header">
                                <h5 className="list-item-title">
                                  {task.topic}
                                </h5>
                                <div className="task-header-actions">
                                  {task.status === "in-progress" && (
                                    <div className="status-dot-yellow animate-pulse" />
                                  )}
                                  {task.status === "completed" && (
                                    <button
                                      className="btn-icon-download"
                                      onClick={() =>
                                        handleDownloadResearchPDF(
                                          task.id,
                                          task.topic
                                        )
                                      }
                                      disabled={downloadingTaskId === task.id}
                                      title="Download PDF"
                                    >
                                      {downloadingTaskId === task.id ? (
                                        <div className="status-dot animate-pulse" />
                                      ) : (
                                        <Download size={16} />
                                      )}
                                    </button>
                                  )}
                                  <button
                                    className="btn-icon-delete"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteResearchTask(task.id);
                                    }}
                                    disabled={deletingTaskId === task.id}
                                    title="Delete research task"
                                  >
                                    {deletingTaskId === task.id ? (
                                      <div className="status-dot animate-pulse" />
                                    ) : (
                                      <Trash2 size={16} />
                                    )}
                                  </button>
                                </div>
                              </div>
                              {task.status === "completed" && (
                                <>
                                  <div
                                    className="list-item-summary"
                                    dangerouslySetInnerHTML={{
                                      __html:
                                        isLongText && !isExpanded
                                          ? renderMarkdown(
                                              task.result.substring(0, 150)
                                            ) + "..."
                                          : renderMarkdown(task.result),
                                    }}
                                  />
                                  {isLongText && (
                                    <button
                                      className="btn-show-more"
                                      onClick={() =>
                                        toggleTaskExpansion(task.id)
                                      }
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
                          </div>
                        );
                      })
                    ) : (
                      <p className="empty-state">
                        No research tasks initiated.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            {/* Right Column */}
            <div className="grid-column">
              {/* Quick Actions Card */}
              <div className="card">
                <h3 className="card-title">Quick Actions</h3>
                <div className="quick-actions-grid">
                  <button
                    className="btn btn-tertiary"
                    onClick={() => handleAction("debug_page", "Debug")}
                    disabled={isLoadingAction}
                  >
                    <Code className="btn-icon" />
                    <span>
                      {isLoadingAction && loadingActionName === "Debug"
                        ? "Debugging..."
                        : "Debug Page"}
                    </span>
                  </button>
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
                    disabled={!isNotionConnected || isLoadingAction}
                  >
                    <BookOpen className="btn-icon" />
                    <span>
                      {isLoadingAction && loadingActionName === "Notion"
                        ? "..."
                        : "Notion Doc"}
                    </span>
                  </button>
                  {/* <button
                    className="btn btn-tertiary"
                    onClick={handleFindMeetingTimes}
                    disabled={isFindingTimes || !isGoogleLoggedIn}
                  >
                    <Calendar className="btn-icon" />
                    <span>
                      {isFindingTimes ? "Finding..." : "Find Meeting Times"}
                    </span>
                  </button> */}
                </div>
                {summary && (
                  <>
                    <div
                      className="result-box"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(summary),
                      }}
                    />
                    <div
                      className="follow-up-container"
                      style={{ marginTop: "1rem" }}
                    >
                      <textarea
                        placeholder="Ask a follow-up question..."
                        className="input-textarea"
                        value={followUpQuery}
                        onChange={(e) => setFollowUpQuery(e.target.value)}
                        disabled={isLoadingAction}
                      />
                      <button
                        className="btn btn-secondary"
                        onClick={handleDebugFollowUp}
                        disabled={isLoadingAction}
                        style={{ marginTop: "0.5rem" }}
                      >
                        {isLoadingAction ? "Thinking..." : "Send Follow-up"}
                      </button>
                    </div>
                  </>
                )}
                {meetingSlots.length > 0 && (
                  <div className="meeting-slots-list">
                    <h4 className="list-subtitle">Available Slots</h4>
                    {meetingSlots.map((slot, index) => (
                      <div key={index} className="list-item">
                        {slot.toLocaleString()}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stock Alerts Card */}
            </div>
            {/* Middle Column */}
            <div className="grid-column">
              {/* GitHub Feed Card */}
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
                    {isGithubAppInstalled ? (
                      notifications.filter(
                        (notif) =>
                          notif.type === "pr" ||
                          notif.type === "commit" ||
                          notif.type === "issue" ||
                          notif.repo
                      ).length > 0 ? (
                        notifications
                          .filter(
                            (notif) =>
                              notif.type === "pr" ||
                              notif.type === "commit" ||
                              notif.type === "issue" ||
                              notif.repo
                          )
                          .map((notif) => (
                            <div key={notif.id} className="list-item">
                              <div
                                className="list-item-content-icon interactive"
                                onClick={() => handleNotificationClick(notif)}
                              >
                                <div className="list-icon-wrapper-purple">
                                  <Code className="list-icon" />
                                </div>
                                <div>
                                  <p className="list-item-summary">
                                    {notif.message}
                                  </p>
                                  <p className="list-item-meta">
                                    {notif.repo} •{" "}
                                    {formatTimestamp(notif.timestamp)}
                                  </p>
                                </div>
                              </div>
                              <button
                                className="btn-icon-delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNotification(notif.id);
                                }}
                                disabled={deletingNotificationId === notif.id}
                                title="Delete notification"
                              >
                                {deletingNotificationId === notif.id ? (
                                  <div className="status-dot animate-pulse" />
                                ) : (
                                  <Trash2 size={16} />
                                )}
                              </button>
                            </div>
                          ))
                      ) : (
                        <p className="empty-state">
                          No GitHub notifications. Push a commit or open a PR.
                        </p>
                      )
                    ) : (
                      <p className="empty-state">
                        Install the GitHub App to see your feed.
                      </p>
                    )}
                  </div>
                )}
              </div>
              {/* //momentum builder */}
              <div className="card">
                <h3 className="card-title">
                  <Zap className="title-icon text-yellow" /> Momentum Builder
                </h3>
                <div className="card-content">
                  <div className="momentum-score">
                    <div className="score-ring" style={{ "--score": "85%" }}>
                      <span className="score-text">85</span>
                    </div>
                    <p className="score-label">Active Momentum</p>
                  </div>
                  <div className="next-step-section">
                    <h4 className="list-subtitle">Next Suggested Action</h4>
                    <p className="next-step-text">
                      {actionStatus || "Click to get a suggestion."}
                    </p>
                    <button
                      className="btn btn-secondary full-width"
                      onClick={() =>
                        handleAction("get_next_action", "Momentum Builder")
                      }
                      disabled={isLoadingAction}
                    >
                      {isLoadingAction ? "Thinking..." : "Get Next Action"}
                    </button>
                  </div>
                </div>
              </div>
              {/* Snippets Card */}
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
                              {snippet.url
                                ? new URL(snippet.url).hostname
                                : "No source"}
                            </span>
                          </div>
                          <button
                            className="btn-icon-delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSnippet(snippet.id);
                            }}
                            disabled={deletingSnippetId === snippet.id}
                            title="Delete snippet"
                          >
                            {deletingSnippetId === snippet.id ? (
                              <div className="status-dot animate-pulse" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="empty-state">
                        No snippets saved. Highlight text and right-click to
                        save.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Orders Card */}
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
                      disabled={!isAuthenticated || isScanning}
                    >
                      {isScanning ? "Scanning Gmail..." : "Scan for New Orders"}
                    </button>
                    <div className="task-list">
                      {isAuthenticated ? (
                        orders.length > 0 ? (
                          orders.map((order) => (
                            <div key={order.id} className="list-item">
                              <div className="list-item-content">
                                <div className="list-item-header">
                                  <div>
                                    <p className="list-item-title">
                                      {order.itemName}
                                    </p>
                                    <p className="list-item-meta">
                                      ETA: {order.eta} • Tracking:{" "}
                                      {order.trackingNumber}
                                    </p>
                                    {order.status && (
                                      <p className="list-item-meta">
                                        Status: {order.status}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    className="btn-icon-delete"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteOrder(order.id);
                                    }}
                                    disabled={deletingOrderId === order.id}
                                    title="Delete order"
                                  >
                                    {deletingOrderId === order.id ? (
                                      <div className="status-dot animate-pulse" />
                                    ) : (
                                      <Trash2 size={16} />
                                    )}
                                  </button>
                                </div>
                                <div className="order-actions">
                                  {order.trackingNumber &&
                                    order.trackingNumber !== "N/A" &&
                                    !order.aftershipTrackingId && (
                                      <button
                                        className="btn-track"
                                        onClick={() =>
                                          handleStartTracking(order)
                                        }
                                        disabled={trackingOrderId === order.id}
                                      >
                                        {trackingOrderId === order.id
                                          ? "Starting..."
                                          : "Start Live Tracking"}
                                      </button>
                                    )}
                                </div>
                              </div>
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
                    onChange={(e) =>
                      setStockTicker(e.target.value.toUpperCase())
                    }
                    disabled={isSettingAlert}
                  />
                  <input
                    type="number"
                    placeholder="Target Price in USD"
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
                  {stockAlerts.filter((a) => a.status === "active").length >
                  0 ? (
                    stockAlerts
                      .filter((a) => a.status === "active")
                      .map((alert) => (
                        <div key={alert.id} className="active-alert-item">
                          <span>
                            {alert.ticker} &gt; ${alert.targetPrice}{" "}
                          </span>
                          <span>({alert.status})</span>
                          <button
                            className="btn-icon-delete"
                            onClick={() => handleDeleteStockAlert(alert.id)}
                            disabled={isLoadingAction}
                            title="Delete this alert"
                          >
                            <Trash2 size={16} />
                          </button>
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
                    <DollarSign className="title-icon text-yellow" /> Stock
                    Alerts
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
                    {stockAlerts.filter((a) => a.status === "triggered")
                      .length > 0 ? (
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
                                  {alert.ticker} reached target of $
                                  {alert.targetPrice}!
                                  <button
                                    className="btn-icon-delete"
                                    onClick={() =>
                                      handleDeleteStockAlert(alert.id)
                                    }
                                    disabled={isLoadingAction}
                                    title="Delete this alert"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </p>
                                <p className="list-item-summary-green">
                                  Current price: $
                                  {alert.currentPrice
                                    ? alert.currentPrice.toFixed(2)
                                    : "Updating..."}
                                </p>
                                <p className="list-item-meta">
                                  {alert.triggeredAt
                                    ? new Date(
                                        alert.triggeredAt.seconds * 1000
                                      ).toLocaleString()
                                    : alert.createdAt
                                    ? new Date(
                                        alert.createdAt.seconds * 1000
                                      ).toLocaleString()
                                    : "Recently"}
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

          {/* Global Messages and Modals */}
          {error && <div className="global-message error-message">{error}</div>}
          {actionStatus && (
            <div className="global-message success-message">{actionStatus}</div>
          )}
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
        </>
      )}
    </div>
  );
}
export default App;
