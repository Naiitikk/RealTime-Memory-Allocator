/**
 * MemoryEngine.js - The core Memory Management Unit (MMU) simulator.
 * Handles paging allocation, segmentation allocation, free-space management,
 * and compaction/garbage-collection logic.
 */

const Process = require('./Process');

class MemoryEngine {
  /**
   * @param {object} config
   * @param {number} config.totalMemoryKB  - Total physical memory in KB (default 256)
   * @param {number} config.pageSizeKB     - Page/frame size in KB (default 4)
   * @param {number} config.swapSizeKB     - Swap space in KB (default 128)
   */
  constructor(config = {}) {
    this.totalMemoryKB = config.totalMemoryKB || 256;
    this.pageSizeKB = config.pageSizeKB || 4;
    this.swapSizeKB = config.swapSizeKB || 128;

    // --- Physical Memory (frames) ---
    this.totalFrames = Math.floor(this.totalMemoryKB / this.pageSizeKB);
    // Each frame: { frameNumber, processId, pageNumber, occupied }
    this.frames = [];
    for (let i = 0; i < this.totalFrames; i++) {
      this.frames.push({
        frameNumber: i,
        processId: null,
        processName: null,
        processColor: null,
        pageNumber: null,
        segmentName: null,
        occupied: false,
      });
    }

    // --- Swap Space (for paging) ---
    this.swapFrames = Math.floor(this.swapSizeKB / this.pageSizeKB);
    this.swapSpace = [];
    for (let i = 0; i < this.swapFrames; i++) {
      this.swapSpace.push({
        frameNumber: i,
        processId: null,
        pageNumber: null,
        occupied: false,
      });
    }

    // --- Segmentation free list ---
    // For segmentation, we track contiguous blocks
    // Each block: { start (KB offset), size (KB), processId, segmentName, occupied }
    this.segmentBlocks = [
      { start: 0, size: this.totalMemoryKB, processId: null, segmentName: null, processColor: null, occupied: false }
    ];

    // --- Statistics ---
    this.stats = {
      totalPageFaults: 0,
      totalAllocations: 0,
      totalDeallocations: 0,
      totalCompactions: 0,
      totalSwapsIn: 0,
      totalSwapsOut: 0,
    };

    // Current allocation mode
    this.mode = 'paging'; // 'paging' | 'segmentation'
    this.algorithm = 'first-fit'; // 'first-fit' | 'best-fit' | 'worst-fit'

    // Active processes map
    this.processes = new Map();

    // Event log
    this.eventLog = [];
  }

  /**
   * Log an event for the frontend
   */
  _log(type, message, data = {}) {
    const event = {
      timestamp: Date.now(),
      type,    // 'info' | 'warning' | 'error' | 'allocation' | 'deallocation' | 'page-fault' | 'swap' | 'compaction'
      message,
      data,
    };
    this.eventLog.push(event);
    // Keep last 200 events
    if (this.eventLog.length > 200) {
      this.eventLog.shift();
    }
    return event;
  }

  // =============================================
  //  PAGING ALLOCATION
  // =============================================

  /**
   * Allocate memory for a process using paging.
   * @param {Process} process
   * @returns {{ success: boolean, message: string }}
   */
  allocatePaging(process) {
    const pagesNeeded = Math.ceil(process.sizeKB / this.pageSizeKB);
    const internalFrag = (pagesNeeded * this.pageSizeKB) - process.sizeKB;

    // Find free frames
    const freeFrames = this.frames
      .filter(f => !f.occupied)
      .map(f => f.frameNumber);

    if (freeFrames.length < pagesNeeded) {
      // Try swapping out pages from other processes
      const needed = pagesNeeded - freeFrames.length;
      const swappedFrames = this._swapOutPages(needed);

      if (swappedFrames.length < needed) {
        this._log('warning', `Not enough memory for ${process.name} (${process.sizeKB}KB). Needs ${pagesNeeded} frames, only ${freeFrames.length + swappedFrames.length} available.`);
        return { success: false, message: 'Insufficient memory even after swapping' };
      }
      freeFrames.push(...swappedFrames);
    }

    // Allocate pages to frames
    const pageTable = [];
    for (let pageNum = 0; pageNum < pagesNeeded; pageNum++) {
      const frameNum = freeFrames[pageNum];
      const frame = this.frames[frameNum];

      frame.occupied = true;
      frame.processId = process.id;
      frame.processName = process.name;
      frame.processColor = process.color;
      frame.pageNumber = pageNum;

      pageTable.push({
        pageNumber: pageNum,
        frameNumber: frameNum,
        valid: true,
        modified: false,
        referenced: true,
        inSwap: false,
      });
    }

    process.pageTable = pageTable;
    process.activate();
    this.processes.set(process.id, process);
    this.stats.totalAllocations++;

    this._log('allocation', `Allocated ${pagesNeeded} pages (${process.sizeKB}KB) for ${process.name}. Internal fragmentation: ${internalFrag}KB.`, {
      processId: process.id,
      pagesAllocated: pagesNeeded,
      internalFragmentation: internalFrag,
    });

    return { success: true, message: `Allocated ${pagesNeeded} pages`, internalFragmentation: internalFrag };
  }

