// // file: server.js (for SUBSCRIPTIONS - NO WEBHOOK - TESTING ONLY)

// const express = require("express");
// const Razorpay = require("razorpay");
// const cors = require("cors");
// const crypto = require("crypto");
// const path = require("path");
// const fs = require("fs");
// const axios = require("axios");
// const app = express();
// const port = 3000;
// const BUNNY_ACCESS_KEY = "91e0f89a-1220-466c-8a68473d9af8-1a19-4f12"; // Your secret key
// const BUNNY_STORAGE_URL = "https://storage.bunnycdn.com/aiimage/images/";
// const outputDir = path.join(__dirname, "lib", "generated");
// const outputFile = path.join(outputDir, "image_list.dart");

// // --- CONFIGURATION ---
// const RAZORPAY_KEY_ID = "rzp_test_HZbdFlzOmIGujn"; // Your Key ID
// const RAZORPAY_KEY_SECRET = "X6w1OO7AjBoo7Bcs2FBEEWAf"; // Your Key Secret

// // --- PASTE YOUR PLAN IDs FROM THE RAZORPAY DASHBOARD HERE ---
// const PLAN_IDS = {
//   starter: "plan_QnrSNHVulbbmH0", // Replace with your Starter Plan ID
//   basic: "plan_QnrSBPuzDDNSPQ", // Replace with your Basic Plan ID
//   premium: "plan_QnrSYli3ra0fD9", // Replace with your Premium Plan ID
// };
// // ----------------------------------------------------------------

// const razorpay = new Razorpay({
//   key_id: RAZORPAY_KEY_ID,
//   key_secret: RAZORPAY_KEY_SECRET,
// });

// app.use(cors());
// app.use(express.json());

// app.get("/", (req, res) => {
//   res.send("Razorpay SUBSCRIPTION server (NO WEBHOOK) is running!");
// });

// // Endpoint to create a subscription
// app.post("/create-subscription", async (req, res) => {
//   const { plan_id } = req.body;
//   console.log(`Received request to create subscription for plan: ${plan_id}`);

//   if (!plan_id || !Object.values(PLAN_IDS).includes(plan_id)) {
//     return res.status(400).json({ error: "A valid plan_id is required" });
//   }

//   // Creates an open-ended subscription that runs until cancelled.
//   // To create a fixed-term subscription (e.g., 12 months), add: total_count: 12
//   const options = {
//     plan_id: plan_id,
//     quantity: 1,
//     total_count: 3,
//   };

//   try {
//     const subscription = await razorpay.subscriptions.create(options);
//     console.log("Subscription created successfully:", subscription.id);
//     res.status(200).json(subscription);
//   } catch (error) {
//     console.error("Razorpay API Error:", error);
//     res.status(500).json({ error: "Razorpay API request failed" });
//   }
// });

// // Endpoint to verify the *initial* payment of a subscription
// app.post("/verify-payment", (req, res) => {
//   const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } =
//     req.body;

//   const body = razorpay_payment_id + "|" + razorpay_subscription_id;

//   const expectedSignature = crypto
//     .createHmac("sha256", RAZORPAY_KEY_SECRET)
//     .update(body.toString())
//     .digest("hex");

//   if (expectedSignature === razorpay_signature) {
//     console.log(
//       `Payment verification successful for subscription: ${razorpay_subscription_id}`
//     );
//     // In a real app, you would update your database here to mark the user's
//     // subscription as 'active' and grant them access to the service.
//     res.status(200).json({ status: "ok" });
//   } else {
//     console.error(
//       `Payment verification failed for subscription: ${razorpay_subscription_id}`
//     );
//     res.status(400).json({ status: "error", message: "Invalid signature" });
//   }
// });

// // The webhook endpoint has been removed for this version.
// // All logic for recurring payments, failures, and cancellations is GONE.

