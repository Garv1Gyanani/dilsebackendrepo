// routes/razorpay.js
const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { logToFile } = require("../logger");
const config = require("../config");
const {
  validatePlanId,
  getPlanInfo,
  generateSubscriptionRef,
} = require("../utils");

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: config.razorpay.key_id,
  key_secret: config.razorpay.key_secret,
});

// Get available plans
router.get("/plans", (req, res) => {
  try {
    const plans = Object.entries(config.planConfig).map(([key, config]) => ({
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

// Create subscription
router.post("/create-subscription", async (req, res) => {
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
        available_plans: Object.values(config.planConfig).map(
          (plan) => plan.id
        ),
      });
    }

    if (!validatePlanId(plan_id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid plan_id provided",
        available_plans: Object.values(config.planConfig).map(
          (plan) => plan.id
        ),
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

// Verify payment
router.post("/verify-payment", (req, res) => {
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
      .createHmac("sha256", config.razorpay.key_secret)
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
router.get("/subscription/:id", async (req, res) => {
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
router.post("/cancel-subscription", async (req, res) => {
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

module.exports = router;
