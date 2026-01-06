const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert');
const { ErrorHandler, RateLimiter } = require('../src/error-handler');

describe('ErrorHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new ErrorHandler({
      maxRetries: 3,
      baseDelay: 10, // Use small delays for testing
      maxDelay: 100,
      circuitBreakerThreshold: 3,
      circuitResetDelay: 100
    });
  });

  describe('classifyError', () => {
    it('should classify network errors as retryable', () => {
      const errors = [
        new Error('ECONNRESET'),
        new Error('ENOTFOUND'),
        new Error('ETIMEDOUT'),
        new Error('Network error occurred'),
        new Error('Request timeout')
      ];

      for (const error of errors) {
        const result = handler.classifyError(error);
        assert.strictEqual(result.type, 'network');
        assert.strictEqual(result.retryable, true);
      }
    });

    it('should classify rate limit errors as retryable with longer backoff', () => {
      const error = new Error('Rate limit exceeded');
      error.status = 429;

      const result = handler.classifyError(error);

      assert.strictEqual(result.type, 'rate_limit');
      assert.strictEqual(result.retryable, true);
      assert.strictEqual(result.backoffMultiplier, 3.0);
    });

    it('should classify server errors (5xx) as retryable', () => {
      const error = new Error('Internal server error');
      error.status = 500;

      const result = handler.classifyError(error);

      assert.strictEqual(result.type, 'server_error');
      assert.strictEqual(result.retryable, true);
    });

    it('should classify auth errors as non-retryable', () => {
      const errors = [
        { message: 'Unauthorized', status: 401 },
        { message: 'Forbidden', status: 403 },
        { message: 'Invalid API key', status: 401 }
      ];

      for (const errorData of errors) {
        const error = new Error(errorData.message);
        error.status = errorData.status;

        const result = handler.classifyError(error);

        assert.strictEqual(result.type, 'auth');
        assert.strictEqual(result.retryable, false);
      }
    });

    it('should classify validation errors as non-retryable', () => {
      const error = new Error('Invalid request');
      error.status = 400;

      const result = handler.classifyError(error);

      assert.strictEqual(result.type, 'validation');
      assert.strictEqual(result.retryable, false);
    });

    it('should classify client errors (4xx except 429) as non-retryable', () => {
      const error = new Error('Not found');
      error.status = 404;

      const result = handler.classifyError(error);

      assert.strictEqual(result.type, 'client_error');
      assert.strictEqual(result.retryable, false);
    });

    it('should classify unknown errors as retryable', () => {
      const error = new Error('Something weird happened');

      const result = handler.classifyError(error);

      assert.strictEqual(result.type, 'unknown');
      assert.strictEqual(result.retryable, true);
    });
  });

  describe('calculateBackoff', () => {
    it('should increase delay exponentially', () => {
      const errorType = { backoffMultiplier: 2.0 };

      // Get multiple backoff values (without jitter consideration)
      const delay1 = handler.calculateBackoff(1, errorType);
      const delay2 = handler.calculateBackoff(2, errorType);
      const delay3 = handler.calculateBackoff(3, errorType);

      // Each delay should be roughly double the previous (with jitter)
      // We check that they're increasing
      assert.ok(delay1 <= delay2);
      assert.ok(delay2 <= delay3);
    });

    it('should cap delay at maxDelay', () => {
      const errorType = { backoffMultiplier: 10.0 };

      const delay = handler.calculateBackoff(10, errorType);

      assert.ok(delay <= handler.maxDelay);
    });

    it('should use custom backoff multiplier from error type', () => {
      const errorType = { backoffMultiplier: 3.0 };
      
      // With multiplier 3.0 and baseDelay 10:
      // attempt 1: 10 * 3^0 = 10
      // attempt 2: 10 * 3^1 = 30
      const delay1 = handler.calculateBackoff(1, errorType);
      const delay2 = handler.calculateBackoff(2, errorType);

      // Allow for jitter (±25%)
      assert.ok(delay1 >= 7 && delay1 <= 13); // 10 ± 25%
      assert.ok(delay2 >= 22 && delay2 <= 38); // 30 ± 25%
    });
  });

  describe('executeWithRetry', () => {
    it('should succeed on first try', async () => {
      let attempts = 0;

      const result = await handler.executeWithRetry(async () => {
        attempts++;
        return 'success';
      });

      assert.strictEqual(result, 'success');
      assert.strictEqual(attempts, 1);
    });

    it('should retry on retryable errors', async () => {
      let attempts = 0;

      const result = await handler.executeWithRetry(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('ECONNRESET');
        }
        return 'success after retries';
      });

      assert.strictEqual(result, 'success after retries');
      assert.strictEqual(attempts, 3);
    });

    it('should not retry non-retryable errors', async () => {
      let attempts = 0;
      const authError = new Error('Unauthorized');
      authError.status = 401;

      await assert.rejects(
        handler.executeWithRetry(async () => {
          attempts++;
          throw authError;
        }),
        { message: 'Unauthorized' }
      );

      assert.strictEqual(attempts, 1);
    });

    it('should throw after max retries exceeded', async () => {
      let attempts = 0;

      await assert.rejects(
        handler.executeWithRetry(async () => {
          attempts++;
          throw new Error('ECONNRESET');
        }),
        { message: 'ECONNRESET' }
      );

      assert.strictEqual(attempts, 4); // 1 initial + 3 retries
    });

    it('should reset failure counter on success', async () => {
      // First, cause some failures
      handler.consecutiveFailures = 2;

      await handler.executeWithRetry(async () => 'success');

      assert.strictEqual(handler.consecutiveFailures, 0);
    });
  });

  describe('circuit breaker', () => {
    it('should open circuit after threshold failures', async () => {
      // Exhaust retries multiple times to trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await handler.executeWithRetry(async () => {
            throw new Error('ECONNRESET');
          });
        } catch (e) {
          // Expected
        }
      }

      assert.strictEqual(handler.circuitOpen, true);
      assert.ok(handler.circuitResetTime);
    });

    it('should reject immediately when circuit is open', async () => {
      handler.circuitOpen = true;
      handler.circuitResetTime = Date.now() + 10000; // 10 seconds from now

      await assert.rejects(
        handler.executeWithRetry(async () => 'success'),
        /Circuit breaker open/
      );
    });

    it('should reset circuit after reset delay', async () => {
      handler.circuitOpen = true;
      handler.circuitResetTime = Date.now() - 1000; // 1 second ago

      const result = await handler.executeWithRetry(async () => 'success');

      assert.strictEqual(result, 'success');
      assert.strictEqual(handler.circuitOpen, false);
    });
  });

  describe('getStatus', () => {
    it('should return current status', () => {
      handler.consecutiveFailures = 2;
      handler.circuitOpen = true;
      handler.circuitResetTime = Date.now() + 1000;

      const status = handler.getStatus();

      assert.strictEqual(status.consecutiveFailures, 2);
      assert.strictEqual(status.circuitOpen, true);
      assert.ok(status.circuitResetTime);
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      handler.consecutiveFailures = 5;
      handler.circuitOpen = true;
      handler.circuitResetTime = Date.now();

      handler.reset();

      assert.strictEqual(handler.consecutiveFailures, 0);
      assert.strictEqual(handler.circuitOpen, false);
      assert.strictEqual(handler.circuitResetTime, null);
    });
  });
});