// app.listen(port, () => {
//   console.log(
//     `\nRazorpay server for SUBSCRIPTIONS listening at http://localhost:${port}`
//   );
//   console.log(`(For initial signup testing ONLY - NO WEBHOOKS)`);
//   console.log("Endpoints are:");
//   console.log(`  POST http://localhost:${port}/create-subscription`);
//   console.log(`  POST http://localhost:${port}/verify-payment`);
// });

const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3000;

// --- CONFIGURATION ---
const RAZORPAY_KEY_ID =
  process.env.RAZORPAY_KEY_ID || "rzp_test_HZbdFlzOmIGujn";
const RAZORPAY_KEY_SECRET =
  process.env.RAZORPAY_KEY_SECRET || "X6w1OO7AjBoo7Bcs2FBEEWAf";
const BUNNY_ACCESS_KEY =
  process.env.BUNNY_ACCESS_KEY || "91e0f89a-1220-466c-8a68473d9af8-1a19-4f12";
const BUNNY_STORAGE_URL = "https://storage.bunnycdn.com/aiimage/images/";

// Plan configuration with metadata
const PLAN_CONFIG = {
  starter: {
    id: "plan_QnrSNHVulbbmH0",
    name: "Starter Plan",
    features: [
      "Basic AI Image Generation",
      "10 images/month",
      "Standard Quality",
    ],
    maxImages: 10,
  },
  basic: {
    id: "plan_QnrSBPuzDDNSPQ",
    name: "Basic Plan",
    features: [
      "Enhanced AI Generation",
      "50 images/month",
      "HD Quality",
      "Priority Support",
    ],
    maxImages: 50,
  },
  premium: {
    id: "plan_QnrSYli3ra0fD9",
    name: "Premium Plan",
    features: [
      "Unlimited Generation",
      "Unlimited images",
      "4K Quality",
      "Priority Support",
      "API Access",
    ],
    maxImages: -1, // Unlimited
  },
};

// Get all plan IDs for validation
const PLAN_IDS = Object.values(PLAN_CONFIG).map((plan) => plan.id);

// Directory setup
const outputDir = path.join(__dirname, "lib", "generated");
const outputFile = path.join(outputDir, "image_list.dart");
const logsDir = path.join(__dirname, "logs");

// Ensure directories exist
[outputDir, logsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

// --- MIDDLEWARE ---
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// --- UTILITY FUNCTIONS ---

// Enhanced logging function
function logToFile(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data,
    pid: process.pid,
  };

  const logFile = path.join(
    logsDir,
    `${new Date().toISOString().split("T")[0]}.log`
  );
  const logLine = JSON.stringify(logEntry) + "\n";

  fs.appendFileSync(logFile, logLine);

  // Also log to console with colors
  const colors = {
    ERROR: "\x1b[31m",
    WARN: "\x1b[33m",
    INFO: "\x1b[36m",
    SUCCESS: "\x1b[32m",
    RESET: "\x1b[0m",
  };

  console.log(
    `${colors[level] || ""}[${timestamp}] ${level}: ${message}${colors.RESET}`
  );
  if (data) console.log(data);
}

// Validate plan ID
function validatePlanId(planId) {
  return PLAN_IDS.includes(planId);
}

// Get plan info by ID
function getPlanInfo(planId) {
  return Object.values(PLAN_CONFIG).find((plan) => plan.id === planId);
}

