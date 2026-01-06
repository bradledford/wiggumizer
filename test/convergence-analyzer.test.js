const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const ConvergenceAnalyzer = require('../src/convergence-analyzer');

describe('ConvergenceAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new ConvergenceAnalyzer({ threshold: 0.02 });
  });

  describe('recordIteration', () => {
    it('should record an iteration with correct data', () => {
      const record = analyzer.recordIteration(1, {
        filesModified: 2,
        filesList: ['src/index.js', 'src/utils.js'],
        response: 'Modified two files'
      });

      assert.strictEqual(record.iteration, 1);
      assert.strictEqual(record.filesModified, 2);
      assert.deepStrictEqual(record.filesList, ['src/index.js', 'src/utils.js']);
      assert.ok(record.responseHash);
      assert.ok(record.timestamp);
    });

    it('should keep only last 10 iterations', () => {
      for (let i = 1; i <= 15; i++) {
        analyzer.recordIteration(i, { filesModified: 1 });
      }

      assert.strictEqual(analyzer.iterationHistory.length, 10);
      assert.strictEqual(analyzer.iterationHistory[0].iteration, 6);
      assert.strictEqual(analyzer.iterationHistory[9].iteration, 15);
    });
  });

  describe('updateFileHashes', () => {
    it('should detect changed files', () => {
      const files1 = [
        { path: 'src/index.js', content: 'console.log("hello")' },
        { path: 'src/utils.js', content: 'export const foo = 1' }
      ];

      const files2 = [
        { path: 'src/index.js', content: 'console.log("hello world")' }, // changed
        { path: 'src/utils.js', content: 'export const foo = 1' } // unchanged
      ];

      analyzer.updateFileHashes(files1);
      const comparison = analyzer.updateFileHashes(files2);

      assert.strictEqual(comparison.changed, 1);
      assert.strictEqual(comparison.unchanged, 1);
      assert.strictEqual(comparison.added, 0);
      assert.strictEqual(comparison.removed, 0);
    });

    it('should detect added files', () => {
      const files1 = [
        { path: 'src/index.js', content: 'hello' }
      ];

      const files2 = [
        { path: 'src/index.js', content: 'hello' },
        { path: 'src/new.js', content: 'new file' }
      ];

      analyzer.updateFileHashes(files1);
      const comparison = analyzer.updateFileHashes(files2);

      assert.strictEqual(comparison.added, 1);
      assert.strictEqual(comparison.unchanged, 1);
    });

    it('should detect removed files', () => {
      const files1 = [
        { path: 'src/index.js', content: 'hello' },
        { path: 'src/old.js', content: 'old file' }
      ];

      const files2 = [
        { path: 'src/index.js', content: 'hello' }
      ];

      analyzer.updateFileHashes(files1);
      const comparison = analyzer.updateFileHashes(files2);

      assert.strictEqual(comparison.removed, 1);
      assert.strictEqual(comparison.unchanged, 1);
    });
  });

  describe('checkNoChangesConvergence', () => {
    it('should converge when no files modified for multiple iterations', () => {
      analyzer.recordIteration(1, { filesModified: 0 });
      analyzer.recordIteration(2, { filesModified: 0 });
      analyzer.recordIteration(3, { filesModified: 0 });

      const result = analyzer.checkNoChangesConvergence();

      assert.strictEqual(result.converged, true);
      assert.strictEqual(result.confidence, 1.0);
    });

    it('should not converge when files are still being modified', () => {
      analyzer.recordIteration(1, { filesModified: 2 });
      analyzer.recordIteration(2, { filesModified: 1 });
      analyzer.recordIteration(3, { filesModified: 0 });

      const result = analyzer.checkNoChangesConvergence();

      assert.strictEqual(result.converged, false);
    });
  });

  describe('checkOscillation', () => {
    it('should detect alternating oscillation pattern', () => {
      const stateA = [{ path: 'file.js', content: 'state A' }];
      const stateB = [{ path: 'file.js', content: 'state B' }];

      // Simulate A -> B -> A -> B pattern
      analyzer.updateFileHashes(stateA);
      analyzer.updateFileHashes(stateB);
      analyzer.updateFileHashes(stateA);
      analyzer.updateFileHashes(stateB);

      const result = analyzer.checkOscillation();

      assert.strictEqual(result.detected, true);
      assert.strictEqual(result.pattern, 'alternating');
      assert.strictEqual(result.states, 2);
    });

    it('should not detect oscillation for normal convergence', () => {
      const files = [
        [{ path: 'file.js', content: 'version 1' }],
        [{ path: 'file.js', content: 'version 2' }],
        [{ path: 'file.js', content: 'version 3' }],
        [{ path: 'file.js', content: 'version 4' }]
      ];

      files.forEach(f => analyzer.updateFileHashes(f));

      const result = analyzer.checkOscillation();

      assert.strictEqual(result.detected, false);
    });

    it('should detect cycling pattern', () => {
      const stateA = [{ path: 'file.js', content: 'state A' }];
      const stateB = [{ path: 'file.js', content: 'state B' }];
      const stateC = [{ path: 'file.js', content: 'state C' }];

      // Simulate A -> B -> C -> A pattern
      analyzer.updateFileHashes(stateA);
      analyzer.updateFileHashes(stateB);
      analyzer.updateFileHashes(stateC);
      analyzer.updateFileHashes(stateA);

      const result = analyzer.checkOscillation();

      assert.strictEqual(result.detected, true);
      assert.strictEqual(result.pattern, 'cycling');
    });
  });

  describe('checkStability', () => {
    it('should converge when file hashes are stable for 3 iterations', () => {
      const stableState = [{ path: 'file.js', content: 'stable content' }];

      analyzer.updateFileHashes(stableState);
      analyzer.updateFileHashes(stableState);
      analyzer.updateFileHashes(stableState);

      const result = analyzer.checkStability();

      assert.strictEqual(result.converged, true);
      assert.ok(result.confidence >= 0.9);
    });

    it('should not converge when files are still changing', () => {
      analyzer.updateFileHashes([{ path: 'file.js', content: 'v1' }]);
      analyzer.updateFileHashes([{ path: 'file.js', content: 'v2' }]);
      analyzer.updateFileHashes([{ path: 'file.js', content: 'v3' }]);

      const result = analyzer.checkStability();

      assert.strictEqual(result.converged, false);
    });
  });

  describe('checkDiminishingChanges', () => {
    it('should converge when changes are diminishing to zero', () => {
      analyzer.recordIteration(1, { filesModified: 5 });
      analyzer.recordIteration(2, { filesModified: 3 });
      analyzer.recordIteration(3, { filesModified: 1 });
      analyzer.recordIteration(4, { filesModified: 0 });

      const result = analyzer.checkDiminishingChanges();

      assert.strictEqual(result.converged, true);
    });

    it('should not converge when changes are not diminishing', () => {
      analyzer.recordIteration(1, { filesModified: 2 });
      analyzer.recordIteration(2, { filesModified: 5 });
      analyzer.recordIteration(3, { filesModified: 3 });
      analyzer.recordIteration(4, { filesModified: 4 });

      const result = analyzer.checkDiminishingChanges();

      assert.strictEqual(result.converged, false);
    });
  });

  describe('calculateConfidence', () => {
    it('should return 0 for insufficient iterations', () => {
      analyzer.recordIteration(1, { filesModified: 1 });

      const confidence = analyzer.calculateConfidence();

      assert.strictEqual(confidence, 0);
    });

    it('should increase confidence for no-change iterations', () => {
      analyzer.recordIteration(1, { filesModified: 0 });
      analyzer.recordIteration(2, { filesModified: 0 });
      analyzer.recordIteration(3, { filesModified: 0 });

      const confidence = analyzer.calculateConfidence();

      assert.ok(confidence > 0.5);
    });

    it('should increase confidence for decreasing changes', () => {
      analyzer.recordIteration(1, { filesModified: 3 });
      analyzer.recordIteration(2, { filesModified: 2 });
      analyzer.recordIteration(3, { filesModified: 1 });

      const confidence = analyzer.calculateConfidence();

      assert.ok(confidence > 0);
    });
  });

  describe('checkConvergence', () => {
    it('should return not converged for too few iterations', () => {
      analyzer.recordIteration(1, { filesModified: 1 });

      const result = analyzer.checkConvergence();

      assert.strictEqual(result.converged, false);
      assert.strictEqual(result.reason, 'Not enough iterations');
    });

    it('should detect convergence via no changes', () => {
      analyzer.recordIteration(1, { filesModified: 0 });
      analyzer.recordIteration(2, { filesModified: 0 });
      analyzer.recordIteration(3, { filesModified: 0 });

      const result = analyzer.checkConvergence();

      assert.strictEqual(result.converged, true);
    });

    it('should report oscillation without converging', () => {
      const stateA = [{ path: 'file.js', content: 'A' }];
      const stateB = [{ path: 'file.js', content: 'B' }];

      analyzer.updateFileHashes(stateA);
      analyzer.recordIteration(1, { filesModified: 1 });
      analyzer.updateFileHashes(stateB);
      analyzer.recordIteration(2, { filesModified: 1 });
      analyzer.updateFileHashes(stateA);
      analyzer.recordIteration(3, { filesModified: 1 });
      analyzer.updateFileHashes(stateB);
      analyzer.recordIteration(4, { filesModified: 1 });

      const result = analyzer.checkConvergence();

      assert.strictEqual(result.converged, false);
      assert.ok(result.oscillation);
      assert.strictEqual(result.oscillation.detected, true);
    });
  });

  describe('hashMapsEqual', () => {
    it('should return true for equal maps', () => {
      const map1 = new Map([['a', '1'], ['b', '2']]);
      const map2 = new Map([['a', '1'], ['b', '2']]);

      assert.strictEqual(analyzer.hashMapsEqual(map1, map2), true);
    });

    it('should return false for different sizes', () => {
      const map1 = new Map([['a', '1']]);
      const map2 = new Map([['a', '1'], ['b', '2']]);

      assert.strictEqual(analyzer.hashMapsEqual(map1, map2), false);
    });

    it('should return false for different values', () => {
      const map1 = new Map([['a', '1']]);
      const map2 = new Map([['a', '2']]);

      assert.strictEqual(analyzer.hashMapsEqual(map1, map2), false);
    });
  });

  describe('getSummary', () => {
    it('should return a complete summary', () => {
      analyzer.recordIteration(1, { filesModified: 2 });
      analyzer.recordIteration(2, { filesModified: 1 });

      const summary = analyzer.getSummary();

      assert.strictEqual(summary.totalIterations, 2);
      assert.ok('convergence' in summary);
      assert.ok('oscillation' in summary);
      assert.ok('recentChanges' in summary);
      assert.strictEqual(summary.recentChanges.length, 2);
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      analyzer.recordIteration(1, { filesModified: 1 });
      analyzer.updateFileHashes([{ path: 'file.js', content: 'test' }]);

      analyzer.reset();

      assert.strictEqual(analyzer.iterationHistory.length, 0);
      assert.strictEqual(analyzer.fileHashes.size, 0);
      assert.strictEqual(analyzer.hashHistory.length, 0);
    });
  });
});
