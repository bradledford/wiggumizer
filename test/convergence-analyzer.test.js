const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const ConvergenceAnalyzer = require('../src/convergence-analyzer');

describe('ConvergenceAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new ConvergenceAnalyzer({ threshold: 0.02 });
  });

  describe('constructor', () => {
    it('should use default options when none provided', () => {
      const defaultAnalyzer = new ConvergenceAnalyzer();
      assert.strictEqual(defaultAnalyzer.threshold, 0.02);
      assert.strictEqual(defaultAnalyzer.oscillationWindow, 4);
      assert.strictEqual(defaultAnalyzer.verbose, false);
    });

    it('should accept custom options', () => {
      const customAnalyzer = new ConvergenceAnalyzer({
        threshold: 0.05,
        oscillationWindow: 6,
        verbose: true
      });
      assert.strictEqual(customAnalyzer.threshold, 0.05);
      assert.strictEqual(customAnalyzer.oscillationWindow, 6);
      assert.strictEqual(customAnalyzer.verbose, true);
    });
  });

  describe('recordIteration', () => {
    it('should record iteration data', () => {
      const record = analyzer.recordIteration(1, {
        filesModified: 3,
        filesList: ['file1.js', 'file2.js', 'file3.js'],
        response: 'some response text'
      });

      assert.strictEqual(record.iteration, 1);
      assert.strictEqual(record.filesModified, 3);
      assert.deepStrictEqual(record.filesList, ['file1.js', 'file2.js', 'file3.js']);
      assert.ok(record.responseHash);
      assert.ok(record.timestamp);
    });

    it('should handle missing data gracefully', () => {
      const record = analyzer.recordIteration(1, {});

      assert.strictEqual(record.filesModified, 0);
      assert.deepStrictEqual(record.filesList, []);
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
        { path: 'file1.js', content: 'content1' },
        { path: 'file2.js', content: 'content2' }
      ];

      analyzer.updateFileHashes(files);

      assert.strictEqual(analyzer.fileHashes.size, 2);
      assert.ok(analyzer.fileHashes.has('file1.js'));
      assert.ok(analyzer.fileHashes.has('file2.js'));
    });

    it('should detect changed files', () => {
      const files1 = [
        { path: 'file1.js', content: 'content1' },
        { path: 'file2.js', content: 'content2' }
      ];

      analyzer.updateFileHashes(files1);

      const files2 = [
        { path: 'file1.js', content: 'content1-modified' },
        { path: 'file2.js', content: 'content2' }
      ];

      const result = analyzer.updateFileHashes(files2);

      assert.strictEqual(result.changed, 1);
      assert.strictEqual(result.unchanged, 1);
      assert.strictEqual(result.added, 0);
      assert.strictEqual(result.removed, 0);
    });

    it('should detect added and removed files', () => {
      const files1 = [
        { path: 'file1.js', content: 'content1' },
        { path: 'file2.js', content: 'content2' }
      ];

      analyzer.updateFileHashes(files1);

      const files2 = [
        { path: 'file1.js', content: 'content1' },
        { path: 'file3.js', content: 'content3' }
      ];

      const result = analyzer.updateFileHashes(files2);

      assert.strictEqual(result.removed, 1);
      assert.strictEqual(result.added, 1);
      assert.strictEqual(result.unchanged, 1);
    });
  });

  describe('checkConvergence', () => {
    it('should not converge with insufficient iterations', () => {
      analyzer.recordIteration(1, { filesModified: 1 });

      const result = analyzer.checkConvergence();

      assert.strictEqual(result.converged, false);
      assert.strictEqual(result.reason, 'Not enough iterations');
    });

    it('should detect convergence when no files modified for multiple iterations', () => {
      analyzer.recordIteration(1, { filesModified: 2 });
      analyzer.recordIteration(2, { filesModified: 0 });
      analyzer.recordIteration(3, { filesModified: 0 });

      const result = analyzer.checkConvergence();

      assert.strictEqual(result.converged, true);
      assert.strictEqual(result.confidence, 1.0);
      assert.ok(result.reason.includes('No file modifications'));
    });
  });

  describe('checkNoChangesConvergence', () => {
    it('should not converge with only one no-change iteration', () => {
      analyzer.recordIteration(1, { filesModified: 2 });
      analyzer.recordIteration(2, { filesModified: 0 });

      const result = analyzer.checkNoChangesConvergence();

      assert.strictEqual(result.converged, false);
    });

    it('should converge after multiple no-change iterations', () => {
      analyzer.recordIteration(1, { filesModified: 0 });
      analyzer.recordIteration(2, { filesModified: 0 });
      analyzer.recordIteration(3, { filesModified: 0 });

      const result = analyzer.checkNoChangesConvergence();

      assert.strictEqual(result.converged, true);
      assert.strictEqual(result.confidence, 1.0);
    });
  });

  describe('checkOscillation', () => {
    it('should not detect oscillation with insufficient history', () => {
      analyzer.updateFileHashes([{ path: 'f.js', content: 'a' }]);
      analyzer.updateFileHashes([{ path: 'f.js', content: 'b' }]);

      const result = analyzer.checkOscillation();

      assert.strictEqual(result.detected, false);
    });

    it('should detect alternating oscillation pattern', () => {
      // State A
      analyzer.updateFileHashes([{ path: 'f.js', content: 'state-a' }]);
      // State B
      analyzer.updateFileHashes([{ path: 'f.js', content: 'state-b' }]);
      // State A again
      analyzer.updateFileHashes([{ path: 'f.js', content: 'state-a' }]);
      // State B again
      analyzer.updateFileHashes([{ path: 'f.js', content: 'state-b' }]);

      const result = analyzer.checkOscillation();

      assert.strictEqual(result.detected, true);
      assert.strictEqual(result.pattern, 'alternating');
      assert.strictEqual(result.states, 2);
    });

    it('should detect three-state cycling pattern', () => {
      // State A
      analyzer.updateFileHashes([{ path: 'f.js', content: 'state-a' }]);
      // State B
      analyzer.updateFileHashes([{ path: 'f.js', content: 'state-b' }]);
      // State C
      analyzer.updateFileHashes([{ path: 'f.js', content: 'state-c' }]);
      // State A again
      analyzer.updateFileHashes([{ path: 'f.js', content: 'state-a' }]);

      const result = analyzer.checkOscillation();

      assert.strictEqual(result.detected, true);
      assert.strictEqual(result.pattern, 'cycling');
      assert.strictEqual(result.states, 3);
    });

    it('should not detect oscillation when states are stable', () => {
      analyzer.updateFileHashes([{ path: 'f.js', content: 'stable' }]);
      analyzer.updateFileHashes([{ path: 'f.js', content: 'stable' }]);
      analyzer.updateFileHashes([{ path: 'f.js', content: 'stable' }]);
      analyzer.updateFileHashes([{ path: 'f.js', content: 'stable' }]);

      const result = analyzer.checkOscillation();

      assert.strictEqual(result.detected, false);
    });
  });

  describe('checkStability', () => {
    it('should not detect stability with insufficient history', () => {
      analyzer.updateFileHashes([{ path: 'f.js', content: 'a' }]);
      analyzer.updateFileHashes([{ path: 'f.js', content: 'a' }]);

      const result = analyzer.checkStability();

      assert.strictEqual(result.converged, false);
    });

    it('should detect stability when hashes are unchanged', () => {
      analyzer.updateFileHashes([{ path: 'f.js', content: 'stable-content' }]);
      analyzer.updateFileHashes([{ path: 'f.js', content: 'stable-content' }]);
      analyzer.updateFileHashes([{ path: 'f.js', content: 'stable-content' }]);

      const result = analyzer.checkStability();

      assert.strictEqual(result.converged, true);
      assert.strictEqual(result.confidence, 0.95);
    });
  });

  describe('checkDiminishingChanges', () => {
    it('should not detect diminishing changes with insufficient history', () => {
      analyzer.recordIteration(1, { filesModified: 5 });
      analyzer.recordIteration(2, { filesModified: 3 });

      const result = analyzer.checkDiminishingChanges();

      assert.strictEqual(result.converged, false);
    });

    it('should detect diminishing changes pattern', () => {
      analyzer.recordIteration(1, { filesModified: 5 });
      analyzer.recordIteration(2, { filesModified: 3 });
      analyzer.recordIteration(3, { filesModified: 1 });
      analyzer.recordIteration(4, { filesModified: 0 });

      const result = analyzer.checkDiminishingChanges();

      assert.strictEqual(result.converged, true);
      assert.strictEqual(result.confidence, 0.85);
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
    it('should return 0 with insufficient iterations', () => {
      analyzer.recordIteration(1, { filesModified: 1 });

      const confidence = analyzer.calculateConfidence();

      assert.strictEqual(confidence, 0);
    });

    it('should increase confidence with no changes', () => {
      analyzer.recordIteration(1, { filesModified: 0 });
      analyzer.recordIteration(2, { filesModified: 0 });
      analyzer.recordIteration(3, { filesModified: 0 });

      const confidence = analyzer.calculateConfidence();

      assert.ok(confidence > 0.5);
    });

    it('should cap confidence at 1.0', () => {
      // Create conditions for maximum confidence
      for (let i = 1; i <= 5; i++) {
        analyzer.recordIteration(i, {
          filesModified: 0,
          response: 'identical response'
        });
      }

      const confidence = analyzer.calculateConfidence();

      assert.ok(confidence <= 1.0);
    });
  });

  describe('hashMapsEqual', () => {
    it('should return true for identical maps', () => {
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
      const map1 = new Map([['a', '1'], ['b', '2']]);
      const map2 = new Map([['a', '1'], ['b', '3']]);

      assert.strictEqual(analyzer.hashMapsEqual(map1, map2), false);
    });
  });

  describe('hashString', () => {
    it('should produce consistent hashes', () => {
      const hash1 = analyzer.hashString('test content');
      const hash2 = analyzer.hashString('test content');

      assert.strictEqual(hash1, hash2);
    });

    it('should produce different hashes for different content', () => {
      const hash1 = analyzer.hashString('content 1');
      const hash2 = analyzer.hashString('content 2');

      assert.notStrictEqual(hash1, hash2);
    });

    it('should produce 64-character SHA-256 hash', () => {
      const hash = analyzer.hashString('test');

      assert.strictEqual(hash.length, 64);
      assert.ok(/^[a-f0-9]+$/.test(hash));
    });
  });

  describe('getSummary', () => {
    it('should return comprehensive summary', () => {
      analyzer.recordIteration(1, { filesModified: 3 });
      analyzer.recordIteration(2, { filesModified: 1 });
      analyzer.updateFileHashes([{ path: 'f.js', content: 'a' }]);

      const summary = analyzer.getSummary();

      assert.ok('totalIterations' in summary);
      assert.ok('convergence' in summary);
      assert.ok('oscillation' in summary);
      assert.ok('recentChanges' in summary);
      assert.strictEqual(summary.totalIterations, 2);
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      analyzer.recordIteration(1, { filesModified: 3 });
      analyzer.updateFileHashes([{ path: 'f.js', content: 'a' }]);

      analyzer.reset();

      assert.strictEqual(analyzer.iterationHistory.length, 0);
      assert.strictEqual(analyzer.fileHashes.size, 0);
      assert.strictEqual(analyzer.hashHistory.length, 0);
    });
  });
});
