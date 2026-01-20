const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ProjectDetector = require('../src/project-detector');

describe('ProjectDetector', () => {
  let tempDir;
  let detector;

  beforeEach(() => {
    // Create a temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiggumizer-test-'));
    detector = new ProjectDetector(tempDir);
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('detectNodeJS', () => {
    it('should detect Node.js project with package.json', () => {
      const pkg = {
        name: 'test-project',
        scripts: {
          test: 'jest',
          build: 'webpack'
        }
      };
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(pkg));

      const result = detector.detectNodeJS();

      assert.strictEqual(result.detected, true);
      assert.strictEqual(result.type, 'nodejs');
      assert.strictEqual(result.testCommand, 'npm test');
      assert.strictEqual(result.buildCommand, 'npm run build');
    });

    it('should detect package manager from lock files', () => {
      const pkg = { name: 'test', scripts: { test: 'jest' } };
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(pkg));
      fs.writeFileSync(path.join(tempDir, 'yarn.lock'), '');

      const result = detector.detectNodeJS();

      assert.strictEqual(result.packageManager, 'yarn');
    });

    it('should return null commands if no scripts defined', () => {
      const pkg = { name: 'test' };
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(pkg));

      const result = detector.detectNodeJS();

      assert.strictEqual(result.detected, true);
      assert.strictEqual(result.testCommand, null);
      assert.strictEqual(result.buildCommand, null);
    });
  });

  describe('detectPython', () => {
    it('should detect Python project with pytest', () => {
      fs.writeFileSync(path.join(tempDir, 'pytest.ini'), '');

      const result = detector.detectPython();

      assert.strictEqual(result.detected, true);
      assert.strictEqual(result.type, 'python');
      assert.strictEqual(result.testCommand, 'pytest');
    });

    it('should detect Python project with requirements.txt', () => {
      fs.writeFileSync(path.join(tempDir, 'requirements.txt'), 'pytest==7.0.0');

      const result = detector.detectPython();

      assert.strictEqual(result.detected, true);
      assert.strictEqual(result.type, 'python');
    });

    it('should use unittest if no pytest', () => {
      fs.writeFileSync(path.join(tempDir, 'setup.py'), '');
      fs.writeFileSync(path.join(tempDir, 'test_foo.py'), '');

      const result = detector.detectPython();

      assert.strictEqual(result.detected, true);
      assert.strictEqual(result.testCommand, 'python -m unittest discover');
    });
  });

  describe('detectJava', () => {
    it('should detect Maven project', () => {
      fs.writeFileSync(path.join(tempDir, 'pom.xml'), '<project></project>');

      const result = detector.detectJava();

      assert.strictEqual(result.detected, true);
      assert.strictEqual(result.type, 'java-maven');
      assert.strictEqual(result.testCommand, 'mvn test');
      assert.strictEqual(result.buildCommand, 'mvn package');
    });

    it('should detect Gradle project', () => {
      fs.writeFileSync(path.join(tempDir, 'build.gradle'), '');

      const result = detector.detectJava();

      assert.strictEqual(result.detected, true);
      assert.strictEqual(result.type, 'java-gradle');
      assert.strictEqual(result.testCommand, './gradlew test');
      assert.strictEqual(result.buildCommand, './gradlew build');
    });
  });

  describe('detectGo', () => {
    it('should detect Go project with go.mod', () => {
      fs.writeFileSync(path.join(tempDir, 'go.mod'), 'module example.com/hello');

      const result = detector.detectGo();

      assert.strictEqual(result.detected, true);
      assert.strictEqual(result.type, 'go');
      assert.strictEqual(result.testCommand, 'go test ./...');
      assert.strictEqual(result.buildCommand, 'go build ./...');
    });

    it('should detect Go project with .go files', () => {
      fs.writeFileSync(path.join(tempDir, 'main.go'), 'package main');

      const result = detector.detectGo();

      assert.strictEqual(result.detected, true);
    });
  });

  describe('detectRust', () => {
    it('should detect Rust project with Cargo.toml', () => {
      fs.writeFileSync(path.join(tempDir, 'Cargo.toml'), '[package]\nname = "test"');

      const result = detector.detectRust();

      assert.strictEqual(result.detected, true);
      assert.strictEqual(result.type, 'rust');
      assert.strictEqual(result.testCommand, 'cargo test');
      assert.strictEqual(result.buildCommand, 'cargo build');
    });
  });

  describe('detectRuby', () => {
    it('should detect Ruby project with Gemfile', () => {
      fs.writeFileSync(path.join(tempDir, 'Gemfile'), '');
      fs.writeFileSync(path.join(tempDir, 'Rakefile'), '');

      const result = detector.detectRuby();

      assert.strictEqual(result.detected, true);
      assert.strictEqual(result.type, 'ruby');
      assert.strictEqual(result.testCommand, 'rake test');
    });

    it('should detect RSpec project', () => {
      fs.writeFileSync(path.join(tempDir, 'Gemfile'), '');
      fs.mkdirSync(path.join(tempDir, 'spec'));

      const result = detector.detectRuby();

      assert.strictEqual(result.detected, true);
      assert.strictEqual(result.testCommand, 'rspec');
    });
  });

  describe('detectPHP', () => {
    it('should detect PHP project with composer and phpunit', () => {
      fs.writeFileSync(path.join(tempDir, 'composer.json'), '{}');
      fs.writeFileSync(path.join(tempDir, 'phpunit.xml'), '');

      const result = detector.detectPHP();

      assert.strictEqual(result.detected, true);
      assert.strictEqual(result.type, 'php');
      assert.strictEqual(result.testCommand, './vendor/bin/phpunit');
    });
  });

  describe('detectDotNet', () => {
    it('should detect .NET project with .csproj', () => {
      fs.writeFileSync(path.join(tempDir, 'MyApp.csproj'), '');

      const result = detector.detectDotNet();

      assert.strictEqual(result.detected, true);
      assert.strictEqual(result.type, 'dotnet');
      assert.strictEqual(result.testCommand, 'dotnet test');
      assert.strictEqual(result.buildCommand, 'dotnet build');
    });
  });

  describe('detectC', () => {
    it('should detect C project with CMake', () => {
      fs.writeFileSync(path.join(tempDir, 'CMakeLists.txt'), '');

      const result = detector.detectC();

      assert.strictEqual(result.detected, true);
      assert.strictEqual(result.type, 'c-cmake');
      assert.strictEqual(result.testCommand, 'ctest');
      assert.strictEqual(result.buildCommand, 'cmake --build build');
    });

    it('should detect C project with Makefile', () => {
      fs.writeFileSync(path.join(tempDir, 'Makefile'), '');

      const result = detector.detectC();

      assert.strictEqual(result.detected, true);
      assert.strictEqual(result.type, 'c-make');
      assert.strictEqual(result.testCommand, 'make test');
      assert.strictEqual(result.buildCommand, 'make');
    });
  });

  describe('detect', () => {
    it('should return first matching detector', () => {
      const pkg = { name: 'test', scripts: { test: 'jest' } };
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(pkg));

      const result = detector.detect();

      assert.strictEqual(result.detected, true);
      assert.strictEqual(result.type, 'nodejs');
      assert.strictEqual(result.testCommand, 'npm test');
    });

    it('should return unknown if no detector matches', () => {
      // Empty directory
      const result = detector.detect();

      assert.strictEqual(result.detected, false);
      assert.strictEqual(result.type, 'unknown');
      assert.strictEqual(result.testCommand, null);
      assert.strictEqual(result.buildCommand, null);
    });
  });

  describe('getDescription', () => {
    it('should return readable descriptions', () => {
      assert.strictEqual(detector.getDescription({ type: 'nodejs' }), 'Node.js project');
      assert.strictEqual(detector.getDescription({ type: 'python' }), 'Python project');
      assert.strictEqual(detector.getDescription({ type: 'rust' }), 'Rust project');
      assert.strictEqual(detector.getDescription({ type: 'java-maven' }), 'Java project (Maven)');
    });
  });
});
