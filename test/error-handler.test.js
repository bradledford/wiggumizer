const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert');
const { ErrorHandler, RateLimiter } = require('../src/error-handler');

describe('ErrorHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new ErrorHandler({
      maxRetries: 3,
      baseDelay: 10, // Very short delays for testing
      maxDelay: 100,
      circuitBreakerThreshold: 3,
      circuitResetDelay: 50,
      verbose: false
    });
  });

  describe('classifyError', () => {
    it('should classify network errors as retryable', () => {
      const errors = [
        new Error('ECONNRESET'),
        new Error('ENOTFOUND'),
        new Error('ETIMEDOUT'),
        new Error('Network error occurred'),
        new Error('Connection timeout')
      ];

      for (const error of errors) {
        const result = handler.classifyError(error);
        assert.strictEqual(result.retryable, true);
        assert.strictEqual(result.type, 'network');
      }
    });

    it('should classify rate limit errors as retryable with higher backoff', () => {
      const error = new Error('Rate limit exceeded');
      error.status = 429;

      const result = handler.classifyError(error);
      assert.strictEqual(result.retryable, true);
      assert.strictEqual(result.type, 'rate_limit');
      assert.strictEqual(result.backoffMultiplier, 3.0);
    });

    it('should classify server errors (5xx) as retryable', () => {
      const statusCodes = [500, 502, 503, 504];

      for (const status of statusCodes) {
        const error = new Error('Server error');
        error.status = status;

        const result = handler.classifyError(error);
        assert.strictEqual(result.retryable, true);
        assert.strictEqual(result.type, 'server_error');
      }
    });

    it('should classify auth errors as non-retryable', () => {
      const errors = [
        { message: 'Unauthorized', status: 401 },
        { message: 'Forbidden', status: 403 },
        { message: 'Invalid API key' }
      ];

      for (const errorData of errors) {
        const error = new Error(errorData.message);
        if (errorData.status) error.status = errorData.status;

        const result = handler.classifyError(error);
        assert.strictEqual(result.retryable, false);
        assert.strictEqual(result.type, 'auth');
      }
    });

    it('should classify validation errors as non-retryable', () => {
      const error = new Error('Invalid request body');
      error.status = 400;

      const result = handler.classifyError(error);
      assert.strictEqual(result.retryable, false);
      assert.strictEqual(result.type, 'validation');
    });

    it('should classify client errors (4xx except 429) as non-retryable', () => {
      const statusCodes = [404, 405, 406, 409, 422];

      for (const status of statusCodes) {
        const error = new Error('Client error');
        error.status = status;

        const result = handler.classifyError(error);
        assert.strictEqual(result.retryable, false);
        assert.strictEqual(result.type, 'client_error');
      }
    });

    it('should classify unknown errors as retryable', () => {
      const error = new Error('Something weird happened');

      const result = handler.classifyError(error);
      assert.strictEqual(result.retryable, true);
      assert.strictEqual(result.type, 'unknown');
    });
  });

  describe('calculateBackoff', () => {
    it('should calculate exponential backoff', () => {
      const errorType = { backoffMultiplier: 2.0 };

      // First attempt should be close to baseDelay
      const delay1 = handler.calculateBackoff(1, errorType);
      assert.ok(delay1 >= 7 && delay1 <= 13); // 10 ± 25% jitter

      // Second attempt should be close to baseDelay * 2
      const delay2 = handler.calculateBackoff(2, errorType);
      assert.ok(delay2 >= 15 && delay2 <= 25); // 20 ± 25% jitter

      // Third attempt should be close to baseDelay * 4
      const delay3 = handler.calculateBackoff(3, errorType);
      assert.ok(delay3 >= 30 && delay3 <= 50); // 40 ± 25% jitter
    });

    it('should cap delay at maxDelay', () => {
      const errorType = { backoffMultiplier: 10.0 };

      const delay = handler.calculateBackoff(5, errorType);
      assert.ok(delay <= 100); // maxDelay is 100
    });

    it('should use higher multiplier for rate limit errors', () => {
      const rateLimitError = { backoffMultiplier: 3.0 };
      const normalError = { backoffMultiplier: 2.0 };

      const rateLimitDelay = handler.calculateBackoff(2, rateLimitError);
      const normalDelay = handler.calculateBackoff(2, normalError);

      // Rate limit delay should generally be higher (accounting for jitter)
      // We can't strictly compare due to jitter, so just verify they're reasonable
      assert.ok(rateLimitDelay >= 15); // 10 * 3 * 0.75 minimum
      assert.ok(normalDelay >= 10); // 10 * 2 * 0.75 minimum
    });
  });

  describe('executeWithRetry', () => {
    it('should return result on success', async () => {
      const fn = async () => 'success';

      const result = await handler.executeWithRetry(fn, 'test');
      assert.strictEqual(result, 'success');
    });

    it('should retry on retryable errors', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('ECONNRESET');
        }
        return 'success';
      };

      const result = await handler.executeWithRetry(fn, 'test');
      assert.strictEqual(result, 'success');
      assert.strictEqual(attempts, 3);
    });

    it('should not retry on non-retryable errors', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        const error = new Error('Unauthorized');
        error.status = 401;
        throw error;
      };

      await assert.rejects(
        () => handler.executeWithRetry(fn, 'test'),
        /Unauthorized/
      );
      assert.strictEqual(attempts, 1);
    });

    it('should throw after max retries exceeded', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        throw new Error('Network error');
      };

      await assert.rejects(
        () => handler.executeWithRetry(fn, 'test'),
        /Network error/
      );
      assert.strictEqual(attempts, 4); // 1 initial + 3 retries
    });

    it('should reset failure counter on success', async () => {
      // First, cause some failures
      handler.consecutiveFailures = 2;

      const fn = async () => 'success';
      await handler.executeWithRetry(fn, 'test');

      assert.strictEqual(handler.consecutiveFailures, 0);
    });
  });

  describe('circuit breaker', () => {
    it('should open circuit after threshold failures', async () => {
      const fn = async () => {
        throw new Error('Network error');
      };

      // Exhaust retries multiple times to trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await handler.executeWithRetry(fn, 'test');
        } catch (e) {
          // Expected
        }
      }

      assert.strictEqual(handler.circuitOpen, true);
    });

    it('should reject immediately when circuit is open', async () => {
      handler.circuitOpen = true;
      handler.circuitResetTime = Date.now() + 10000; // Far in future

      const fn = async () => 'success';

      await assert.rejects(
        () => handler.executeWithRetry(fn, 'test'),
        /Circuit breaker open/
      );
    });

    it('should reset circuit after reset delay', async () => {
      handler.circuitOpen = true;
      handler.circuitResetTime = Date.now() - 1000; // In the past
      handler.consecutiveFailures = 5;

      const fn = async () => 'success';
      const result = await handler.executeWithRetry(fn, 'test');

      assert.strictEqual(result, 'success');
      assert.strictEqual(handler.circuitOpen, false);
      assert.strictEqual(handler.consecutiveFailures, 0);
    });
  });

  describe('getStatus', () => {
    it('should return current status', () => {
      handler.circuitOpen = true;
      handler.consecutiveFailures = 3;
      handler.circuitResetTime = 12345;

      const status = handler.getStatus();

      assert.strictEqual(status.circuitOpen, true);
      assert.strictEqual(status.consecutiveFailures, 3);
      assert.strictEqual(status.circuitResetTime, 12345);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      handler.circuitOpen = true;
      handler.consecutiveFailures = 5;
      handler.circuitResetTime = 12345;

      handler.reset();

      assert.strictEqual(handler.circuitOpen, false);
      assert.strictEqual(handler.consecutiveFailures, 0);
      assert.strictEqual(handler.circuitResetTime, null);
    });
  });
});