describe('RateLimiter', () => {
  let limiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      requestsPerMinute: 5,
      requestsPerHour: 100
    });
  });

  describe('getUsage', () => {
    it('should return current usage stats', () => {
      const usage = limiter.getUsage();

      assert.strictEqual(usage.requestsLastMinute, 0);
      assert.strictEqual(usage.requestsLastHour, 0);
      assert.strictEqual(usage.minuteLimit, 5);
      assert.strictEqual(usage.hourLimit, 100);
    });

    it('should track requests after waitIfNeeded', async () => {
      await limiter.waitIfNeeded();
      await limiter.waitIfNeeded();
      await limiter.waitIfNeeded();

      const usage = limiter.getUsage();

      assert.strictEqual(usage.requestsLastMinute, 3);
      assert.strictEqual(usage.requestsLastHour, 3);
    });
  });

  describe('waitIfNeeded', () => {
    it('should not wait when under limits', async () => {
      const start = Date.now();

      await limiter.waitIfNeeded();

      const elapsed = Date.now() - start;
      assert.ok(elapsed < 50); // Should be nearly instant
    });

    it('should record requests in both windows', async () => {
      await limiter.waitIfNeeded();

      assert.strictEqual(limiter.minuteWindow.length, 1);
      assert.strictEqual(limiter.hourWindow.length, 1);
    });
  });

  describe('reset', () => {
    it('should clear all windows', async () => {
      await limiter.waitIfNeeded();
      await limiter.waitIfNeeded();

      limiter.reset();

      assert.strictEqual(limiter.minuteWindow.length, 0);
      assert.strictEqual(limiter.hourWindow.length, 0);
    });
  });

  describe('window cleanup', () => {
    it('should clean up old entries from minute window', async () => {
      // Add an old entry
      limiter.minuteWindow.push(Date.now() - 120000); // 2 minutes ago
      limiter.hourWindow.push(Date.now() - 120000);

      const usage = limiter.getUsage();

      assert.strictEqual(usage.requestsLastMinute, 0); // Old entry cleaned up
      assert.strictEqual(usage.requestsLastHour, 1); // Still within hour
    });

    it('should clean up old entries from hour window', async () => {
      // Add a very old entry
      limiter.minuteWindow.push(Date.now() - 7200000); // 2 hours ago
      limiter.hourWindow.push(Date.now() - 7200000);

      const usage = limiter.getUsage();

      assert.strictEqual(usage.requestsLastMinute, 0);
      assert.strictEqual(usage.requestsLastHour, 0); // Old entry cleaned up
    });
  });
});
