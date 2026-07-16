require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://print-go-steel.vercel.app", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT"]
  }
});

const port = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.use(cors({
  origin: ["https://print-go-steel.vercel.app", "http://localhost:5173"],
  methods: ["GET", "POST", "PUT"]
}));
app.use(express.json());

// Expose io to routes if needed
app.set('io', io);

// Routes
const jobsRouter = require('./routes/jobs');
const uploadRouter = require('./routes/upload');

app.use('/api/jobs', jobsRouter);
app.use('/api/upload', uploadRouter);

// Serve uploads statically (for preview if needed)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.IO Logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Join a specific session room (shared between kiosk and mobile)
  socket.on('join_session', (sessionId) => {
    socket.join(sessionId);
    console.log(`Socket ${socket.id} joined session ${sessionId}`);
  });

  // Mobile connects to session
  socket.on('mobile_connected', (sessionId) => {
    // Notify kiosk
    io.to(sessionId).emit('kiosk_user_connected');
  });

  // File uploaded on mobile
  socket.on('file_uploaded', ({ sessionId, fileData }) => {
    io.to(sessionId).emit('kiosk_file_uploaded', fileData);
  });

  // Settings updated on mobile
  socket.on('settings_updated', ({ sessionId, settingsData, price }) => {
    io.to(sessionId).emit('kiosk_settings_updated', { settingsData, price });
  });

  // Payment initiated on mobile
  socket.on('payment_initiated', ({ sessionId, price, jobId }) => {
    io.to(sessionId).emit('kiosk_payment_initiated', { price, jobId });
  });

  // Payment successful
  socket.on('payment_success', ({ sessionId, jobId }) => {
    io.to(sessionId).emit('kiosk_payment_success', { jobId });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(port, () => {
  console.log(`PrintGo backend listening at http://localhost:${port}`);
});
