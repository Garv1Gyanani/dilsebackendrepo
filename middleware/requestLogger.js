// // middleware/requestLogger.js
// const { logToFile } = require('../logger');

// function requestLogger(req, res, next) {
//     const timestamp = new Date().toISOString();
//     logToFile('INFO', `Request received: ${req.method} ${req.path} - IP: ${req.ip}`);
//     next();
// }

// module.exports = { requestLogger };