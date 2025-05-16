// script.js

let errorCount = 0;
let messagesSent = 0;
let messagesReceived = 0;
let retryAttempts = 0;
let connectionStartTime = null;

// DOM elements
const wsStatus = document.getElementById('ws-status');
const pingTime = document.getElementById('ping-time');
const ipAddress = document.getElementById('ip-address');
const connectionId = document.getElementById('connection-id');
const connectionTime = document.getElementById('connection-time');
const deviceInfo = document.getElementById('device-info');
const userAgent = document.getElementById('user-agent');
const retryAttemptsEl = document.getElementById('retry-attempts');
const messagesSentEl = document.getElementById('messages-sent');
const messagesReceivedEl = document.getElementById('messages-received');
const errorCountEl = document.getElementById('error-count');
const clientCountEl = document.getElementById('client-count');

// Toggle more info
document.getElementById('toggle-info').addEventListener('click', function () {
    const extraInfo = document.getElementById('extra-info');
    extraInfo.classList.toggle('collapsed');
});

// Simulate WebSocket status and details
const socket = new WebSocket('wss://your-server-url');
socket.onopen = () => {
    wsStatus.textContent = 'Connected';
    connectionStartTime = new Date();
    updateConnectionTime();
};

socket.onclose = () => {
    wsStatus.textContent = 'Disconnected';
};

socket.onmessage = (event) => {
    messagesReceived++;
    messagesReceivedEl.textContent = messagesReceived;
    // Process incoming messages here
};

socket.onerror = () => {
    errorCount++;
    errorCountEl.textContent = errorCount;
};

// Simulate retry attempts if connection fails
socket.onclose = () => {
    retryAttempts++;
    retryAttemptsEl.textContent = retryAttempts;
};

// Simulate ping time
setInterval(() => {
    pingTime.textContent = Math.floor(Math.random() * 100) + ' ms';
}, 5000);

// Simulate IP address fetch
setTimeout(() => {
    ipAddress.textContent = '192.168.1.2';
}, 1000);

// Fill in device info and user agent
connectionId.textContent = 'WS123456789';
deviceInfo.textContent = window.navigator.platform;
userAgent.textContent = window.navigator.userAgent;

// Update connection time every second
setInterval(updateConnectionTime, 1000);

function updateConnectionTime() {
    if (connectionStartTime) {
        const now = new Date();
        const duration = Math.floor((now - connectionStartTime) / 1000);
        connectionTime.textContent = `${duration} seconds`;
    }
}

// Simulate client count from WebSocket server
setInterval(() => {
    clientCountEl.textContent = Math.floor(Math.random() * 100);
}, 5000);

// Mock function to simulate sending a message
function sendMessage() {
    messagesSent++;
    messagesSentEl.textContent = messagesSent;
}