  /**
   * Deallocate all pages belonging to a process.
   */
  deallocatePaging(processId) {
    const process = this.processes.get(processId);
    if (!process) return { success: false, message: 'Process not found' };

    // Free frames
    let freedFrames = 0;
    for (const frame of this.frames) {
      if (frame.processId === processId) {
        frame.occupied = false;
        frame.processId = null;
        frame.processName = null;
        frame.processColor = null;
        frame.pageNumber = null;
        freedFrames++;
      }
    }

    // Free swap space
    for (const swapFrame of this.swapSpace) {
      if (swapFrame.processId === processId) {
        swapFrame.occupied = false;
        swapFrame.processId = null;
        swapFrame.pageNumber = null;
      }
    }

    process.terminate();
    this.processes.delete(processId);
    this.stats.totalDeallocations++;

    this._log('deallocation', `Deallocated ${freedFrames} frames from ${process.name}.`, {
      processId,
      framesFreed: freedFrames,
    });

    return { success: true, message: `Freed ${freedFrames} frames` };
  }

  /**
   * Swap out pages using a simple FIFO / LRU-approximation.
   * Returns array of freed frame numbers.
   */
  _swapOutPages(count) {
    const freedFrames = [];
    const freeSwapSlots = this.swapSpace.filter(s => !s.occupied);

    if (freeSwapSlots.length === 0) return freedFrames;

    // Find pages to swap out (pick unreferenced pages first)
    const candidates = [];
    for (const proc of this.processes.values()) {
      if (proc.state !== 'running') continue;
      for (const entry of proc.pageTable) {
        if (entry.valid && !entry.inSwap) {
          candidates.push({ processId: proc.id, entry, referenced: entry.referenced });
        }
      }
    }

    // Sort: unreferenced pages first (clock algorithm approximation)
    candidates.sort((a, b) => (a.referenced ? 1 : 0) - (b.referenced ? 1 : 0));

    for (const candidate of candidates) {
      if (freedFrames.length >= count || freeSwapSlots.length === 0) break;

      const swapSlot = freeSwapSlots.shift();
      const frame = this.frames[candidate.entry.frameNumber];

      // Move to swap
      swapSlot.occupied = true;
      swapSlot.processId = candidate.processId;
      swapSlot.pageNumber = candidate.entry.pageNumber;

      // Free the frame
      frame.occupied = false;
      const prevProcess = frame.processName;
      frame.processId = null;
      frame.processName = null;
      frame.processColor = null;
      frame.pageNumber = null;

      // Update page table entry
      candidate.entry.valid = false;
      candidate.entry.inSwap = true;
      candidate.entry.swapFrameNumber = swapSlot.frameNumber;

      freedFrames.push(candidate.entry.frameNumber);
      this.stats.totalSwapsOut++;

      this._log('swap', `Swapped out page ${candidate.entry.pageNumber} of process ${prevProcess} to swap slot ${swapSlot.frameNumber}.`);
    }

    return freedFrames;
  }

