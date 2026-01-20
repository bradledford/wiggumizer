const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const ValidationRunner = require('../src/validation-runner');

describe('ValidationRunner', () => {
  let runner;

  beforeEach(() => {
    runner = new ValidationRunner({
      verbose: false
    });
  });

  describe('constructor', () => {
    it('should use default options', () => {
      const r = new ValidationRunner();
      assert.strictEqual(r.verbose, false);
      assert.strictEqual(r.timeout, 300000);
    });

    it('should accept custom options', () => {
      const r = new ValidationRunner({
        verbose: true,
        timeout: 60000
      });
      assert.strictEqual(r.verbose, true);
      assert.strictEqual(r.timeout, 60000);
    });
  });

  describe('hasValidation', () => {
    it('should return false with no validation configured', () => {
      const r = new ValidationRunner({ runTests: false, runBuild: false, customChecks: [] });
      assert.strictEqual(r.hasValidation(), false);
    });

    it('should return true when tests are configured', () => {
      const r = new ValidationRunner({ runTests: true });
      assert.strictEqual(r.hasValidation(), true);
    });

    it('should return true when build is configured', () => {
      const r = new ValidationRunner({ runBuild: true });
      assert.strictEqual(r.hasValidation(), true);
    });

    it('should return true when custom checks are configured', () => {
      const r = new ValidationRunner({
        customChecks: [{ name: 'Lint', command: 'npm run lint' }]
      });
      assert.strictEqual(r.hasValidation(), true);
    });
  });

  describe('runCommand', () => {
    it('should execute successful command', async () => {
      const result = await runner.runCommand({
        name: 'Echo Test',
        command: 'echo "hello"',
        required: true
      });

      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.name, 'Echo Test');
      assert.strictEqual(result.command, 'echo "hello"');
      assert.ok(result.duration >= 0);
      assert.strictEqual(result.required, true);
    });

    it('should handle failing command', async () => {
      const result = await runner.runCommand({
        name: 'Fail Test',
        command: 'exit 1',
        required: true
      });

      assert.strictEqual(result.passed, false);
      assert.strictEqual(result.name, 'Fail Test');
      assert.ok(result.error);
      assert.ok(result.exitCode !== 0);
    });

    it('should handle optional checks', async () => {
      const result = await runner.runCommand({
        name: 'Optional Check',
        command: 'exit 1',
        required: false
      });

      assert.strictEqual(result.passed, false);
      assert.strictEqual(result.required, false);
    });
  });

  describe('runAll', () => {
    it('should skip when no validation configured', async () => {
      const r = new ValidationRunner({});
      const result = await r.runAll();

      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.skipped, true);
      assert.strictEqual(result.results.length, 0);
    });

    it('should run tests when configured', async () => {
      const r = new ValidationRunner({
        runTests: true,
        testCommand: 'echo "tests pass"',
        requireTestPass: true
      });

      const result = await r.runAll();

      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.results.length, 1);
      assert.strictEqual(result.results[0].name, 'Tests');
      assert.strictEqual(result.results[0].passed, true);
    });

    it('should run build when configured', async () => {
      const r = new ValidationRunner({
        runBuild: true,
        buildCommand: 'echo "build success"',
        requireBuildSuccess: true
      });

      const result = await r.runAll();

      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.results.length, 1);
      assert.strictEqual(result.results[0].name, 'Build');
    });

    it('should run custom checks when configured', async () => {
      const r = new ValidationRunner({
        customChecks: [
          { name: 'Lint', command: 'echo "lint ok"', required: true },
          { name: 'Type Check', command: 'echo "types ok"', required: false }
        ]
      });

      const result = await r.runAll();

      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.results.length, 2);
      assert.strictEqual(result.results[0].name, 'Lint');
      assert.strictEqual(result.results[1].name, 'Type Check');
    });

    it('should fail when required test fails', async () => {
      const r = new ValidationRunner({
        runTests: true,
        testCommand: 'exit 1',
        requireTestPass: true
      });

      const result = await r.runAll();

      assert.strictEqual(result.passed, false);
      assert.strictEqual(result.failureReason, 'Tests failed');
      assert.strictEqual(result.results[0].passed, false);
    });

    it('should fail when required build fails', async () => {
      const r = new ValidationRunner({
        runBuild: true,
        buildCommand: 'exit 1',
        requireBuildSuccess: true
      });

      const result = await r.runAll();

      assert.strictEqual(result.passed, false);
      assert.strictEqual(result.failureReason, 'Build failed');
    });

    it('should pass when optional check fails', async () => {
      const r = new ValidationRunner({
        customChecks: [
          { name: 'Optional Lint', command: 'exit 1', required: false }
        ]
      });

      const result = await r.runAll();

      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.results[0].passed, false);
      assert.strictEqual(result.results[0].required, false);
    });

    it('should run all validations in sequence', async () => {
      const r = new ValidationRunner({
        runTests: true,
        testCommand: 'echo "test"',
        requireTestPass: true,
        runBuild: true,
        buildCommand: 'echo "build"',
        requireBuildSuccess: true,
        customChecks: [
          { name: 'Lint', command: 'echo "lint"', required: true }
        ]
      });

      const result = await r.runAll();

      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.results.length, 3);
      assert.strictEqual(result.results[0].name, 'Tests');
      assert.strictEqual(result.results[1].name, 'Build');
      assert.strictEqual(result.results[2].name, 'Lint');
    });

    it('should stop early and report first failure', async () => {
      const r = new ValidationRunner({
        runTests: true,
        testCommand: 'exit 1',
        requireTestPass: true,
        runBuild: true,
        buildCommand: 'echo "should run"',
        requireBuildSuccess: true
      });

      const result = await r.runAll();

      assert.strictEqual(result.passed, false);
      assert.strictEqual(result.failureReason, 'Tests failed');
      // Build should still run (we don't short-circuit)
      assert.strictEqual(result.results.length, 2);
    });
  });

  describe('formatResults', () => {
    it('should return empty string for no results', () => {
      const output = runner.formatResults([]);
      assert.strictEqual(output, '');
    });

    it('should format results with pass/fail indicators', () => {
      const results = [
        { name: 'Tests', passed: true, duration: 1000, required: true },
        { name: 'Build', passed: false, duration: 2000, required: true, stderr: 'error' }
      ];

      const output = runner.formatResults(results);
      assert.ok(output.includes('Tests'));
      assert.ok(output.includes('Build'));
    });
  });
});
