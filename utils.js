// utils.js
const config = require("./config");

function validatePlanId(planId) {
    return Object.values(config.planConfig).map(plan => plan.id).includes(planId);
}

// Get plan info by ID
function getPlanInfo(planId) {
    return Object.values(config.planConfig).find((plan) => plan.id === planId);
}

// Generate subscription reference ID
function generateSubscriptionRef() {
    return `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
module.exports = {validatePlanId, getPlanInfo, generateSubscriptionRef}