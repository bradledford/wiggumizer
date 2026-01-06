# Installation

Install Wiggumizer on your system using your preferred package manager.

## System Requirements

- **Operating Systems**: macOS, Linux, Windows (WSL recommended)
- **Node.js**: v18+ (for npm installation)
- **Python**: 3.8+ (for pip installation)
- **Rust**: 1.70+ (for cargo installation)
- **Git**: Required for version control integration

## Installation Methods

### npm (Node.js)

Install globally via npm:

```bash
npm install -g wiggumizer
```

Or using npx (no installation):

```bash
npx wiggumizer --help
```

Verify installation:

```bash
wiggumize --version
```

### pip (Python)

Install via pip:

```bash
pip install wiggumizer
```

Or using pipx (isolated environment):

```bash
pipx install wiggumizer
```

Verify installation:

```bash
wiggumize --version
```

### cargo (Rust)

Install from crates.io:

```bash
cargo install wiggumizer
```

Verify installation:

```bash
wiggumize --version
```

### Homebrew (macOS/Linux)

```bash
brew tap wiggumizer/tap
brew install wiggumizer
```

### Download Binary (All Platforms)

Download pre-built binaries from the [releases page](https://github.com/bradledford/wiggumizer/releases):

1. Download the appropriate binary for your platform
2. Extract the archive
3. Move the binary to your PATH:

**macOS/Linux:**
```bash
sudo mv wiggumize /usr/local/bin/
chmod +x /usr/local/bin/wiggumize
```

**Windows:**
```powershell
# Add the directory containing wiggumize.exe to your PATH
```

## Configuration

### Set Up AI Provider

After installation, configure your AI provider:

```bash
wiggumize init
```

This will prompt you to:
1. Choose a default provider (Claude, GPT, Sourcegraph Amp, local model)
2. Enter your API key
3. Set default options

### Manual Configuration

Alternatively, create `.wiggumizer.yml` in your home directory or project root:

```yaml
provider: claude
api_keys:
  anthropic: your-api-key-here
defaults:
  max_iterations: 20
  convergence_threshold: 0.95
```

See [Configuration File Reference](../cli-reference/configuration-file.md) for all options.

### Environment Variables

You can also configure via environment variables:

```bash
export WIGGUMIZER_PROVIDER=claude
export ANTHROPIC_API_KEY=your-api-key-here
export OPENAI_API_KEY=your-api-key-here
```

Add these to your `.bashrc`, `.zshrc`, or `.env` file.

## Verify Installation

Check that Wiggumizer is correctly installed:

```bash
# Check version
wiggumize --version

# Check help
wiggumize --help

# Test configuration
wiggumize doctor
```

The `wiggumize doctor` command will verify:
- ✓ Installation is valid
- ✓ AI provider is configured
- ✓ API keys are set
- ✓ Git is available
- ✓ Dependencies are met

## Getting an API Key

### Claude (Anthropic)

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to **API Keys**
4. Create a new key
5. Copy the key (starts with `sk-ant-`)
6. Set it: `export ANTHROPIC_API_KEY=sk-ant-...`

### OpenAI (GPT)

1. Go to [platform.openai.com](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to **API Keys**
4. Create a new key
5. Copy the key (starts with `sk-`)
6. Set it: `export OPENAI_API_KEY=sk-...`

### Sourcegraph Amp

1. Go to [sourcegraph.com](https://sourcegraph.com/)
2. Sign up or log in
3. Install @sourcegraph/amp: `npm install -g @sourcegraph/amp`
4. Wiggumizer will use your amp credentials

### Local Models (Ollama)

1. Install Ollama from [ollama.ai](https://ollama.ai/)
2. Pull a model: `ollama pull llama2`
3. Configure Wiggumizer:
   ```bash
   wiggumize provider local --backend ollama --model llama2
   ```

See [AI Providers](../ai-providers/README.md) for detailed setup guides.

## Troubleshooting Installation

### npm: Command not found after install

Add npm global bin to your PATH:

```bash
# Find npm global bin location
npm config get prefix

# Add to PATH (add to .bashrc or .zshrc)
export PATH="$PATH:$(npm config get prefix)/bin"
```

### pip: Installation failed

Try using pipx for isolated installation:

```bash
pip install pipx
pipx install wiggumizer
```

### cargo: Compilation failed

Ensure you have the latest Rust toolchain:

```bash
rustup update
cargo install wiggumizer
```

### Permission denied on macOS/Linux

Use sudo or install in user directory:

```bash
# Option 1: Use sudo
sudo npm install -g wiggumizer

# Option 2: Configure npm to use user directory
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
npm install -g wiggumizer
```

### Windows: wiggumize not recognized

Ensure the installation directory is in your PATH:

1. Search for "Environment Variables" in Windows
2. Edit the "Path" variable
3. Add the directory containing `wiggumize.exe`
4. Restart your terminal

### Still having issues?

- Check [Troubleshooting Setup](troubleshooting-setup.md)
- Visit our [GitHub Issues](https://github.com/bradledford/wiggumizer/issues)
- Ask in [Discussions](https://github.com/bradledford/wiggumizer/discussions)

## Upgrading

### npm
```bash
npm update -g wiggumizer
```

### pip
```bash
pip install --upgrade wiggumizer
```

### cargo
```bash
cargo install wiggumizer --force
```

### Homebrew
```bash
brew upgrade wiggumizer
```

## Uninstalling

### npm
```bash
npm uninstall -g wiggumizer
```

### pip
```bash
pip uninstall wiggumizer
```

### cargo
```bash
cargo uninstall wiggumizer
```

### Homebrew
```bash
brew uninstall wiggumizer
```

## Next Steps

Now that Wiggumizer is installed:

1. **[Quick Start](quick-start.md)** - Run your first Ralph loop in 5 minutes
2. **[First Project](first-project.md)** - Complete end-to-end tutorial
3. **[Configure AI Provider](../ai-providers/README.md)** - Detailed provider setup

---

**Installation complete?** Head to the [Quick Start guide](quick-start.md) to run your first loop.
