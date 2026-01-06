const chalk = require('chalk');

/**
 * Enhanced error handling with retry logic and exponential backoff
 */
class ErrorHandler {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000; // 1 second
    this.maxDelay = options.maxDelay || 30000; // 30 seconds
    this.verbose = options.verbose || false;

    // Track failures for circuit breaker
    this.consecutiveFailures = 0;
    this.circuitBreakerThreshold = options.circuitBreakerThreshold || 5;
    this.circuitOpen = false;
    this.circuitResetTime = null;
    this.circuitResetDelay = options.circuitResetDelay || 60000; // 1 minute
  }

  /**
   * Execute a function with retry logic
   */
  async executeWithRetry(fn, context = 'operation') {
    let lastError;
    let attempt = 0;

    // Check circuit breaker
    if (this.circuitOpen) {
      if (Date.now() < this.circuitResetTime) {
        throw new Error(`Circuit breaker open. Too many failures. Try again in ${Math.ceil((this.circuitResetTime - Date.now()) / 1000)}s`);
      } else {
        // Reset circuit breaker
        this.circuitOpen = false;
        this.consecutiveFailures = 0;
        if (this.verbose) {
          console.log(chalk.blue('Circuit breaker reset'));
        }
      }
    }

    while (attempt <= this.maxRetries) {
      try {
        const result = await fn();

        // Success! Reset failure counter
        this.consecutiveFailures = 0;

        return result;
      } catch (error) {
        lastError = error;
        attempt++;

        const errorType = this.classifyError(error);

        // Don't retry non-retryable errors
        if (!errorType.retryable) {
          if (this.verbose) {
            console.log(chalk.red(`Non-retryable error: ${errorType.type}`));
          }
          throw error;
        }

        // Check if we should retry
        if (attempt <= this.maxRetries) {
          const delay = this.calculateBackoff(attempt, errorType);

          if (this.verbose) {
            console.log(chalk.yellow(`${context} failed (attempt ${attempt}/${this.maxRetries + 1})`));
            console.log(chalk.dim(`  Error: ${error.message}`));
            console.log(chalk.dim(`  Retrying in ${(delay / 1000).toFixed(1)}s...`));
          }

          await this.sleep(delay);
        } else {
          // Max retries exceeded
          this.consecutiveFailures++;

          // Open circuit breaker if too many consecutive failures
          if (this.consecutiveFailures >= this.circuitBreakerThreshold) {
            this.circuitOpen = true;
            this.circuitResetTime = Date.now() + this.circuitResetDelay;

            console.log(chalk.red('\n⚠ Circuit breaker opened due to repeated failures'));
            console.log(chalk.dim(`Will retry in ${this.circuitResetDelay / 1000}s\n`));
          }

          throw lastError;
        }
      }
    }

    throw lastError;
  }

  /**
   * Classify error to determine if it's retryable
   */
  classifyError(error) {
    const message = error.message?.toLowerCase() || '';
    const statusCode = error.status || error.statusCode;

    // Network errors - retryable
    if (message.includes('econnreset') ||
        message.includes('enotfound') ||
        message.includes('etimedout') ||
        message.includes('network') ||
        message.includes('timeout')) {
      return {
        type: 'network',
        retryable: true,
        backoffMultiplier: 1.5
      };
    }

    // Rate limit errors - retryable with longer backoff
    if (statusCode === 429 ||
        message.includes('rate limit') ||
        message.includes('too many requests')) {
      return {
        type: 'rate_limit',
        retryable: true,
        backoffMultiplier: 3.0, // Longer backoff for rate limits
        useRetryAfter: true
      };
    }

    // Server errors (5xx) - retryable
    if (statusCode >= 500 && statusCode < 600) {
      return {
        type: 'server_error',
        retryable: true,
        backoffMultiplier: 2.0
      };
    }

    // Authentication errors - not retryable
    if (statusCode === 401 || statusCode === 403 ||
        message.includes('unauthorized') ||
        message.includes('forbidden') ||
        message.includes('api key')) {
      return {
        type: 'auth',
        retryable: false
      };
    }

    // Validation errors - not retryable
    if (statusCode === 400 ||
        message.includes('invalid') ||
        message.includes('validation')) {
      return {
        type: 'validation',
        retryable: false
      };
    }

    // Client errors (4xx except 429) - not retryable
    if (statusCode >= 400 && statusCode < 500) {
      return {
        type: 'client_error',
        retryable: false
      };
    }

    // Unknown errors - retryable with caution
    return {
      type: 'unknown',
      retryable: true,
      backoffMultiplier: 2.0
    };
  }

  /**
   * Calculate exponential backoff delay
   */
  calculateBackoff(attempt, errorType) {
    const multiplier = errorType.backoffMultiplier || 2.0;

    // Exponential backoff: delay = baseDelay * multiplier^(attempt - 1)
    let delay = this.baseDelay * Math.pow(multiplier, attempt - 1);

    // Add jitter (±25%) to prevent thundering herd
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    delay += jitter;

    // Cap at maxDelay
    delay = Math.min(delay, this.maxDelay);

    return Math.floor(delay);
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get handler status
   */
  getStatus() {
    return {
      circuitOpen: this.circuitOpen,
      consecutiveFailures: this.consecutiveFailures,
      circuitResetTime: this.circuitResetTime
    };
  }

  /**
   * Reset handler state
   */
  reset() {
    this.consecutiveFailures = 0;
    this.circuitOpen = false;
    this.circuitResetTime = null;
  }
}