  /**
   * Simulate a page fault for a process (page access that's in swap)
   */
  simulatePageFault(processId, pageNumber) {
    const process = this.processes.get(processId);
    if (!process) return;

    const pageEntry = process.pageTable.find(p => p.pageNumber === pageNumber);
    if (!pageEntry || pageEntry.valid) return; // No fault needed

    // Find a free frame
    let freeFrame = this.frames.find(f => !f.occupied);
    if (!freeFrame) {
      // Need to swap out another page
      const swapped = this._swapOutPages(1);
      if (swapped.length === 0) return;
      freeFrame = this.frames[swapped[0]];
    }

    // Bring page back from swap
    const swapSlot = this.swapSpace.find(
      s => s.processId === processId && s.pageNumber === pageNumber
    );
    if (swapSlot) {
      swapSlot.occupied = false;
      swapSlot.processId = null;
      swapSlot.pageNumber = null;
    }

    freeFrame.occupied = true;
    freeFrame.processId = processId;
    freeFrame.processName = process.name;
    freeFrame.processColor = process.color;
    freeFrame.pageNumber = pageNumber;

    pageEntry.frameNumber = freeFrame.frameNumber;
    pageEntry.valid = true;
    pageEntry.inSwap = false;
    pageEntry.referenced = true;
    delete pageEntry.swapFrameNumber;

    process.pageFaults++;
    this.stats.totalPageFaults++;
    this.stats.totalSwapsIn++;

    this._log('page-fault', `Page fault: Loaded page ${pageNumber} of ${process.name} into frame ${freeFrame.frameNumber}.`, {
      processId,
      pageNumber,
      frameNumber: freeFrame.frameNumber,
    });
  }

  // =============================================
  //  SEGMENTATION ALLOCATION
  // =============================================

  /**
   * Allocate memory for a process using segmentation.
   * @param {Process} process
   * @returns {{ success: boolean, message: string }}
   */
  allocateSegmentation(process) {
    const segmentTable = [];
    const allocatedBlocks = [];

    for (const segment of process.segments) {
      const blockIndex = this._findFreeBlock(segment.sizeKB);

      if (blockIndex === -1) {
        // Rollback any allocations made for this process
        for (const blk of allocatedBlocks) {
          this._freeSegmentBlock(blk);
        }

        // Try compaction then retry
        this.compact();
        const retryIndex = this._findFreeBlock(segment.sizeKB);
        if (retryIndex === -1) {
          this._log('warning', `Cannot allocate segment "${segment.name}" (${segment.sizeKB}KB) for ${process.name}. Not enough contiguous memory.`);
          return { success: false, message: `Insufficient contiguous memory for segment ${segment.name}` };
        }

        // Retry allocation after compaction
        return this.allocateSegmentation(process);
      }

      const freeBlock = this.segmentBlocks[blockIndex];
      const base = freeBlock.start;

      // Split the block if it's larger than needed
      if (freeBlock.size > segment.sizeKB) {
        const remainder = {
          start: freeBlock.start + segment.sizeKB,
          size: freeBlock.size - segment.sizeKB,
          processId: null,
          segmentName: null,
          processColor: null,
          occupied: false,
        };
        this.segmentBlocks.splice(blockIndex + 1, 0, remainder);
      }

      // Allocate this block
      freeBlock.size = segment.sizeKB;
      freeBlock.occupied = true;
      freeBlock.processId = process.id;
      freeBlock.segmentName = segment.name;
      freeBlock.processColor = process.color;

      allocatedBlocks.push(freeBlock);

      segmentTable.push({
        segmentId: segmentTable.length,
        name: segment.name,
        base: base,
        limit: segment.sizeKB,
        valid: true,
      });
    }

    process.segmentTable = segmentTable;
    process.activate();
    this.processes.set(process.id, process);
    this.stats.totalAllocations++;

    this._log('allocation', `Allocated ${process.segments.length} segments (${process.sizeKB}KB total) for ${process.name} using ${this.algorithm}.`, {
      processId: process.id,
      segmentsAllocated: process.segments.length,
    });

    return { success: true, message: `Allocated ${process.segments.length} segments` };
  }

  /**
   * Find a free block using the configured algorithm.
   * @returns {number} Index in segmentBlocks, or -1 if none found
   */
  _findFreeBlock(sizeKB) {
    const freeBlocks = this.segmentBlocks
      .map((block, index) => ({ block, index }))
      .filter(({ block }) => !block.occupied && block.size >= sizeKB);

    if (freeBlocks.length === 0) return -1;

    switch (this.algorithm) {
      case 'first-fit':
        return freeBlocks[0].index;

      case 'best-fit':
        freeBlocks.sort((a, b) => a.block.size - b.block.size);
        return freeBlocks[0].index;

      case 'worst-fit':
        freeBlocks.sort((a, b) => b.block.size - a.block.size);
        return freeBlocks[0].index;

      default:
        return freeBlocks[0].index;
    }
  }

