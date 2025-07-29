// index.js
const express = require("express");
const cors = require("cors");
const config = require("./config");
const { logToFile } = require("./logger");
const razorpayRoutes = require("./routes/razorpay");
const bunnyRoutes = require("./routes/bunny");
const { requestLogger } = require("./middleware/requestLogger");

const app = express();

// --- Middleware ---
app.use(
  cors({
    origin: config.allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger); // Apply request logging middleware

// --- Routes ---
app.use("/razorpay", razorpayRoutes); // Mount Razorpay routes under /razorpay
app.use("/bunny", bunnyRoutes); // Mount Bunny CDN routes under /bunny

// --- Health Check ---
app.get("/", (req, res) => {
  res.send("🟢 Combined Razorpay and Bunny CDN API is running");
});

// --- Error Handling ---
app.use((req, res) => {
  // 404 Handler
  logToFile("WARN", `404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ success: false, error: "Route not found" });
});

app.use((err, req, res, next) => {
  // Global Error Handler
  logToFile("ERROR", "Unhandled error", {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });
  res
    .status(500)
    .json({
      success: false,
      error: "Internal server error",
      message: err.message,
    });
});

// --- Start Server ---
app.listen(config.port, () => {
  logToFile("SUCCESS", `Server started on port ${config.port}`);
  console.log(`Server listening on port ${config.port}`);
});

// --- Graceful Shutdown ---
process.on("SIGTERM", () => {
  logToFile("INFO", "SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logToFile("INFO", "SIGINT received, shutting down gracefully");
  process.exit(0);
});