/**
 * Rate limiter for API calls
 */
class RateLimiter {
  constructor(options = {}) {
    this.requestsPerMinute = options.requestsPerMinute || 50;
    this.requestsPerHour = options.requestsPerHour || 1000;

    this.minuteWindow = [];
    this.hourWindow = [];

    this.verbose = options.verbose || false;
  }

  /**
   * Wait if rate limit would be exceeded
   */
  async waitIfNeeded() {
    const now = Date.now();

    // Clean up old entries
    this.minuteWindow = this.minuteWindow.filter(time => now - time < 60000);
    this.hourWindow = this.hourWindow.filter(time => now - time < 3600000);

    // Check minute limit
    if (this.minuteWindow.length >= this.requestsPerMinute) {
      const oldestInMinute = this.minuteWindow[0];
      const waitTime = 60000 - (now - oldestInMinute) + 100; // +100ms buffer

      if (this.verbose) {
        console.log(chalk.yellow(`Rate limit: waiting ${(waitTime / 1000).toFixed(1)}s (minute limit)`));
      }

      await this.sleep(waitTime);
      return this.waitIfNeeded(); // Recursive check
    }

    // Check hour limit
    if (this.hourWindow.length >= this.requestsPerHour) {
      const oldestInHour = this.hourWindow[0];
      const waitTime = 3600000 - (now - oldestInHour) + 100; // +100ms buffer

      if (this.verbose) {
        console.log(chalk.yellow(`Rate limit: waiting ${(waitTime / 60000).toFixed(1)}m (hour limit)`));
      }

      await this.sleep(waitTime);
      return this.waitIfNeeded(); // Recursive check
    }

    // Record this request
    this.minuteWindow.push(now);
    this.hourWindow.push(now);
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current usage
   */
  getUsage() {
    const now = Date.now();
    this.minuteWindow = this.minuteWindow.filter(time => now - time < 60000);
    this.hourWindow = this.hourWindow.filter(time => now - time < 3600000);

    return {
      requestsLastMinute: this.minuteWindow.length,
      requestsLastHour: this.hourWindow.length,
      minuteLimit: this.requestsPerMinute,
      hourLimit: this.requestsPerHour
    };
  }

  /**
   * Reset limiter state
   */
  reset() {
    this.minuteWindow = [];
    this.hourWindow = [];
  }
}

module.exports = { ErrorHandler, RateLimiter };