  /**
   * Free a segment block
   */
  _freeSegmentBlock(block) {
    block.occupied = false;
    block.processId = null;
    block.segmentName = null;
    block.processColor = null;
  }

  /**
   * Deallocate all segments belonging to a process.
   */
  deallocateSegmentation(processId) {
    const process = this.processes.get(processId);
    if (!process) return { success: false, message: 'Process not found' };

    let freedKB = 0;
    for (const block of this.segmentBlocks) {
      if (block.processId === processId) {
        this._freeSegmentBlock(block);
        freedKB += block.size;
      }
    }

    // Merge adjacent free blocks
    this._mergeAdjacentFreeBlocks();

    process.terminate();
    this.processes.delete(processId);
    this.stats.totalDeallocations++;

    this._log('deallocation', `Deallocated ${freedKB}KB from ${process.name} (segmentation).`, {
      processId,
      freedKB,
    });

    return { success: true, message: `Freed ${freedKB}KB` };
  }

  /**
   * Merge adjacent free blocks in the segment list.
   */
  _mergeAdjacentFreeBlocks() {
    let i = 0;
    while (i < this.segmentBlocks.length - 1) {
      const current = this.segmentBlocks[i];
      const next = this.segmentBlocks[i + 1];
      if (!current.occupied && !next.occupied) {
        current.size += next.size;
        this.segmentBlocks.splice(i + 1, 1);
      } else {
        i++;
      }
    }
  }

  // =============================================
  //  COMPACTION
  // =============================================

  /**
   * Compact memory (segmentation mode) - move all allocated blocks to the front.
   */
  compact() {
    if (this.mode !== 'segmentation') return;

    const occupiedBlocks = this.segmentBlocks.filter(b => b.occupied);
    const totalFreeKB = this.segmentBlocks
      .filter(b => !b.occupied)
      .reduce((sum, b) => sum + b.size, 0);

    if (totalFreeKB === 0) return;

    // Rebuild: all occupied blocks contiguous at the start
    let currentOffset = 0;
    const newBlocks = [];

    for (const block of occupiedBlocks) {
      newBlocks.push({
        ...block,
        start: currentOffset,
      });

      // Update the process's segment table
      const process = this.processes.get(block.processId);
      if (process) {
        const segEntry = process.segmentTable.find(s => s.name === block.segmentName);
        if (segEntry) {
          segEntry.base = currentOffset;
        }
      }

      currentOffset += block.size;
    }

    // Add one big free block at the end
    if (totalFreeKB > 0) {
      newBlocks.push({
        start: currentOffset,
        size: totalFreeKB,
        processId: null,
        segmentName: null,
        processColor: null,
        occupied: false,
      });
    }

    this.segmentBlocks = newBlocks;
    this.stats.totalCompactions++;

    this._log('compaction', `Compacted memory. Created ${totalFreeKB}KB contiguous free block.`, {
      freeKB: totalFreeKB,
    });
  }

  // =============================================
  //  UNIFIED API
  // =============================================

  /**
   * Allocate memory for a process using the current mode.
   */
  allocate(process) {
    if (this.mode === 'paging') {
      return this.allocatePaging(process);
    } else {
      return this.allocateSegmentation(process);
    }
  }

  /**
   * Deallocate a process's memory using the current mode.
   */
  deallocate(processId) {
    if (this.mode === 'paging') {
      return this.deallocatePaging(processId);
    } else {
      return this.deallocateSegmentation(processId);
    }
  }

  /**
   * Set the memory management mode.
   */
  setMode(mode) {
    if (mode !== 'paging' && mode !== 'segmentation') return;
    this.mode = mode;
    this._log('info', `Switched to ${mode} mode.`);
  }

  /**
   * Set the allocation algorithm (for segmentation).
   */
  setAlgorithm(algo) {
    if (!['first-fit', 'best-fit', 'worst-fit'].includes(algo)) return;
    this.algorithm = algo;
    this._log('info', `Switched to ${algo} algorithm.`);
  }

