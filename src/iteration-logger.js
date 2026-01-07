const fs = require('fs');
const path = require('path');

class IterationLogger {
  constructor(logDir = '.wiggumizer/iterations') {
    this.logDir = path.join(process.cwd(), logDir);
    this.sessionId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    this.sessionDir = path.join(this.logDir, this.sessionId);

    // Ensure log directory exists
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  /**
   * Log an iteration with all its details
   */
  logIteration(iteration, data) {
    const logFile = path.join(this.sessionDir, `iteration-${iteration}.json`);

    const logEntry = {
      iteration,
      timestamp: new Date().toISOString(),
      prompt: data.prompt,
      response: {
        summary: data.response?.summary,
        hasChanges: data.response?.hasChanges,
        raw: data.response?.raw
      },
      filesModified: data.filesModified || 0,
      files: data.files || [],
      convergence: data.convergence || false,
      error: data.error || null
    };

    try {
      fs.writeFileSync(logFile, JSON.stringify(logEntry, null, 2), 'utf-8');
    } catch (error) {
      // Don't fail the loop if logging fails
      console.warn(`Warning: Failed to write iteration log: ${error.message}`);
    }
  }

  /**
   * Log session summary
   */
  logSummary(data) {
    const summaryFile = path.join(this.sessionDir, 'summary.json');

    const summary = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      totalIterations: data.totalIterations,
      converged: data.converged,
      convergenceReason: data.convergenceReason,
      convergenceSummary: data.convergenceSummary,
      filesModified: data.filesModified || 0,
      duration: data.duration,
      config: data.config
    };

    try {
      fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf-8');
    } catch (error) {
      console.warn(`Warning: Failed to write summary log: ${error.message}`);
    }
  }

  /**
   * Get all sessions
   */
  static getSessions(logDir = '.wiggumizer/iterations') {
    const fullLogDir = path.join(process.cwd(), logDir);

    if (!fs.existsSync(fullLogDir)) {
      return [];
    }

    try {
      const sessions = fs.readdirSync(fullLogDir)
        .filter(name => fs.statSync(path.join(fullLogDir, name)).isDirectory())
        .map(sessionId => {
          const summaryPath = path.join(fullLogDir, sessionId, 'summary.json');
          let summary = null;

          if (fs.existsSync(summaryPath)) {
            try {
              summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
            } catch (e) {
              // Ignore parse errors
            }
          }

          return {
            sessionId,
            summary,
            path: path.join(fullLogDir, sessionId)
          };
        })
        .sort((a, b) => b.sessionId.localeCompare(a.sessionId)); // Most recent first

      return sessions;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get iterations for a session
   */
  static getIterations(sessionId, logDir = '.wiggumizer/iterations') {
    const sessionDir = path.join(process.cwd(), logDir, sessionId);

    if (!fs.existsSync(sessionDir)) {
      return [];
    }

    try {
      const iterations = fs.readdirSync(sessionDir)
        .filter(name => name.startsWith('iteration-') && name.endsWith('.json'))
        .map(filename => {
          const filePath = path.join(sessionDir, filename);
          try {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => a.iteration - b.iteration);

      return iterations;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get a specific iteration
   */
  static getIteration(sessionId, iterationNum, logDir = '.wiggumizer/iterations') {
    const iterationFile = path.join(
      process.cwd(),
      logDir,
      sessionId,
      `iteration-${iterationNum}.json`
    );

    if (!fs.existsSync(iterationFile)) {
      return null;
    }

    try {
      return JSON.parse(fs.readFileSync(iterationFile, 'utf-8'));
    } catch (error) {
      return null;
    }
  }

  /**
   * Clean up old sessions (keep last N)
   */
  static cleanup(keepLast = 10, logDir = '.wiggumizer/iterations') {
    const sessions = IterationLogger.getSessions(logDir);

    if (sessions.length <= keepLast) {
      return 0;
    }

    const toDelete = sessions.slice(keepLast);
    let deleted = 0;

    for (const session of toDelete) {
      try {
        fs.rmSync(session.path, { recursive: true, force: true });
        deleted++;
      } catch (error) {
        // Ignore deletion errors
      }
    }

    return deleted;
  }
}

module.exports = IterationLogger;
