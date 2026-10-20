# 🧠 Real-Time Memory Allocation Tracker

An interactive visualization tool designed to demystify how an Operating System manages memory. It simulates and displays core OS memory allocation techniques—specifically **Paging** and **Segmentation**—in real-time as processes are created, executed, and terminated.

---

## ✨ Features

- **Paging Simulation**:
  - Divides physical memory into fixed-size frames (default: 4 KB / frame, 64 frames = 256 KB RAM).
  - Handles logical-to-physical address translation via dynamic **Page Tables**.
  - Tracks **Internal Fragmentation** and simulates **Page Faults** and **Swapping** to secondary storage.

- **Segmentation Simulation**:
  - Dynamically partitions memory into variable-sized logical segments (`Code`, `Data`, `Heap`, `Stack`).
  - Implements **Base + Limit** registers rendered in a live **Segment Table**.
  - Visualizes **External Fragmentation** with built-in **Memory Compaction / Defragmentation**.

- **Allocation Algorithms**:
  - **First-Fit**
  - **Best-Fit**
  - **Worst-Fit**

- **Real-Time Interactive Dashboard**:
  - Live animated RAM memory grid with color-coded process blocks.
  - Controls: Start, Pause, Step-by-Step execution, and Reset.
  - Process creation form with custom sizes, lifetimes, and quick-add presets (`Chrome`, `VSCode`, `Node.js`, `Docker`, `Slack`, `Spotify`).
  - Live metrics: Memory Utilization %, Page Fault counter, Frame usage, and Fragmentation tracking.
  - Event log capturing allocation events, page faults, swaps, and compactions in real-time.

---

## 🏗 Architecture & Modules

```
Real-Time Memory Allocator/
├── backend/
│   ├── engine/
│   │   ├── MemoryEngine.js     # MMU simulation: paging, segmentation, compaction, algorithms
│   │   └── Process.js          # Process model, lifecycle, segment & page mappings
│   ├── controller/
│   │   └── StateController.js  # Bridge: ready queue, tick system, Socket.io broadcaster
│   ├── server.js               # Express REST API & Socket.io server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ControlPanel.jsx     # Playback controls, mode & algorithm selector
│   │   │   ├── MemoryGrid.jsx       # Physical RAM visualization (Paging grid & Segment map)
│   │   │   ├── MetricsDashboard.jsx # Live utilization %, fragmentation, fault counters
│   │   │   ├── ProcessManager.jsx   # Add/kill processes & quick presets
│   │   │   ├── DataTables.jsx       # Real-time Page Table & Segment Table
│   │   │   ├── SwapSpace.jsx        # Swap space visualization
│   │   │   └── EventLog.jsx         # Live OS event feed
│   │   ├── hooks/
│   │   │   └── useSocket.js         # Real-time WebSocket synchronization hook
│   │   ├── App.jsx                  # Main dashboard layout
│   │   └── index.css                # Dark theme glassmorphic design system
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm`

### 1. Clone the repository
```bash
git clone https://github.com/Naiitikk/RealTime-Memory-Allocator.git
cd RealTime-Memory-Allocator
```

### 2. Start the Backend Server
```bash
cd backend
npm install
npm start
```
The backend server runs on `http://localhost:3001` (WebSocket on port `3001`).

### 3. Start the Frontend Application
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
Open your browser at `http://localhost:5173/`.

---

## 🛠 Tech Stack

- **Backend**: Node.js, Express, Socket.io, UUID
- **Frontend**: React 19, Vite, Socket.io-client, Vanilla CSS Design System (Glassmorphism & Micro-animations)
- **Visualization**: CSS Grid & Flexbox dynamic mapping with hardware-accelerated transitions
