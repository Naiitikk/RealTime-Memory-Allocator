/**
 * StateController.js - The Bridge between the Engine and the GUI.
 * Manages the process queue, tick system, and state broadcasting.
 */

const MemoryEngine = require('../engine/MemoryEngine');
const Process = require('../engine/Process');

class StateController {
  /**
   * @param {object} io - Socket.io server instance
   * @param {object} [engineConfig] - Config passed to MemoryEngine
   */
  constructor(io, engineConfig = {}) {
    this.io = io;
    this.engine = new MemoryEngine(engineConfig);

    // --- Process Queue ---
    this.readyQueue = []; // Processes waiting for memory

    // --- Tick System ---
    this.tickRate = 1000;  // ms between ticks
    this.tickCount = 0;
    this.isRunning = false;
    this.tickInterval = null;
    this.stepMode = false;

    // --- Page fault simulation ---
    this.pageFaultProbability = 0.05; // 5% chance per tick per process
  }

  /**
   * Start the real-time tick system.
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.stepMode = false;

    this.tickInterval = setInterval(() => {
      this._tick();
    }, this.tickRate);

    this.engine._log('info', 'Simulation started.');
    this._broadcast();
  }

  /**
   * Pause the tick system.
   */
  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.engine._log('info', 'Simulation paused.');
    this._broadcast();
  }

  /**
   * Execute a single tick (step mode).
   */
  step() {
    this.stepMode = true;
    this._tick();
  }

  /**
   * Set the tick rate.
   */
  setTickRate(ms) {
    this.tickRate = Math.max(100, Math.min(5000, ms));
    if (this.isRunning) {
      clearInterval(this.tickInterval);
      this.tickInterval = setInterval(() => {
        this._tick();
      }, this.tickRate);
    }
  }

  /**
   * Internal tick handler.
   */
  _tick() {
    this.tickCount++;

    // 1. Try to allocate processes from the ready queue
    this._processReadyQueue();

    // 2. Tick all running processes (check lifetimes)
    this._tickProcesses();

    // 3. Simulate random page faults (paging mode)
    if (this.engine.mode === 'paging') {
      this._simulatePageFaults();
    }

    // 4. Broadcast state
    this._broadcast();
  }

  /**
   * Try to allocate processes from the ready queue.
   */
  _processReadyQueue() {
    const stillWaiting = [];

    for (const process of this.readyQueue) {
      const result = this.engine.allocate(process);
      if (!result.success) {
        stillWaiting.push(process);
      }
    }

    this.readyQueue = stillWaiting;
  }

  /**
   * Tick all running processes. Terminate expired ones.
   */
  _tickProcesses() {
    const toTerminate = [];

    for (const [id, process] of this.engine.processes) {
      const alive = process.tick();
      if (!alive) {
        toTerminate.push(id);
      }
    }

    for (const id of toTerminate) {
      this.engine.deallocate(id);
    }
  }

  /**
   * Simulate random page faults for educational purposes.
   */
  _simulatePageFaults() {
    for (const [id, process] of this.engine.processes) {
      if (process.state !== 'running') continue;

      if (Math.random() < this.pageFaultProbability) {
        // Find a page that's in swap
        const swappedPage = process.pageTable.find(p => p.inSwap);
        if (swappedPage) {
          this.engine.simulatePageFault(id, swappedPage.pageNumber);
        }
      }
    }
  }

  // =============================================
  //  PUBLIC API
  // =============================================

  /**
   * Add a new process. It goes to the ready queue if memory is full.
   */
  addProcess(name, sizeKB, lifetimeTicks = 0, segments = null) {
    const process = new Process(name, sizeKB, lifetimeTicks, segments);

    // Try immediate allocation
    const result = this.engine.allocate(process);
    if (!result.success) {
      // Add to ready queue
      process.state = 'waiting';
      this.readyQueue.push(process);
      this.engine._log('info', `${name} (${sizeKB}KB) added to ready queue.`);
    }

    this._broadcast();
    return process.toJSON();
  }

  /**
   * Kill (terminate) a process.
   */
  killProcess(processId) {
    // Check ready queue first
    const queueIndex = this.readyQueue.findIndex(p => p.id === processId);
    if (queueIndex !== -1) {
      const proc = this.readyQueue.splice(queueIndex, 1)[0];
      proc.terminate();
      this.engine._log('info', `Removed ${proc.name} from ready queue.`);
      this._broadcast();
      return { success: true };
    }

    const result = this.engine.deallocate(processId);
    this._broadcast();
    return result;
  }

  /**
   * Change memory mode.
   */
  setMode(mode) {
    this.engine.reset();
    this.readyQueue = [];
    this.tickCount = 0;
    this.engine.setMode(mode);
    this._broadcast();
  }

  /**
   * Change allocation algorithm.
   */
  setAlgorithm(algo) {
    this.engine.setAlgorithm(algo);
    this._broadcast();
  }

  /**
   * Trigger manual compaction.
   */
  compact() {
    this.engine.compact();
    this._broadcast();
  }

  /**
   * Full reset.
   */
  reset() {
    this.pause();
    this.engine.reset();
    this.readyQueue = [];
    this.tickCount = 0;
    this._broadcast();
  }

  /**
   * Set page fault probability.
   */
  setPageFaultProbability(prob) {
    this.pageFaultProbability = Math.max(0, Math.min(1, prob));
  }

  /**
   * Broadcast current state to all connected clients.
   */
  _broadcast() {
    const state = this.engine.getState();
    state.tickCount = this.tickCount;
    state.isRunning = this.isRunning;
    state.stepMode = this.stepMode;
    state.tickRate = this.tickRate;
    state.readyQueue = this.readyQueue.map(p => p.toJSON());
    state.pageFaultProbability = this.pageFaultProbability;

    this.io.emit('state-update', state);
  }

  /**
   * Get current state (for HTTP endpoint).
   */
  getState() {
    const state = this.engine.getState();
    state.tickCount = this.tickCount;
    state.isRunning = this.isRunning;
    state.stepMode = this.stepMode;
    state.tickRate = this.tickRate;
    state.readyQueue = this.readyQueue.map(p => p.toJSON());
    state.pageFaultProbability = this.pageFaultProbability;
    return state;
  }
}

module.exports = StateController;
