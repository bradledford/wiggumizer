const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const ConvergenceAnalyzer = require('../src/convergence-analyzer');

describe('ConvergenceAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new ConvergenceAnalyzer({ threshold: 0.02 });
  });

  describe('constructor', () => {
    it('should use default options', () => {
      const a = new ConvergenceAnalyzer();
      assert.strictEqual(a.threshold, 0.02);
      assert.strictEqual(a.oscillationWindow, 4);
    });

    it('should accept custom options', () => {
      const a = new ConvergenceAnalyzer({
        threshold: 0.05,
        oscillationWindow: 6
      });
      assert.strictEqual(a.threshold, 0.05);
      assert.strictEqual(a.oscillationWindow, 6);
    });
  });

  describe('recordIteration', () => {
    it('should record iteration with metadata', () => {
      const record = analyzer.recordIteration(1, {
        filesModified: 3,
        filesList: ['a.js', 'b.js', 'c.js'],
        response: 'Some response'
      });

      assert.strictEqual(record.iteration, 1);
      assert.strictEqual(record.filesModified, 3);
      assert.ok(record.responseHash);
      assert.ok(record.timestamp);
    });

    it('should maintain history of 10 iterations', () => {
      for (let i = 1; i <= 15; i++) {
        analyzer.recordIteration(i, { filesModified: i });
      }

      assert.strictEqual(analyzer.iterationHistory.length, 10);
      assert.strictEqual(analyzer.iterationHistory[0].iteration, 6);
      assert.strictEqual(analyzer.iterationHistory[9].iteration, 15);
    });
  });

  describe('updateFileHashes', () => {
    it('should track file hashes', () => {
      const files = [
        { path: 'a.js', content: 'const a = 1;' },
        { path: 'b.js', content: 'const b = 2;' }
      ];

      const changes = analyzer.updateFileHashes(files);

      assert.strictEqual(changes.added, 2);
      assert.strictEqual(changes.changed, 0);
      assert.strictEqual(changes.removed, 0);
    });

    it('should detect file changes', () => {
      analyzer.updateFileHashes([
        { path: 'a.js', content: 'original' }
      ]);

      const changes = analyzer.updateFileHashes([
        { path: 'a.js', content: 'modified' }
      ]);

      assert.strictEqual(changes.changed, 1);
    });

    it('should detect file additions and removals', () => {
      analyzer.updateFileHashes([
        { path: 'a.js', content: 'a' },
        { path: 'b.js', content: 'b' }
      ]);

      const changes = analyzer.updateFileHashes([
        { path: 'a.js', content: 'a' },
        { path: 'c.js', content: 'c' }
      ]);

      assert.strictEqual(changes.unchanged, 1);
      assert.strictEqual(changes.removed, 1);
      assert.strictEqual(changes.added, 1);
    });
  });

  describe('checkConvergence', () => {
    it('should not converge with insufficient history', () => {
      analyzer.recordIteration(1, { filesModified: 5 });

      const result = analyzer.checkConvergence();

      assert.strictEqual(result.converged, false);
      assert.strictEqual(result.confidence, 0);
    });

    it('should converge when no changes for multiple iterations', () => {
      for (let i = 1; i <= 5; i++) {
        analyzer.recordIteration(i, { filesModified: 0 });
      }

      const result = analyzer.checkConvergence();

      assert.strictEqual(result.converged, true);
      assert.strictEqual(result.confidence, 1.0);
      assert.ok(result.reason.includes('No file modifications'));
    });

    it('should converge after 2 consecutive iterations with no changes', () => {
      analyzer.recordIteration(1, { filesModified: 5 });
      analyzer.recordIteration(2, { filesModified: 3 });
      analyzer.recordIteration(3, { filesModified: 0 });
      analyzer.recordIteration(4, { filesModified: 0 });

      const result = analyzer.checkConvergence();

      assert.strictEqual(result.converged, true);
      assert.strictEqual(result.confidence, 1.0);
      assert.ok(result.reason.includes('consecutive'));
    });

    it('should not converge with only 1 iteration of no changes', () => {
      analyzer.recordIteration(1, { filesModified: 5 });
      analyzer.recordIteration(2, { filesModified: 3 });
      analyzer.recordIteration(3, { filesModified: 0 });

      const result = analyzer.checkConvergence();

      assert.strictEqual(result.converged, false);
    });

    it('should not converge when files are still being modified', () => {
      analyzer.recordIteration(1, { filesModified: 5 });
      analyzer.recordIteration(2, { filesModified: 3 });
      analyzer.recordIteration(3, { filesModified: 2 });

      const result = analyzer.checkConvergence();

      assert.strictEqual(result.converged, false);
    });
  });

  describe('checkOscillation', () => {
    it('should detect alternating state oscillation', () => {
      // Set up oscillating hash states: A -> B -> A -> B
      const stateA = [{ path: 'a.js', content: 'state A' }];
      const stateB = [{ path: 'a.js', content: 'state B' }];

      analyzer.updateFileHashes(stateA);
      analyzer.updateFileHashes(stateB);
      analyzer.updateFileHashes(stateA);
      analyzer.updateFileHashes(stateB);

      const result = analyzer.checkOscillation();

      assert.strictEqual(result.detected, true);
      assert.strictEqual(result.pattern, 'alternating');
    });

    it('should not detect oscillation with insufficient history', () => {
      analyzer.updateFileHashes([{ path: 'a.js', content: 'v1' }]);
      analyzer.updateFileHashes([{ path: 'a.js', content: 'v2' }]);

      const result = analyzer.checkOscillation();

      assert.strictEqual(result.detected, false);
    });

    it('should not detect oscillation when states are unique', () => {
      analyzer.updateFileHashes([{ path: 'a.js', content: 'v1' }]);
      analyzer.updateFileHashes([{ path: 'a.js', content: 'v2' }]);
      analyzer.updateFileHashes([{ path: 'a.js', content: 'v3' }]);
      analyzer.updateFileHashes([{ path: 'a.js', content: 'v4' }]);

      const result = analyzer.checkOscillation();

      assert.strictEqual(result.detected, false);
    });
  });

  describe('checkStability', () => {
    it('should detect stable file states', () => {
      const stableFiles = [{ path: 'a.js', content: 'stable' }];

      analyzer.updateFileHashes(stableFiles);
      analyzer.updateFileHashes(stableFiles);
      analyzer.updateFileHashes(stableFiles);

      const result = analyzer.checkStability();

      assert.strictEqual(result.converged, true);
      assert.ok(result.reason.includes('stable'));
    });

    it('should not detect stability with changing files', () => {
      analyzer.updateFileHashes([{ path: 'a.js', content: 'v1' }]);
      analyzer.updateFileHashes([{ path: 'a.js', content: 'v2' }]);
      analyzer.updateFileHashes([{ path: 'a.js', content: 'v3' }]);

      const result = analyzer.checkStability();

      assert.strictEqual(result.converged, false);
    });
  });

  describe('checkDiminishingChanges', () => {
    it('should detect diminishing changes', () => {
      analyzer.recordIteration(1, { filesModified: 10 });
      analyzer.recordIteration(2, { filesModified: 5 });
      analyzer.recordIteration(3, { filesModified: 1 });
      analyzer.recordIteration(4, { filesModified: 0 });

      const result = analyzer.checkDiminishingChanges();

      assert.strictEqual(result.converged, true);
      assert.ok(result.reason.includes('diminishing'));
    });

    it('should not detect diminishing when changes increase', () => {
      analyzer.recordIteration(1, { filesModified: 2 });
      analyzer.recordIteration(2, { filesModified: 5 });
      analyzer.recordIteration(3, { filesModified: 3 });
      analyzer.recordIteration(4, { filesModified: 6 });

      const result = analyzer.checkDiminishingChanges();

      assert.strictEqual(result.converged, false);
    });
  });

  describe('calculateConfidence', () => {
    it('should return 0 with insufficient history', () => {
      analyzer.recordIteration(1, { filesModified: 0 });

      const confidence = analyzer.calculateConfidence();

      assert.strictEqual(confidence, 0);
    });

    it('should increase confidence with no changes', () => {
      analyzer.recordIteration(1, { filesModified: 0 });
      analyzer.recordIteration(2, { filesModified: 0 });
      analyzer.recordIteration(3, { filesModified: 0 });

      const confidence = analyzer.calculateConfidence();

      assert.ok(confidence > 0.5, `Confidence should be high (got ${confidence})`);
    });
  });

  describe('hashString', () => {
    it('should produce consistent hashes', () => {
      const hash1 = analyzer.hashString('test content');
      const hash2 = analyzer.hashString('test content');

      assert.strictEqual(hash1, hash2);
    });

    it('should produce different hashes for different content', () => {
      const hash1 = analyzer.hashString('content A');
      const hash2 = analyzer.hashString('content B');

      assert.notStrictEqual(hash1, hash2);
    });
  });

  describe('getSummary', () => {
    it('should return comprehensive summary', () => {
      analyzer.recordIteration(1, { filesModified: 5 });
      analyzer.recordIteration(2, { filesModified: 3 });

      const summary = analyzer.getSummary();

      assert.strictEqual(summary.totalIterations, 2);
      assert.ok('convergence' in summary);
      assert.ok('oscillation' in summary);
      assert.ok(Array.isArray(summary.recentChanges));
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      analyzer.recordIteration(1, { filesModified: 5 });
      analyzer.updateFileHashes([{ path: 'a.js', content: 'test' }]);

      analyzer.reset();

      assert.strictEqual(analyzer.iterationHistory.length, 0);
      assert.strictEqual(analyzer.fileHashes.size, 0);
      assert.strictEqual(analyzer.hashHistory.length, 0);
    });
  });
});
