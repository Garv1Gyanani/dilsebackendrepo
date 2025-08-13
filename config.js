require("dotenv").config();

module.exports = {
  port: process.env.PORT || 3000,
  razorpay: {
    key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_HZbdFlzOmIGujn",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "X6w1OO7AjBoo7Bcs2FBEEWAf",
  },
  bunnyCDN: {
    storageZone: process.env.BUNNY_STORAGE_ZONE || "dilsestoreage", // Updated default
    accessKey: process.env.BUNNY_ACCESS_KEY || "YOUR_DEFAULT_TEST_KEY_HERE", // It's better not to keep real keys here
    // This is the important change:
    pullZoneUrl:
      process.env.BUNNY_PULL_ZONE_URL || "https://dilsestoreage.b-cdn.net",
  },
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : "*",
  planConfig: {
    // Your plan configuration remains the same
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
  },
};
