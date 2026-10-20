/**
 * server.js - Main backend server for the Real-Time Memory Allocation Tracker.
 * 
 * Provides:
 * - REST API endpoints for process management
 * - WebSocket (Socket.io) for real-time state broadcasting
 * - Configuration endpoints for memory settings
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const StateController = require('./controller/StateController');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json());

// Initialize the State Controller with default config
const controller = new StateController(io, {
  totalMemoryKB: 256,
  pageSizeKB: 4,
  swapSizeKB: 128,
});

// =============================================
//  REST API ENDPOINTS
// =============================================

/**
 * GET /api/state - Get current simulation state
 */
app.get('/api/state', (req, res) => {
  res.json(controller.getState());
});

/**
 * POST /api/process - Add a new process
 * Body: { name: string, sizeKB: number, lifetimeTicks?: number, segments?: array }
 */
app.post('/api/process', (req, res) => {
  const { name, sizeKB, lifetimeTicks, segments } = req.body;

  if (!name || !sizeKB || sizeKB <= 0) {
    return res.status(400).json({ error: 'Valid name and sizeKB are required.' });
  }

  if (sizeKB > controller.engine.totalMemoryKB) {
    return res.status(400).json({
      error: `Process size (${sizeKB}KB) exceeds total memory (${controller.engine.totalMemoryKB}KB).`,
    });
  }

  const process = controller.addProcess(name, sizeKB, lifetimeTicks || 0, segments || null);
  res.json({ success: true, process });
});

/**
 * DELETE /api/process/:id - Kill a process
 */
app.delete('/api/process/:id', (req, res) => {
  const result = controller.killProcess(req.params.id);
  res.json(result);
});

/**
 * POST /api/control/start - Start the simulation
 */
app.post('/api/control/start', (req, res) => {
  controller.start();
  res.json({ success: true, message: 'Simulation started.' });
});

/**
 * POST /api/control/pause - Pause the simulation
 */
app.post('/api/control/pause', (req, res) => {
  controller.pause();
  res.json({ success: true, message: 'Simulation paused.' });
});

/**
 * POST /api/control/step - Execute a single tick
 */
app.post('/api/control/step', (req, res) => {
  controller.step();
  res.json({ success: true, message: 'Stepped one tick.' });
});

/**
 * POST /api/control/reset - Reset the simulation
 */
app.post('/api/control/reset', (req, res) => {
  controller.reset();
  res.json({ success: true, message: 'Simulation reset.' });
});

/**
 * POST /api/control/compact - Trigger memory compaction
 */
app.post('/api/control/compact', (req, res) => {
  controller.compact();
  res.json({ success: true, message: 'Memory compacted.' });
});

/**
 * POST /api/config/mode - Switch memory mode
 * Body: { mode: 'paging' | 'segmentation' }
 */
app.post('/api/config/mode', (req, res) => {
  const { mode } = req.body;
  if (!['paging', 'segmentation'].includes(mode)) {
    return res.status(400).json({ error: 'Mode must be "paging" or "segmentation".' });
  }
  controller.setMode(mode);
  res.json({ success: true, mode });
});

/**
 * POST /api/config/algorithm - Switch allocation algorithm
 * Body: { algorithm: 'first-fit' | 'best-fit' | 'worst-fit' }
 */
app.post('/api/config/algorithm', (req, res) => {
  const { algorithm } = req.body;
  if (!['first-fit', 'best-fit', 'worst-fit'].includes(algorithm)) {
    return res.status(400).json({ error: 'Algorithm must be "first-fit", "best-fit", or "worst-fit".' });
  }
  controller.setAlgorithm(algorithm);
  res.json({ success: true, algorithm });
});

/**
 * POST /api/config/tick-rate - Set tick rate
 * Body: { tickRate: number (ms) }
 */
app.post('/api/config/tick-rate', (req, res) => {
  const { tickRate } = req.body;
  if (!tickRate || tickRate < 100 || tickRate > 5000) {
    return res.status(400).json({ error: 'Tick rate must be between 100 and 5000 ms.' });
  }
  controller.setTickRate(tickRate);
  res.json({ success: true, tickRate });
});

// =============================================
//  WEBSOCKET EVENT HANDLING
// =============================================

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Send current state on connection
  const state = controller.getState();
  socket.emit('state-update', state);

  // Handle client commands via WebSocket
  socket.on('add-process', (data) => {
    const { name, sizeKB, lifetimeTicks, segments } = data;
    if (name && sizeKB > 0) {
      controller.addProcess(name, sizeKB, lifetimeTicks || 0, segments || null);
    }
  });

  socket.on('kill-process', (data) => {
    if (data.processId) {
      controller.killProcess(data.processId);
    }
  });

  socket.on('start', () => controller.start());
  socket.on('pause', () => controller.pause());
  socket.on('step', () => controller.step());
  socket.on('reset', () => controller.reset());
  socket.on('compact', () => controller.compact());

  socket.on('set-mode', (data) => {
    if (data.mode) controller.setMode(data.mode);
  });

  socket.on('set-algorithm', (data) => {
    if (data.algorithm) controller.setAlgorithm(data.algorithm);
  });

  socket.on('set-tick-rate', (data) => {
    if (data.tickRate) controller.setTickRate(data.tickRate);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// =============================================
//  START SERVER
// =============================================

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🧠 Memory Allocation Tracker Server running on port ${PORT}`);
  console.log(`   REST API: http://localhost:${PORT}/api`);
  console.log(`   WebSocket: ws://localhost:${PORT}`);
});