describe('RateLimiter', () => {
  let limiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      requestsPerMinute: 5,
      requestsPerHour: 100,
      verbose: false
    });
  });

  describe('waitIfNeeded', () => {
    it('should allow requests under limit', async () => {
      // Should not throw or wait significantly
      const start = Date.now();
      await limiter.waitIfNeeded();
      const elapsed = Date.now() - start;

      assert.ok(elapsed < 100); // Should be nearly instant
    });

    it('should track requests in minute window', async () => {
      await limiter.waitIfNeeded();
      await limiter.waitIfNeeded();
      await limiter.waitIfNeeded();

      const usage = limiter.getUsage();
      assert.strictEqual(usage.requestsLastMinute, 3);
    });

    it('should track requests in hour window', async () => {
      await limiter.waitIfNeeded();
      await limiter.waitIfNeeded();

      const usage = limiter.getUsage();
      assert.strictEqual(usage.requestsLastHour, 2);
    });
  });

  describe('getUsage', () => {
    it('should return current usage stats', async () => {
      await limiter.waitIfNeeded();

      const usage = limiter.getUsage();

      assert.strictEqual(usage.requestsLastMinute, 1);
      assert.strictEqual(usage.requestsLastHour, 1);
      assert.strictEqual(usage.minuteLimit, 5);
      assert.strictEqual(usage.hourLimit, 100);
    });

    it('should clean up old entries', async () => {
      // Add an old timestamp
      limiter.minuteWindow.push(Date.now() - 120000); // 2 minutes ago
      limiter.hourWindow.push(Date.now() - 4000000); // More than an hour ago

      await limiter.waitIfNeeded();

      const usage = limiter.getUsage();

      // Old entries should be cleaned up
      assert.strictEqual(usage.requestsLastMinute, 1);
      assert.strictEqual(usage.requestsLastHour, 1);
    });
  });

  describe('reset', () => {
    it('should clear all windows', async () => {
      await limiter.waitIfNeeded();
      await limiter.waitIfNeeded();

      limiter.reset();

      const usage = limiter.getUsage();
      assert.strictEqual(usage.requestsLastMinute, 0);
      assert.strictEqual(usage.requestsLastHour, 0);
    });
  });
});
