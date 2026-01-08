const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert');
const { ErrorHandler, RateLimiter } = require('../src/error-handler');

describe('ErrorHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new ErrorHandler({
      maxRetries: 3,
      baseDelay: 10,  // Fast for tests
      maxDelay: 100,
      circuitBreakerThreshold: 3,
      circuitResetDelay: 100
    });
  });

  describe('executeWithRetry', () => {
    it('should return result on successful execution', async () => {
      const fn = async () => 'success';
      const result = await handler.executeWithRetry(fn, 'test');
      assert.strictEqual(result, 'success');
    });

    it('should retry on retryable errors', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) {
          const error = new Error('Network error');
          error.message = 'network timeout';
          throw error;
        }
        return 'success';
      };

      const result = await handler.executeWithRetry(fn, 'test');

      assert.strictEqual(result, 'success');
      assert.strictEqual(attempts, 3);
    });

    it('should not retry non-retryable errors', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        const error = new Error('Invalid API key');
        error.status = 401;
        throw error;
      };

      await assert.rejects(
        () => handler.executeWithRetry(fn, 'test'),
        /Invalid API key/
      );

      assert.strictEqual(attempts, 1);
    });

    it('should throw after max retries exceeded', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        throw new Error('network error');
      };

      await assert.rejects(
        () => handler.executeWithRetry(fn, 'test'),
        /network error/
      );

      assert.strictEqual(attempts, 4); // 1 initial + 3 retries
    });

    it('should reset consecutive failures on success', async () => {
      handler.consecutiveFailures = 2;

      await handler.executeWithRetry(async () => 'success', 'test');

      assert.strictEqual(handler.consecutiveFailures, 0);
    });

    it('should open circuit breaker after threshold', async () => {
      // Fail enough times to trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await handler.executeWithRetry(async () => {
            throw new Error('network error');
          }, 'test');
        } catch (e) {
          // Expected
        }
      }

      assert.strictEqual(handler.circuitOpen, true);
    });

    it('should reject immediately when circuit is open', async () => {
      handler.circuitOpen = true;
      handler.circuitResetTime = Date.now() + 10000;

      await assert.rejects(
        () => handler.executeWithRetry(async () => 'success', 'test'),
        /Circuit breaker open/
      );
    });

    it('should reset circuit breaker after reset time', async () => {
      handler.circuitOpen = true;
      handler.circuitResetTime = Date.now() - 1000; // Already past
      handler.consecutiveFailures = 5;

      const result = await handler.executeWithRetry(async () => 'success', 'test');

      assert.strictEqual(result, 'success');
      assert.strictEqual(handler.circuitOpen, false);
      assert.strictEqual(handler.consecutiveFailures, 0);
    });
  });

  describe('classifyError', () => {
    it('should classify network errors as retryable', () => {
      const error = new Error('ECONNRESET');
      const classification = handler.classifyError(error);

      assert.strictEqual(classification.type, 'network');
      assert.strictEqual(classification.retryable, true);
    });

    it('should classify timeout errors as retryable', () => {
      const error = new Error('Request timeout');
      const classification = handler.classifyError(error);

      assert.strictEqual(classification.type, 'network');
      assert.strictEqual(classification.retryable, true);
    });

    it('should classify rate limit (429) as retryable with longer backoff', () => {
      const error = new Error('Too many requests');
      error.status = 429;
      const classification = handler.classifyError(error);

      assert.strictEqual(classification.type, 'rate_limit');
      assert.strictEqual(classification.retryable, true);
      assert.ok(classification.backoffMultiplier >= 3);
    });

    it('should classify server errors (5xx) as retryable', () => {
      const error = new Error('Internal server error');
      error.status = 500;
      const classification = handler.classifyError(error);

      assert.strictEqual(classification.type, 'server_error');
      assert.strictEqual(classification.retryable, true);
    });

    it('should classify auth errors (401) as not retryable', () => {
      const error = new Error('Unauthorized');
      error.status = 401;
      const classification = handler.classifyError(error);

      assert.strictEqual(classification.type, 'auth');
      assert.strictEqual(classification.retryable, false);
    });

    it('should classify forbidden errors (403) as not retryable', () => {
      const error = new Error('Forbidden');
      error.status = 403;
      const classification = handler.classifyError(error);

      assert.strictEqual(classification.type, 'auth');
      assert.strictEqual(classification.retryable, false);
    });

    it('should classify validation errors (400) as not retryable', () => {
      const error = new Error('Invalid request');
      error.status = 400;
      const classification = handler.classifyError(error);

      assert.strictEqual(classification.type, 'validation');
      assert.strictEqual(classification.retryable, false);
    });

    it('should classify unknown errors as retryable with caution', () => {
      const error = new Error('Something weird happened');
      const classification = handler.classifyError(error);

      assert.strictEqual(classification.type, 'unknown');
      assert.strictEqual(classification.retryable, true);
    });
  });

  describe('calculateBackoff', () => {
    it('should increase delay exponentially', () => {
      const errorType = { backoffMultiplier: 2.0 };

      const delay1 = handler.calculateBackoff(1, errorType);
      const delay2 = handler.calculateBackoff(2, errorType);
      const delay3 = handler.calculateBackoff(3, errorType);

      // Delays should increase (accounting for jitter)
      assert.ok(delay2 > delay1 * 0.5, 'Delay should increase');
      assert.ok(delay3 > delay2 * 0.5, 'Delay should continue increasing');
    });

    it('should cap at maxDelay', () => {
      const errorType = { backoffMultiplier: 10.0 };

      const delay = handler.calculateBackoff(10, errorType);

      assert.ok(delay <= handler.maxDelay);
    });

    it('should apply higher multiplier for rate limits', () => {
      const networkError = { backoffMultiplier: 1.5 };
      const rateLimitError = { backoffMultiplier: 3.0 };

      const networkDelay = handler.calculateBackoff(2, networkError);
      const rateLimitDelay = handler.calculateBackoff(2, rateLimitError);

      // Rate limit delay should be higher on average
      // (accounting for jitter, we just check it's not dramatically lower)
      assert.ok(rateLimitDelay > networkDelay * 0.5);
    });
  });

  describe('getStatus', () => {
    it('should return current handler status', () => {
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
    it('should reset all state', () => {
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

  describe('waitIfNeeded', () => {
    it('should allow requests under the limit', async () => {
      const start = Date.now();

      await limiter.waitIfNeeded();
      await limiter.waitIfNeeded();

      const elapsed = Date.now() - start;
      assert.ok(elapsed < 100, 'Should not wait when under limit');
    });

    it('should track requests in minute window', async () => {
      await limiter.waitIfNeeded();
      await limiter.waitIfNeeded();

      const usage = limiter.getUsage();
      assert.strictEqual(usage.requestsLastMinute, 2);
    });

    it('should track requests in hour window', async () => {
      await limiter.waitIfNeeded();

      const usage = limiter.getUsage();
      assert.strictEqual(usage.requestsLastHour, 1);
    });
  });

  describe('getUsage', () => {
    it('should return current usage stats', async () => {
      await limiter.waitIfNeeded();
      await limiter.waitIfNeeded();
      await limiter.waitIfNeeded();

      const usage = limiter.getUsage();

      assert.strictEqual(usage.requestsLastMinute, 3);
      assert.strictEqual(usage.requestsLastHour, 3);
      assert.strictEqual(usage.minuteLimit, 5);
      assert.strictEqual(usage.hourLimit, 100);
    });

    it('should clean up old entries', async () => {
      // Manually add old entries
      limiter.minuteWindow.push(Date.now() - 70000); // 70 seconds ago
      limiter.hourWindow.push(Date.now() - 3700000); // Over an hour ago

      const usage = limiter.getUsage();

      assert.strictEqual(usage.requestsLastMinute, 0);
      assert.strictEqual(usage.requestsLastHour, 0);
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