  /**
   * Reset everything to initial state.
   */
  reset() {
    // Clear frames
    for (const frame of this.frames) {
      frame.occupied = false;
      frame.processId = null;
      frame.processName = null;
      frame.processColor = null;
      frame.pageNumber = null;
      frame.segmentName = null;
    }

    // Clear swap
    for (const slot of this.swapSpace) {
      slot.occupied = false;
      slot.processId = null;
      slot.pageNumber = null;
    }

    // Reset segmentation
    this.segmentBlocks = [
      { start: 0, size: this.totalMemoryKB, processId: null, segmentName: null, processColor: null, occupied: false }
    ];

    // Clear processes
    this.processes.clear();

    // Reset stats
    this.stats = {
      totalPageFaults: 0,
      totalAllocations: 0,
      totalDeallocations: 0,
      totalCompactions: 0,
      totalSwapsIn: 0,
      totalSwapsOut: 0,
    };

    this.eventLog = [];
    this._log('info', 'Memory engine reset.');
  }

  // =============================================
  //  METRICS / STATE
  // =============================================

  /**
   * Calculate current memory utilization and fragmentation metrics.
   */
  getMetrics() {
    if (this.mode === 'paging') {
      const occupiedFrames = this.frames.filter(f => f.occupied).length;
      const freeFrames = this.totalFrames - occupiedFrames;
      const utilization = (occupiedFrames / this.totalFrames) * 100;

      // Internal fragmentation: sum of wasted space in last page of each process
      let internalFrag = 0;
      for (const proc of this.processes.values()) {
        if (proc.state !== 'running') continue;
        const pagesUsed = proc.pageTable.filter(p => p.valid).length;
        const allocatedKB = pagesUsed * this.pageSizeKB;
        internalFrag += allocatedKB - proc.sizeKB;
      }

      const swapUsed = this.swapSpace.filter(s => s.occupied).length;

      return {
        mode: 'paging',
        totalMemoryKB: this.totalMemoryKB,
        usedMemoryKB: occupiedFrames * this.pageSizeKB,
        freeMemoryKB: freeFrames * this.pageSizeKB,
        utilizationPercent: Math.round(utilization * 100) / 100,
        totalFrames: this.totalFrames,
        occupiedFrames,
        freeFrames,
        internalFragmentationKB: Math.max(0, internalFrag),
        externalFragmentationKB: 0, // Not applicable for paging
        swapUsed,
        swapTotal: this.swapFrames,
        pageFaults: this.stats.totalPageFaults,
        algorithm: this.algorithm,
      };
    } else {
      // Segmentation metrics
      const occupiedBlocks = this.segmentBlocks.filter(b => b.occupied);
      const freeBlocks = this.segmentBlocks.filter(b => !b.occupied);
      const usedKB = occupiedBlocks.reduce((s, b) => s + b.size, 0);
      const freeKB = freeBlocks.reduce((s, b) => s + b.size, 0);
      const utilization = (usedKB / this.totalMemoryKB) * 100;

      // External fragmentation: total free space minus largest free block
      const largestFreeBlock = freeBlocks.length > 0
        ? Math.max(...freeBlocks.map(b => b.size))
        : 0;
      const externalFrag = freeKB - largestFreeBlock;

      return {
        mode: 'segmentation',
        totalMemoryKB: this.totalMemoryKB,
        usedMemoryKB: usedKB,
        freeMemoryKB: freeKB,
        utilizationPercent: Math.round(utilization * 100) / 100,
        totalBlocks: this.segmentBlocks.length,
        occupiedBlocks: occupiedBlocks.length,
        freeBlocks: freeBlocks.length,
        internalFragmentationKB: 0, // Not applicable for segmentation
        externalFragmentationKB: externalFrag,
        largestFreeBlockKB: largestFreeBlock,
        algorithm: this.algorithm,
      };
    }
  }

  /**
   * Get the full state for the frontend.
   */
  getState() {
    const processList = [];
    for (const proc of this.processes.values()) {
      processList.push(proc.toJSON());
    }

    return {
      mode: this.mode,
      algorithm: this.algorithm,
      config: {
        totalMemoryKB: this.totalMemoryKB,
        pageSizeKB: this.pageSizeKB,
        swapSizeKB: this.swapSizeKB,
        totalFrames: this.totalFrames,
      },
      frames: this.mode === 'paging' ? this.frames : [],
      swapSpace: this.mode === 'paging' ? this.swapSpace : [],
      segmentBlocks: this.mode === 'segmentation' ? this.segmentBlocks : [],
      processes: processList,
      metrics: this.getMetrics(),
      stats: this.stats,
      eventLog: this.eventLog.slice(-50), // Last 50 events
    };
  }
}

module.exports = MemoryEngine;
