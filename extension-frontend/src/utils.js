// Helper function for authenticated API requests
const authedFetch = async (url, options = {}, token) => {
  if (!token) {
    throw new Error("User is not authenticated.");
  }

  const headers = {
    ...options.headers,
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  try {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}${url}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Request failed");
    }

    return response.json();
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
};

// Handle scanning orders
const handleScanOrders = async (
  token,
  setIsScanning,
  setActionStatus,
  setError
) => {
  setIsScanning(true);
  try {
    const data = await authedFetch(
      "/api/orders/scan-inbox",
      { method: "POST" },
      token
    );
    setActionStatus(data.message || "Orders scanned successfully");
  } catch (error) {
    setError(error.message || "Failed to scan orders");
    console.error("Scan orders error:", error);
  } finally {
    setIsScanning(false);
  }
};

// Export the functions
module.exports = {
  authedFetch,
  handleScanOrders,
};
