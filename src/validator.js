const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class FileValidator {
  /**
   * Validate JavaScript syntax without executing
   */
  static validateJavaScript(filePath, content) {
    try {
      // Use Node.js to check syntax
      execSync('node --check', {
        input: content,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        details: error.stderr?.toString() || 'Syntax error detected'
      };
    }
  }

  /**
   * Validate file before writing
   */
  static validate(filePath, content) {
    const ext = path.extname(filePath);

    switch (ext) {
      case '.js':
        return FileValidator.validateJavaScript(filePath, content);

      case '.json':
        try {
          JSON.parse(content);
          return { valid: true };
        } catch (error) {
          return {
            valid: false,
            error: 'Invalid JSON',
            details: error.message
          };
        }

      // Add more validators as needed
      default:
        // For unknown file types, just check it's not empty
        return {
          valid: content.trim().length > 0,
          error: content.trim().length === 0 ? 'Empty file' : null
        };
    }
  }
}

module.exports = FileValidator;
