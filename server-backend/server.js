// Import necessary packages
const express = require("express");
const cors = require("cors");
require("dotenv").config(); // Load environment variables from .env file

// Initialize the Express app
const app = express();

// Middleware
// Enable Cross-Origin Resource Sharing (CORS) so the extension can talk to the server
app.use(cors());
// Enable parsing of JSON in request bodies
app.use(express.json());

// A simple test route to make sure the server is working
app.get("/api/test", (req, res) => {
  res.json({ message: "Hello from the AlturaAI backend!" });
});

// Define the port the server will run on
// Use the PORT from the .env file, or default to 3001
const PORT = process.env.PORT || 3001;

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
