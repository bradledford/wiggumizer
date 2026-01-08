const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const ConvergenceAnalyzer = require('../src/convergence-analyzer');

describe('ConvergenceAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new ConvergenceAnalyzer({ threshold: 0.02 });
  });

  describe('recordIteration', () => {
    it('should record an iteration with all fields', () => {
      const record = analyzer.recordIteration(1, {
        filesModified: 3,
        filesList: ['a.js', 'b.js', 'c.js'],
        response: 'Some response text'
      });

      assert.strictEqual(record.iteration, 1);
      assert.strictEqual(record.filesModified, 3);
      assert.deepStrictEqual(record.filesList, ['a.js', 'b.js', 'c.js']);
      assert.ok(record.responseHash);
      assert.ok(record.timestamp);
    });

    it('should keep only last 10 iterations', () => {
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

      analyzer.updateFileHashes(files);

      assert.strictEqual(analyzer.fileHashes.size, 2);
      assert.ok(analyzer.fileHashes.has('a.js'));
      assert.ok(analyzer.fileHashes.has('b.js'));
    });

    it('should detect changed files', () => {
      const files1 = [
        { path: 'a.js', content: 'const a = 1;' },
        { path: 'b.js', content: 'const b = 2;' }
      ];

      const files2 = [
        { path: 'a.js', content: 'const a = 100;' }, // Changed
        { path: 'b.js', content: 'const b = 2;' }    // Same
      ];

      analyzer.updateFileHashes(files1);
      const comparison = analyzer.updateFileHashes(files2);

      assert.strictEqual(comparison.changed, 1);
      assert.strictEqual(comparison.unchanged, 1);
      assert.strictEqual(comparison.added, 0);
      assert.strictEqual(comparison.removed, 0);
    });

    it('should detect added and removed files', () => {
      const files1 = [
        { path: 'a.js', content: 'const a = 1;' },
        { path: 'b.js', content: 'const b = 2;' }
      ];

      const files2 = [
        { path: 'a.js', content: 'const a = 1;' },
        { path: 'c.js', content: 'const c = 3;' }  // b removed, c added
      ];

      analyzer.updateFileHashes(files1);
      const comparison = analyzer.updateFileHashes(files2);

      assert.strictEqual(comparison.added, 1);
      assert.strictEqual(comparison.removed, 1);
      assert.strictEqual(comparison.unchanged, 1);
    });
  });

  describe('checkNoChangesConvergence', () => {
    it('should detect convergence when no files modified for 3 iterations', () => {
      analyzer.recordIteration(1, { filesModified: 5 });
      analyzer.recordIteration(2, { filesModified: 0 });
      analyzer.recordIteration(3, { filesModified: 0 });
      analyzer.recordIteration(4, { filesModified: 0 });

      const result = analyzer.checkNoChangesConvergence();

      assert.strictEqual(result.converged, true);
      assert.strictEqual(result.confidence, 1.0);
    });

    it('should not converge if recent iterations have changes', () => {
      analyzer.recordIteration(1, { filesModified: 5 });
      analyzer.recordIteration(2, { filesModified: 0 });
      analyzer.recordIteration(3, { filesModified: 1 });

      const result = analyzer.checkNoChangesConvergence();

      assert.strictEqual(result.converged, false);
    });
  });

  describe('checkOscillation', () => {
    it('should detect alternating oscillation pattern', () => {
      // Simulate A -> B -> A -> B pattern
      const stateA = [{ path: 'a.js', content: 'version A' }];
      const stateB = [{ path: 'a.js', content: 'version B' }];

      analyzer.updateFileHashes(stateA);
      analyzer.updateFileHashes(stateB);
      analyzer.updateFileHashes(stateA);
      analyzer.updateFileHashes(stateB);

      const result = analyzer.checkOscillation();

      assert.strictEqual(result.detected, true);
      assert.strictEqual(result.pattern, 'alternating');
      assert.strictEqual(result.states, 2);
    });

    it('should not detect oscillation with consistent progress', () => {
      const files1 = [{ path: 'a.js', content: 'v1' }];
      const files2 = [{ path: 'a.js', content: 'v2' }];
      const files3 = [{ path: 'a.js', content: 'v3' }];
      const files4 = [{ path: 'a.js', content: 'v4' }];

      analyzer.updateFileHashes(files1);
      analyzer.updateFileHashes(files2);
      analyzer.updateFileHashes(files3);
      analyzer.updateFileHashes(files4);

      const result = analyzer.checkOscillation();

      assert.strictEqual(result.detected, false);
    });

    it('should detect cycling pattern (A -> B -> C -> A)', () => {
      const stateA = [{ path: 'a.js', content: 'A' }];
      const stateB = [{ path: 'a.js', content: 'B' }];
      const stateC = [{ path: 'a.js', content: 'C' }];

      analyzer.updateFileHashes(stateA);
      analyzer.updateFileHashes(stateB);
      analyzer.updateFileHashes(stateC);
      analyzer.updateFileHashes(stateA);

      const result = analyzer.checkOscillation();

      assert.strictEqual(result.detected, true);
      assert.strictEqual(result.pattern, 'cycling');
    });

    it('should return not detected with less than 4 iterations', () => {
      analyzer.updateFileHashes([{ path: 'a.js', content: 'v1' }]);
      analyzer.updateFileHashes([{ path: 'a.js', content: 'v2' }]);

      const result = analyzer.checkOscillation();

      assert.strictEqual(result.detected, false);
    });
  });

  describe('checkStability', () => {
    it('should detect stability when files unchanged for 3 iterations', () => {
      const stableState = [{ path: 'a.js', content: 'stable' }];

      analyzer.updateFileHashes(stableState);
      analyzer.updateFileHashes(stableState);
      analyzer.updateFileHashes(stableState);

      const result = analyzer.checkStability();

      assert.strictEqual(result.converged, true);
      assert.ok(result.confidence >= 0.9);
    });

    it('should not detect stability with changes', () => {
      analyzer.updateFileHashes([{ path: 'a.js', content: 'v1' }]);
      analyzer.updateFileHashes([{ path: 'a.js', content: 'v2' }]);
      analyzer.updateFileHashes([{ path: 'a.js', content: 'v3' }]);

      const result = analyzer.checkStability();

      assert.strictEqual(result.converged, false);
    });
  });

  describe('checkDiminishingChanges', () => {
    it('should detect diminishing changes leading to convergence', () => {
      analyzer.recordIteration(1, { filesModified: 10 });
      analyzer.recordIteration(2, { filesModified: 5 });
      analyzer.recordIteration(3, { filesModified: 1 });
      analyzer.recordIteration(4, { filesModified: 0 });

      const result = analyzer.checkDiminishingChanges();

      assert.strictEqual(result.converged, true);
    });

    it('should not converge if changes are increasing', () => {
      analyzer.recordIteration(1, { filesModified: 1 });
      analyzer.recordIteration(2, { filesModified: 3 });
      analyzer.recordIteration(3, { filesModified: 5 });
      analyzer.recordIteration(4, { filesModified: 7 });

      const result = analyzer.checkDiminishingChanges();

      assert.strictEqual(result.converged, false);
    });
  });

  describe('checkConvergence', () => {
    it('should return not converged with less than 2 iterations', () => {
      analyzer.recordIteration(1, { filesModified: 1 });

      const result = analyzer.checkConvergence();

      assert.strictEqual(result.converged, false);
      assert.strictEqual(result.confidence, 0);
    });

    it('should integrate all convergence checks', () => {
      // Simulate a converging scenario
      analyzer.recordIteration(1, { filesModified: 0 });
      analyzer.recordIteration(2, { filesModified: 0 });
      analyzer.recordIteration(3, { filesModified: 0 });

      const result = analyzer.checkConvergence();

      assert.strictEqual(result.converged, true);
    });
  });

  describe('calculateConfidence', () => {
    it('should return 0 with less than 2 iterations', () => {
      const confidence = analyzer.calculateConfidence();
      assert.strictEqual(confidence, 0);
    });

    it('should increase confidence with no changes', () => {
      analyzer.recordIteration(1, { filesModified: 0, response: 'same' });
      analyzer.recordIteration(2, { filesModified: 0, response: 'same' });
      analyzer.recordIteration(3, { filesModified: 0, response: 'same' });

      const confidence = analyzer.calculateConfidence();

      assert.ok(confidence > 0.5, `Expected confidence > 0.5, got ${confidence}`);
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

  describe('hashMapsEqual', () => {
    it('should return true for equal maps', () => {
      const map1 = new Map([['a', '1'], ['b', '2']]);
      const map2 = new Map([['a', '1'], ['b', '2']]);

      assert.strictEqual(analyzer.hashMapsEqual(map1, map2), true);
    });

    it('should return false for different values', () => {
      const map1 = new Map([['a', '1']]);
      const map2 = new Map([['a', '2']]);

      assert.strictEqual(analyzer.hashMapsEqual(map1, map2), false);
    });

    it('should return false for different sizes', () => {
      const map1 = new Map([['a', '1']]);
      const map2 = new Map([['a', '1'], ['b', '2']]);

      assert.strictEqual(analyzer.hashMapsEqual(map1, map2), false);
    });
  });

  describe('getSummary', () => {
    it('should return complete summary', () => {
      analyzer.recordIteration(1, { filesModified: 5 });
      analyzer.recordIteration(2, { filesModified: 2 });

      const summary = analyzer.getSummary();

      assert.strictEqual(summary.totalIterations, 2);
      assert.ok('convergence' in summary);
      assert.ok('oscillation' in summary);
      assert.ok('recentChanges' in summary);
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
