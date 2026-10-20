/**
 * Process.js - Represents a process in the memory simulation.
 * Each process has a unique ID, name, size, and lifecycle metadata.
 */

const { v4: uuidv4 } = require('uuid');

// Color palette for process visualization
const PROCESS_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F1948A', '#82E0AA', '#F8C471', '#AED6F1', '#D7BDE2',
  '#A3E4D7', '#FAD7A0', '#A9CCE3', '#D5DBDB', '#FADBD8',
  '#E8DAEF', '#D4EFDF', '#FCF3CF', '#D6EAF8', '#F2D7D5',
];

let colorIndex = 0;

class Process {
  /**
   * @param {string} name - Process name (e.g., "Chrome", "Node")
   * @param {number} sizeKB - Total memory required in KB
   * @param {number} [lifetimeTicks] - How many ticks before auto-termination (0 = manual)
   * @param {object} [segments] - Optional segment definitions for segmentation mode
   */
  constructor(name, sizeKB, lifetimeTicks = 0, segments = null) {
    this.id = uuidv4();
    this.name = name;
    this.sizeKB = sizeKB;
    this.lifetimeTicks = lifetimeTicks;
    this.ticksElapsed = 0;
    this.color = PROCESS_COLORS[colorIndex % PROCESS_COLORS.length];
    colorIndex++;

    // State: 'waiting' | 'running' | 'terminated' | 'swapped'
    this.state = 'waiting';

    // Paging metadata
    this.pageTable = [];       // Array of { pageNumber, frameNumber, valid, modified, referenced }
    this.pageFaults = 0;

    // Segmentation metadata
    this.segments = segments || this._generateDefaultSegments(sizeKB);
    this.segmentTable = [];    // Array of { segmentId, name, base, limit, valid }

    // Timestamps
    this.createdAt = Date.now();
    this.allocatedAt = null;
    this.terminatedAt = null;
  }

  /**
   * Generate default segments (Code, Data, Heap, Stack) based on total size
   */
  _generateDefaultSegments(totalKB) {
    const codePct = 0.3;
    const dataPct = 0.2;
    const heapPct = 0.3;
    const stackPct = 0.2;

    return [
      { name: 'Code',  sizeKB: Math.max(1, Math.ceil(totalKB * codePct)) },
      { name: 'Data',  sizeKB: Math.max(1, Math.ceil(totalKB * dataPct)) },
      { name: 'Heap',  sizeKB: Math.max(1, Math.ceil(totalKB * heapPct)) },
      { name: 'Stack', sizeKB: Math.max(1, Math.floor(totalKB * stackPct)) },
    ];
  }

  /**
   * Advance the process by one tick. Returns true if still alive.
   */
  tick() {
    if (this.state !== 'running') return this.state !== 'terminated';
    this.ticksElapsed++;

    if (this.lifetimeTicks > 0 && this.ticksElapsed >= this.lifetimeTicks) {
      this.state = 'terminated';
      this.terminatedAt = Date.now();
      return false;
    }
    return true;
  }

  /**
   * Mark process as allocated / running
   */
  activate() {
    this.state = 'running';
    this.allocatedAt = Date.now();
  }

  /**
   * Mark process as terminated
   */
  terminate() {
    this.state = 'terminated';
    this.terminatedAt = Date.now();
  }

  /**
   * Serialize to JSON-friendly object for the frontend
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      sizeKB: this.sizeKB,
      color: this.color,
      state: this.state,
      lifetimeTicks: this.lifetimeTicks,
      ticksElapsed: this.ticksElapsed,
      pageFaults: this.pageFaults,
      pageTable: this.pageTable,
      segments: this.segments,
      segmentTable: this.segmentTable,
      createdAt: this.createdAt,
      allocatedAt: this.allocatedAt,
      terminatedAt: this.terminatedAt,
    };
  }
}

module.exports = Process;
