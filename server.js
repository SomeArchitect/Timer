const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let timer = {
  endTime: null, // Timestamp when timer ends or null
  duration: 60   // Default duration in seconds
};

function broadcastTimer() {
  const timeLeft = timer.endTime ? Math.max(0, Math.floor((timer.endTime - Date.now())/1000)) : 0;
  const payload = JSON.stringify({ timeLeft, duration: timer.duration });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API to set new timer duration (starts countdown)
app.post('/api/set-timer', (req, res) => {
  const { duration } = req.body;
  if (!Number.isInteger(duration) || duration <= 0) {
    return res.status(400).json({ error: 'Invalid duration' });
  }
  timer.duration = duration;
  timer.endTime = Date.now() + duration * 1000;
  broadcastTimer();
  res.json({ ok: true });
});

// API to get current timer (for initial load)
app.get('/api/timer', (req, res) => {
  const timeLeft = timer.endTime ? Math.max(0, Math.floor((timer.endTime - Date.now())/1000)) : 0;
  res.json({ timeLeft, duration: timer.duration });
});

// WebSocket for live updates
wss.on('connection', ws => {
  // Send current timer immediately
  const timeLeft = timer.endTime ? Math.max(0, Math.floor((timer.endTime - Date.now())/1000)) : 0;
  ws.send(JSON.stringify({ timeLeft, duration: timer.duration }));

  ws.on('close', () => {});
});

// Every second, broadcast current time left
setInterval(() => {
  if (timer.endTime) {
    if (Date.now() >= timer.endTime) {
      timer.endTime = null; // Timer finished
      broadcastTimer();
    } else {
      broadcastTimer();
    }
  }
}, 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
