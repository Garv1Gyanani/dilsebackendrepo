// logger.js
const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, 'logs');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

function logToFile(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        message,
        data,
        pid: process.pid,
    };

    const logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);
    const logLine = JSON.stringify(logEntry) + '\n';

    fs.appendFileSync(logFile, logLine);

    // Also log to console with colors
    const colors = {
        ERROR: '\x1b[31m',
        WARN: '\x1b[33m',
        INFO: '\x1b[36m',
        SUCCESS: '\x1b[32m',
        RESET: '\x1b[0m',
    };

    console.log(`${colors[level] || ''}[${timestamp}] ${level}: ${message}${colors.RESET}`);
    if (data) console.log(data);
}

module.exports = { logToFile };