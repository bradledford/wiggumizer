const crypto = require('crypto');

/**
 * Analyzes convergence patterns across iterations
 * Detects oscillation, similarity, and stability
 */
class ConvergenceAnalyzer {
  constructor(options = {}) {
    this.threshold = options.threshold || 0.02;
    this.oscillationWindow = options.oscillationWindow || 4; // Look back 4 iterations
    this.verbose = options.verbose || false;

    // History tracking
    this.iterationHistory = [];
    this.fileHashes = new Map(); // Current state of all files
    this.hashHistory = []; // History of file hash states
  }

  /**
   * Record an iteration
   */
  recordIteration(iteration, data) {
    const record = {
      iteration,
      filesModified: data.filesModified || 0,
      filesList: data.filesList || [],
      responseHash: this.hashString(data.response || ''),
      timestamp: Date.now()
    };

    this.iterationHistory.push(record);

    // Keep only recent history (last 10 iterations)
    if (this.iterationHistory.length > 10) {
      this.iterationHistory.shift();
    }

    return record;
  }

  /**
   * Update file hashes based on current codebase state
   */
  updateFileHashes(files) {
    const newHashes = new Map();

    for (const file of files) {
      const hash = this.hashString(file.content);
      newHashes.set(file.path, hash);
    }

    // Store snapshot of current state
    this.hashHistory.push(new Map(newHashes));

    // Keep only recent history
    if (this.hashHistory.length > 10) {
      this.hashHistory.shift();
    }

    const previousHashes = this.fileHashes;
    this.fileHashes = newHashes;

    return this.compareHashes(previousHashes, newHashes);
  }

  /**
   * Compare two hash maps
   */
  compareHashes(oldHashes, newHashes) {
    let changed = 0;
    let unchanged = 0;
    let added = 0;
    let removed = 0;

    // Check for changes and removals
    for (const [path, oldHash] of oldHashes) {
      if (!newHashes.has(path)) {
        removed++;
      } else if (newHashes.get(path) !== oldHash) {
        changed++;
      } else {
        unchanged++;
      }
    }

    // Check for additions
    for (const path of newHashes.keys()) {
      if (!oldHashes.has(path)) {
        added++;
      }
    }

    return { changed, unchanged, added, removed };
  }

  /**
   * Check for convergence
   */
  checkConvergence() {
    if (this.iterationHistory.length < 2) {
      return {
        converged: false,
        confidence: 0,
        reason: 'Not enough iterations'
      };
    }

    // Check for no changes in recent iterations
    const noChangesConvergence = this.checkNoChangesConvergence();
    if (noChangesConvergence.converged) {
      return noChangesConvergence;
    }

    // Check for oscillation
    const oscillationCheck = this.checkOscillation();
    if (oscillationCheck.detected) {
      return {
        converged: false,
        confidence: 0,
        reason: 'Oscillation detected',
        oscillation: oscillationCheck
      };
    }

    // Check for stability (file hashes not changing)
    const stabilityCheck = this.checkStability();
    if (stabilityCheck.converged) {
      return stabilityCheck;
    }

    // Check for diminishing changes
    const diminishingCheck = this.checkDiminishingChanges();
    if (diminishingCheck.converged) {
      return diminishingCheck;
    }

    return {
      converged: false,
      confidence: this.calculateConfidence(),
      reason: 'Still iterating'
    };
  }

  /**
   * Check if last N iterations had no file modifications
   */
  checkNoChangesConvergence() {
    const recentIterations = this.iterationHistory.slice(-3);

    if (recentIterations.length < 1) {
      return { converged: false };
    }

    // Check if the last iteration had no changes
    const lastIteration = recentIterations[recentIterations.length - 1];
    if (lastIteration.filesModified === 0) {
      // If the last iteration had no changes, check how many recent iterations also had no changes
      const consecutiveNoChanges = [];
      for (let i = recentIterations.length - 1; i >= 0; i--) {
        if (recentIterations[i].filesModified === 0) {
          consecutiveNoChanges.push(recentIterations[i]);
        } else {
          break;
        }
      }

      // If we have 2 or more consecutive iterations with no changes, converge
      if (consecutiveNoChanges.length >= 2) {
        return {
          converged: true,
          confidence: 1.0,
          reason: `No file modifications for ${consecutiveNoChanges.length} consecutive iterations`
        };
      }
    }

    // Also check if all recent iterations had no changes (original behavior)
    const allNoChanges = recentIterations.every(iter => iter.filesModified === 0);
    if (allNoChanges && recentIterations.length >= 2) {
      return {
        converged: true,
        confidence: 1.0,
        reason: `No file modifications for ${recentIterations.length} iterations`
      };
    }

    return { converged: false };
  }