// Generate subscription reference ID
function generateSubscriptionRef() {
  return `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// --- API ENDPOINTS ---

// Health check endpoint
app.get("/", (req, res) => {
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();

  res.json({
    status: "running",
    message: "Enhanced Razorpay Subscription Server",
    version: "2.0.0",
    uptime: `${Math.floor(uptime / 60)} minutes`,
    memory: {
      used: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      total: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
    },
    endpoints: [
      "GET /health",
      "GET /plans",
      "POST /create-subscription",
      "POST /verify-payment",
      "GET /subscription/:id",
      "POST /cancel-subscription",
    ],
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "razorpay-subscription-server",
  });
});

// Get available plans
app.get("/plans", (req, res) => {
  try {
    const plans = Object.entries(PLAN_CONFIG).map(([key, config]) => ({
      key,
      id: config.id,
      name: config.name,
      features: config.features,
      maxImages: config.maxImages === -1 ? "Unlimited" : config.maxImages,
    }));

    logToFile("INFO", "Plans fetched successfully");
    res.json({ success: true, plans });
  } catch (error) {
    logToFile("ERROR", "Failed to fetch plans", error);
    res.status(500).json({ success: false, error: "Failed to fetch plans" });
  }
});

// Create subscription with enhanced validation and logging
app.post("/create-subscription", async (req, res) => {
  try {
    const { plan_id, customer_email, customer_name, notes } = req.body;

    logToFile("INFO", `Subscription creation request`, {
      plan_id,
      customer_email: customer_email || "not provided",
      ip: req.ip,
    });

    // Validation
    if (!plan_id) {
      return res.status(400).json({
        success: false,
        error: "plan_id is required",
        available_plans: PLAN_IDS,
      });
    }

    if (!validatePlanId(plan_id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid plan_id provided",
        available_plans: PLAN_IDS,
      });
    }

    const planInfo = getPlanInfo(plan_id);
    const subscriptionRef = generateSubscriptionRef();

    // Enhanced subscription options
    const options = {
      plan_id: plan_id,
      quantity: 1,
      total_count: 3, // 3 billing cycles for testing
      customer_notify: 1,
      notes: {
        plan_name: planInfo.name,
        reference: subscriptionRef,
        created_by: "api",
        customer_email: customer_email || "",
        custom_notes: notes || "",
        ...planInfo.features.reduce((acc, feature, index) => {
          acc[`feature_${index + 1}`] = feature;
          return acc;
        }, {}),
      },
    };

    // Add customer details if provided
    if (customer_email || customer_name) {
      options.customer = {};
      if (customer_email) options.customer.email = customer_email;
      if (customer_name) options.customer.name = customer_name;
    }

    const subscription = await razorpay.subscriptions.create(options);

    logToFile("SUCCESS", `Subscription created successfully`, {
      subscription_id: subscription.id,
      plan_name: planInfo.name,
      reference: subscriptionRef,
      status: subscription.status,
    });

    res.status(200).json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan_info: planInfo,
        reference: subscriptionRef,
        short_url: subscription.short_url,
        created_at: subscription.created_at,
      },
      message: `${planInfo.name} subscription created successfully`,
    });
  } catch (error) {
    logToFile("ERROR", "Subscription creation failed", {
      error: error.message,
      stack: error.stack,
      request_body: req.body,
    });

    // Handle specific Razorpay errors
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.error?.description || error.message,
        code: error.error?.code,
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to create subscription. Please try again.",
    });
  }
});

// Enhanced payment verification
app.post("/verify-payment", (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
      customer_email,
    } = req.body;

    logToFile("INFO", "Payment verification request", {
      payment_id: razorpay_payment_id,
      subscription_id: razorpay_subscription_id,
      customer_email: customer_email || "not provided",
    });

    // Validation
    if (
      !razorpay_payment_id ||
      !razorpay_subscription_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        error: "Missing required payment verification parameters",
      });
    }

    const body = razorpay_payment_id + "|" + razorpay_subscription_id;
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      logToFile("SUCCESS", "Payment verification successful", {
        payment_id: razorpay_payment_id,
        subscription_id: razorpay_subscription_id,
      });

      // Here you would typically:
      // 1. Update database with subscription status
      // 2. Send welcome email
      // 3. Grant access to services
      // 4. Log user activity

      res.status(200).json({
        success: true,
        status: "verified",
        message: "Payment verified successfully",
        subscription_id: razorpay_subscription_id,
        payment_id: razorpay_payment_id,
      });
    } else {
      logToFile("ERROR", "Payment verification failed - Invalid signature", {
        payment_id: razorpay_payment_id,
        subscription_id: razorpay_subscription_id,
        expected_signature: expectedSignature.substring(0, 10) + "...",
        received_signature: razorpay_signature.substring(0, 10) + "...",
      });

      res.status(400).json({
        success: false,
        status: "verification_failed",
        error: "Invalid payment signature",
      });
    }
  } catch (error) {
    logToFile("ERROR", "Payment verification error", error);
    res.status(500).json({
      success: false,
      error: "Payment verification failed due to server error",
    });
  }
});

// Get subscription details
app.get("/subscription/:id", async (req, res) => {
  try {
    const subscriptionId = req.params.id;

    if (!subscriptionId || !subscriptionId.startsWith("sub_")) {
      return res.status(400).json({
        success: false,
        error: "Invalid subscription ID format",
      });
    }

    const subscription = await razorpay.subscriptions.fetch(subscriptionId);
    const planInfo = getPlanInfo(subscription.plan_id);

    logToFile("INFO", "Subscription details fetched", {
      subscription_id: subscriptionId,
      status: subscription.status,
    });

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan_info: planInfo,
        current_start: subscription.current_start,
        current_end: subscription.current_end,
        created_at: subscription.created_at,
        charge_at: subscription.charge_at,
        paid_count: subscription.paid_count,
        total_count: subscription.total_count,
      },
    });
  } catch (error) {
    logToFile("ERROR", "Failed to fetch subscription", {
      subscription_id: req.params.id,
      error: error.message,
    });

    if (error.statusCode === 400) {
      return res.status(404).json({
        success: false,
        error: "Subscription not found",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to fetch subscription details",
    });
  }
});

// Cancel subscription
app.post("/cancel-subscription", async (req, res) => {
  try {
    const { subscription_id, cancel_at_cycle_end = true } = req.body;

    if (!subscription_id) {
      return res.status(400).json({
        success: false,
        error: "subscription_id is required",
      });
    }

    const result = await razorpay.subscriptions.cancel(
      subscription_id,
      cancel_at_cycle_end
    );

    logToFile("SUCCESS", "Subscription cancelled", {
      subscription_id,
      cancel_at_cycle_end,
      status: result.status,
    });

    res.json({
      success: true,
      message: cancel_at_cycle_end
        ? "Subscription will be cancelled at the end of current billing cycle"
        : "Subscription cancelled immediately",
      subscription: {
        id: result.id,
        status: result.status,
        ended_at: result.ended_at,
      },
    });
  } catch (error) {
    logToFile("ERROR", "Subscription cancellation failed", {
      subscription_id: req.body.subscription_id,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: "Failed to cancel subscription",
    });
  }
});

// --- ERROR HANDLING ---

// 404 handler
app.use((req, res) => {
  logToFile("WARN", `404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: "Route not found",
    available_endpoints: [
      "GET /health",
      "GET /plans",
      "POST /create-subscription",
      "POST /verify-payment",
      "GET /subscription/:id",
      "POST /cancel-subscription",
    ],
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logToFile("ERROR", "Unhandled error", {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
});

// --- SERVER STARTUP ---
app.listen(port, () => {
  logToFile("SUCCESS", `Enhanced Razorpay Subscription Server started`, {
    port,
    environment: process.env.NODE_ENV || "development",
    pid: process.pid,
  });

  console.log(`\n🚀 Enhanced Razorpay Subscription Server`);
  console.log(`📍 Server URL: http://localhost:${port}`);
  console.log(`🏥 Health Check: http://localhost:${port}/health`);
  console.log(`📋 Available Plans: http://localhost:${port}/plans`);
  console.log(`📁 Logs Directory: ${logsDir}`);
  console.log(`\n📡 Available Endpoints:`);
  console.log(`   GET  /health               - Health check`);
  console.log(`   GET  /plans                - List available plans`);
  console.log(`   POST /create-subscription  - Create new subscription`);
  console.log(`   POST /verify-payment       - Verify payment signature`);
  console.log(`   GET  /subscription/:id     - Get subscription details`);
  console.log(`   POST /cancel-subscription  - Cancel subscription`);
  console.log(
    `\n⚠️  Note: This is for testing only - No webhook handling included`
  );
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logToFile("INFO", "SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logToFile("INFO", "SIGINT received, shutting down gracefully");
  process.exit(0);
});
