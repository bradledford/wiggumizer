const fs = require('fs');
const path = require('path');

/**
 * Detects project type and suggests appropriate validation commands
 * Supports Node.js, Python, Java, Go, Rust, Ruby, PHP, and more
 */
class ProjectDetector {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }

  /**
   * Detect project type by examining files in the directory
   * @returns {Object} { type, testCommand, buildCommand, detected }
   */
  detect() {
    const detectors = [
      this.detectNodeJS.bind(this),
      this.detectPython.bind(this),
      this.detectJava.bind(this),
      this.detectGo.bind(this),
      this.detectRust.bind(this),
      this.detectRuby.bind(this),
      this.detectPHP.bind(this),
      this.detectDotNet.bind(this),
      this.detectC.bind(this),
      this.detectCpp.bind(this),
      this.detectSwift.bind(this),
      this.detectKotlin.bind(this),
      this.detectElixir.bind(this),
      this.detectPerl.bind(this)
    ];

    for (const detector of detectors) {
      const result = detector();
      if (result.detected) {
        return result;
      }
    }

    // No specific type detected
    return {
      type: 'unknown',
      testCommand: null,
      buildCommand: null,
      detected: false
    };
  }

  /**
   * Check if file exists in project root
   */
  fileExists(filename) {
    return fs.existsSync(path.join(this.cwd, filename));
  }

  /**
   * Check if any files match a pattern in the project
   */
  hasFilesMatching(pattern) {
    try {
      const files = fs.readdirSync(this.cwd);
      return files.some(file => file.match(pattern));
    } catch (error) {
      return false;
    }
  }

  /**
   * Read and parse package.json if it exists
   */
  readPackageJson() {
    try {
      const pkgPath = path.join(this.cwd, 'package.json');
      if (!fs.existsSync(pkgPath)) return null;
      return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    } catch (error) {
      return null;
    }
  }

  detectNodeJS() {
    const pkg = this.readPackageJson();
    if (!pkg) {
      return { detected: false };
    }

    const hasTest = pkg.scripts && pkg.scripts.test;
    const hasBuild = pkg.scripts && (pkg.scripts.build || pkg.scripts.compile);

    return {
      type: 'nodejs',
      testCommand: hasTest ? 'npm test' : null,
      buildCommand: hasBuild ? 'npm run build' : null,
      detected: true,
      packageManager: this.detectPackageManager()
    };
  }

  detectPackageManager() {
    if (this.fileExists('pnpm-lock.yaml')) return 'pnpm';
    if (this.fileExists('yarn.lock')) return 'yarn';
    if (this.fileExists('bun.lockb')) return 'bun';
    return 'npm';
  }

  detectPython() {
    const hasRequirements = this.fileExists('requirements.txt');
    const hasSetupPy = this.fileExists('setup.py');
    const hasPyprojectToml = this.fileExists('pyproject.toml');
    const hasPytestIni = this.fileExists('pytest.ini');
    const hasTestFiles = this.hasFilesMatching(/test_.*\.py$/) ||
                         this.hasFilesMatching(/test.*\.py$/);

    // Must have at least one Python project indicator
    if (!hasRequirements && !hasSetupPy && !hasPyprojectToml && !hasPytestIni && !hasTestFiles) {
      return { detected: false };
    }

    // Detect test framework
    let testCommand = null;
    if (hasPytestIni || hasPyprojectToml) {
      // Explicit pytest configuration
      testCommand = 'pytest';
    } else if (hasTestFiles) {
      // Has test files but no pytest config - assume unittest
      testCommand = 'python -m unittest discover';
    }

    return {
      type: 'python',
      testCommand,
      buildCommand: null, // Python typically doesn't have a build step
      detected: true
    };
  }

  detectJava() {
    const hasMaven = this.fileExists('pom.xml');
    const hasGradle = this.fileExists('build.gradle') || this.fileExists('build.gradle.kts');
    const hasAnt = this.fileExists('build.xml');

    if (!hasMaven && !hasGradle && !hasAnt) {
      return { detected: false };
    }

    if (hasMaven) {
      return {
        type: 'java-maven',
        testCommand: 'mvn test',
        buildCommand: 'mvn package',
        detected: true
      };
    }

    if (hasGradle) {
      return {
        type: 'java-gradle',
        testCommand: './gradlew test',
        buildCommand: './gradlew build',
        detected: true
      };
    }

    if (hasAnt) {
      return {
        type: 'java-ant',
        testCommand: 'ant test',
        buildCommand: 'ant build',
        detected: true
      };
    }

    return { detected: false };
  }

  detectGo() {
    if (!this.fileExists('go.mod') && !this.hasFilesMatching(/\.go$/)) {
      return { detected: false };
    }

    return {
      type: 'go',
      testCommand: 'go test ./...',
      buildCommand: 'go build ./...',
      detected: true
    };
  }

  detectRust() {
    if (!this.fileExists('Cargo.toml')) {
      return { detected: false };
    }

    return {
      type: 'rust',
      testCommand: 'cargo test',
      buildCommand: 'cargo build',
      detected: true
    };
  }

  detectRuby() {
    const hasGemfile = this.fileExists('Gemfile');
    const hasRakefile = this.fileExists('Rakefile');
    const hasRubyFiles = this.hasFilesMatching(/\.rb$/);

    if (!hasGemfile && !hasRakefile && !hasRubyFiles) {
      return { detected: false };
    }

    let testCommand = null;
    if (hasRakefile) {
      testCommand = 'rake test';
    } else if (this.hasFilesMatching(/spec_.*\.rb$/) || this.fileExists('spec')) {
      testCommand = 'rspec';
    }

    return {
      type: 'ruby',
      testCommand,
      buildCommand: null,
      detected: true
    };
  }

  detectPHP() {
    const hasComposer = this.fileExists('composer.json');
    const hasPHPUnit = this.fileExists('phpunit.xml') || this.fileExists('phpunit.xml.dist');

    if (!hasComposer && !hasPHPUnit && !this.hasFilesMatching(/\.php$/)) {
      return { detected: false };
    }

    return {
      type: 'php',
      testCommand: hasPHPUnit ? './vendor/bin/phpunit' : null,
      buildCommand: null,
      detected: true
    };
  }

  detectDotNet() {
    const hasCsproj = this.hasFilesMatching(/\.csproj$/);
    const hasFsproj = this.hasFilesMatching(/\.fsproj$/);
    const hasSln = this.hasFilesMatching(/\.sln$/);

    if (!hasCsproj && !hasFsproj && !hasSln) {
      return { detected: false };
    }

    return {
      type: 'dotnet',
      testCommand: 'dotnet test',
      buildCommand: 'dotnet build',
      detected: true
    };
  }

  detectC() {
    const hasMakefile = this.fileExists('Makefile');
    const hasCMake = this.fileExists('CMakeLists.txt');
    const hasCFiles = this.hasFilesMatching(/\.c$/);

    if (!hasMakefile && !hasCMake && !hasCFiles) {
      return { detected: false };
    }

    if (hasCMake) {
      return {
        type: 'c-cmake',
        testCommand: 'ctest',
        buildCommand: 'cmake --build build',
        detected: true
      };
    }

    if (hasMakefile) {
      return {
        type: 'c-make',
        testCommand: 'make test',
        buildCommand: 'make',
        detected: true
      };
    }

    return {
      type: 'c',
      testCommand: null,
      buildCommand: null,
      detected: true
    };
  }

  detectCpp() {
    const hasMakefile = this.fileExists('Makefile');
    const hasCMake = this.fileExists('CMakeLists.txt');
    const hasCppFiles = this.hasFilesMatching(/\.(cpp|cc|cxx|hpp|hxx|h)$/);

    if (!hasMakefile && !hasCMake && !hasCppFiles) {
      return { detected: false };
    }

    if (hasCMake) {
      return {
        type: 'cpp-cmake',
        testCommand: 'ctest',
        buildCommand: 'cmake --build build',
        detected: true
      };
    }

    if (hasMakefile) {
      return {
        type: 'cpp-make',
        testCommand: 'make test',
        buildCommand: 'make',
        detected: true
      };
    }

    return {
      type: 'cpp',
      testCommand: null,
      buildCommand: null,
      detected: true
    };
  }

  detectSwift() {
    if (!this.fileExists('Package.swift')) {
      return { detected: false };
    }

    return {
      type: 'swift',
      testCommand: 'swift test',
      buildCommand: 'swift build',
      detected: true
    };
  }

  detectKotlin() {
    const hasGradle = this.fileExists('build.gradle.kts') ||
                      (this.fileExists('build.gradle') && this.hasFilesMatching(/\.kt$/));
    const hasMaven = this.fileExists('pom.xml') && this.hasFilesMatching(/\.kt$/);

    if (!hasGradle && !hasMaven) {
      return { detected: false };
    }

    if (hasGradle) {
      return {
        type: 'kotlin-gradle',
        testCommand: './gradlew test',
        buildCommand: './gradlew build',
        detected: true
      };
    }

    return {
      type: 'kotlin-maven',
      testCommand: 'mvn test',
      buildCommand: 'mvn package',
      detected: true
    };
  }

  detectElixir() {
    if (!this.fileExists('mix.exs')) {
      return { detected: false };
    }

    return {
      type: 'elixir',
      testCommand: 'mix test',
      buildCommand: 'mix compile',
      detected: true
    };
  }

  detectPerl() {
    const hasMakefile = this.fileExists('Makefile.PL');
    const hasBuild = this.fileExists('Build.PL');
    const hasPerlFiles = this.hasFilesMatching(/\.pl$/);

    if (!hasMakefile && !hasBuild && !hasPerlFiles) {
      return { detected: false };
    }

    return {
      type: 'perl',
      testCommand: 'prove -l t/',
      buildCommand: null,
      detected: true
    };
  }

  /**
   * Get a human-readable description of the detected project
   */
  getDescription(detection) {
    const descriptions = {
      'nodejs': 'Node.js project',
      'python': 'Python project',
      'java-maven': 'Java project (Maven)',
      'java-gradle': 'Java project (Gradle)',
      'java-ant': 'Java project (Ant)',
      'go': 'Go project',
      'rust': 'Rust project',
      'ruby': 'Ruby project',
      'php': 'PHP project',
      'dotnet': '.NET project',
      'c-cmake': 'C project (CMake)',
      'c-make': 'C project (Make)',
      'c': 'C project',
      'cpp-cmake': 'C++ project (CMake)',
      'cpp-make': 'C++ project (Make)',
      'cpp': 'C++ project',
      'swift': 'Swift project',
      'kotlin-gradle': 'Kotlin project (Gradle)',
      'kotlin-maven': 'Kotlin project (Maven)',
      'elixir': 'Elixir project',
      'perl': 'Perl project',
      'unknown': 'Unknown project type'
    };

    return descriptions[detection.type] || detection.type;
  }
}

module.exports = ProjectDetector;
