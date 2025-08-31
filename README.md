# AlturaAI Copilot

**AI-Powered Browser Extension for Enhanced Productivity**

AlturaAI Copilot is a powerful browser extension that acts as your AI-powered assistant, enhancing your browsing experience with a suite of intelligent tools. It integrates seamlessly into your browser, providing contextual analysis, research capabilities, and proactive assistance right where you need it.

> 🚧 **Work in Progress**: We are currently working on deploying the extension to Microsoft Store and other official browser extension stores. In the meantime, you can visit website at [https://alturaai-psi.vercel.app/](https://alturaai-psi.vercel.app/)

---

## ✨ Features

### **AI Content Composer**
Draft emails, create Notion documents, and compose other content with AI assistance.

### **Asynchronous Research**
Initiate research on any topic. The AI works in the background and you can download the completed report in PDF format.

### **Interactive Debugging**
- **Debug Page**: Analyze web pages for technical issues
- **Follow-up Questions**: Interact with the AI to ask further questions and get more detailed debugging help

### **Page Summarization**
Get concise summaries of any web page.

### **GitHub Integration**
- **Notifications**: Stay updated with your GitHub notifications directly within the extension
- **AI PR Review**: Leverage AI to review pull requests, providing suggestions and identifying potential issues

### **Momentum Builder**
Get intelligent suggestions for the next steps in your workflow.

### **Snippet Manager**
Save and organize useful code snippets.

### **Order Tracking**
View your recent orders in one place.

### **Stock Monitoring**
- **Real-time Prices**: Keep an eye on real-time stock prices
- **Custom Alerts**: Set up alerts for specific stock price targets

---

## 🛠️ Tech Stack

### **Frontend (`extension-frontend`)**
- **Framework**: React.js with Vite
- **Styling**: CSS
- **Authentication**: Firebase Authentication (Google & GitHub)
- **State Management**: React Hooks & Context API
- **Platform**: Chrome Extension APIs

### **Backend (`server-backend`)**
- **Framework**: Node.js with Express.js
- **AI**: Google Gemini
- **Database/Auth**: Firebase Admin SDK
- **APIs**: Google APIs (e.g., Gmail)
- **Deployment**: Railway

---

## 📂 Project Structure

The project is a monorepo with two main packages:

```
AlturaAI/
├── extension-frontend/  # The Chrome extension UI (React app)
└── server-backend/      # The Node.js backend server
```

- **`extension-frontend`**: Contains the React application that serves as the UI for the browser extension
- **`server-backend`**: The Express server that handles API requests, interacts with AI models, and manages authentication

---

## 🚀 Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/)

### 1. Backend Setup

First, set up the server which powers the extension.

```bash
# Navigate to the backend directory
cd server-backend

# Install dependencies
npm install
```

Create a `.env` file in the `server-backend` directory and add the following environment variables:

```env
# Port for the server
PORT=3001

# Your Google Gemini API Key
GEMINI_API_KEY=YOUR_GEMINI_API_KEY

# Firebase configuration (replace with your project's service account key)
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
```

### 2. Frontend Setup

Next, set up the React frontend for the extension.

```bash
# Navigate to the frontend directory
cd extension-frontend

# Install dependencies
npm install
```

Create a `.env` file in the `extension-frontend` directory and add your Firebase and backend configuration:

```env
# URL for your backend server
VITE_BACKEND_URL=http://localhost:3001

# Your Firebase project configuration
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
```

### 3. Running the Project

**Start the backend server:**
```bash
cd server-backend
npm start
```
The server will be running at `http://localhost:3001`.

**Build the frontend:**
```bash
cd extension-frontend
npm run build
```
This will create a `dist` folder with the compiled extension files.

### 4. Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** in the top right corner
3. Click on **Load unpacked**
4. Select the `extension-frontend/dist` directory

The AlturaAI Copilot extension should now be active in your browser!

---

## 📈 Usage

- Click the AlturaAI icon in your browser's toolbar to open the extension
- Sign in using your Google or GitHub account
- Use the "Summarize Page" or "Debug" buttons to analyze the current tab
- Use the research input to start a new research task

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any bugs or feature requests.

---

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for more details.