  /**
   * Detect oscillation between states
   * e.g., A -> B -> A -> B (flip-flopping)
   */
  checkOscillation() {
    if (this.hashHistory.length < 4) {
      return { detected: false };
    }

    const recent = this.hashHistory.slice(-4);

    // Check if states alternate: [A, B, A, B]
    const state1 = recent[0];
    const state2 = recent[1];
    const state3 = recent[2];
    const state4 = recent[3];

    const match1_3 = this.hashMapsEqual(state1, state3);
    const match2_4 = this.hashMapsEqual(state2, state4);
    const different1_2 = !this.hashMapsEqual(state1, state2);

    if (match1_3 && match2_4 && different1_2) {
      return {
        detected: true,
        pattern: 'alternating',
        states: 2,
        message: 'Code is oscillating between two states'
      };
    }

    // Check for three-state cycle: [A, B, C, A]
    const match1_4 = this.hashMapsEqual(state1, state4);
    if (match1_4 && different1_2 && !match1_3) {
      return {
        detected: true,
        pattern: 'cycling',
        states: 3,
        message: 'Code is cycling through multiple states'
      };
    }

    return { detected: false };
  }

  /**
   * Check if file hashes have stabilized
   */
  checkStability() {
    if (this.hashHistory.length < 3) {
      return { converged: false };
    }

    const recent = this.hashHistory.slice(-3);
    const allEqual = recent.every(state =>
      this.hashMapsEqual(state, recent[0])
    );

    if (allEqual) {
      return {
        converged: true,
        confidence: 0.95,
        reason: 'File hashes stable for 3 iterations'
      };
    }

    return { converged: false };
  }

  /**
   * Check if changes are diminishing (getting smaller)
   */
  checkDiminishingChanges() {
    if (this.iterationHistory.length < 4) {
      return { converged: false };
    }

    const recent = this.iterationHistory.slice(-4);
    const changes = recent.map(iter => iter.filesModified);

    // Check if changes are decreasing
    const isDecreasing = changes.every((val, i) =>
      i === 0 || val <= changes[i - 1]
    );

    // Check if last changes are very small
    const lastChanges = changes.slice(-2);
    const verySmall = lastChanges.every(c => c <= 1);

    if (isDecreasing && verySmall) {
      return {
        converged: true,
        confidence: 0.85,
        reason: 'Changes diminishing to zero'
      };
    }

    return { converged: false };
  }

  /**
   * Calculate overall convergence confidence (0-1)
   */
  calculateConfidence() {
    if (this.iterationHistory.length < 2) {
      return 0;
    }

    let score = 0;
    const recent = this.iterationHistory.slice(-3);

    // No changes boost
    const noChanges = recent.filter(iter => iter.filesModified === 0).length;
    score += noChanges * 0.3;

    // Decreasing changes boost
    const changes = recent.map(iter => iter.filesModified);
    if (changes.length >= 2) {
      const decreasing = changes.every((val, i) =>
        i === 0 || val <= changes[i - 1]
      );
      if (decreasing) score += 0.2;
    }

    // Response similarity boost
    if (recent.length >= 2) {
      const lastTwo = recent.slice(-2);
      if (lastTwo[0].responseHash === lastTwo[1].responseHash) {
        score += 0.3;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Check if two hash maps are equal
   */
  hashMapsEqual(map1, map2) {
    if (map1.size !== map2.size) return false;

    for (const [key, value] of map1) {
      if (map2.get(key) !== value) return false;
    }

    return true;
  }

  /**
   * Create hash from string
   */
  hashString(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  /**
   * Get analysis summary
   */
  getSummary() {
    const convergenceCheck = this.checkConvergence();
    const oscillationCheck = this.checkOscillation();

    return {
      totalIterations: this.iterationHistory.length,
      convergence: convergenceCheck,
      oscillation: oscillationCheck,
      recentChanges: this.iterationHistory.slice(-5).map(iter => ({
        iteration: iter.iteration,
        filesModified: iter.filesModified
      }))
    };
  }

  /**
   * Reset analyzer state
   */
  reset() {
    this.iterationHistory = [];
    this.fileHashes = new Map();
    this.hashHistory = [];
  }
}

module.exports = ConvergenceAnalyzer;
