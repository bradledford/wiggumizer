# AI Providers

Wiggumizer works with multiple AI providers, giving you flexibility in cost, speed, and quality.

## Quick Start

```bash
# Initialize with provider selection
wiggumize init

# Or set provider directly
export ANTHROPIC_API_KEY=your-key-here
wiggumize run --provider claude
```

## Supported Providers

- **[Claude (Anthropic)](claude/setup.md)** - Excellent code quality, reliable convergence
- **[OpenAI (GPT)](openai/setup.md)** - Fast, well-established, good for documentation
- **[Sourcegraph Amp](sourcegraph-amp/setup.md)** - Original Ralph tool
- **[Local Models (Ollama)](local-models/ollama.md)** - Privacy, offline, free

## Comparison

**[Provider Comparison Guide](provider-comparison.md)** - Detailed comparison of speed, cost, and quality

**Quick comparison:**

| Provider | Speed | Cost | Quality | Best For |
|----------|-------|------|---------|----------|
| Claude Sonnet | ⚡⚡⚡ | 💰💰 | ⭐⭐⭐⭐⭐ | General use |
| GPT-4 Turbo | ⚡⚡⚡ | 💰💰 | ⭐⭐⭐⭐ | Documentation |
| GPT-3.5 | ⚡⚡⚡⚡⚡ | 💰 | ⭐⭐⭐ | Simple tasks |
| Ollama | ⚡ | Free | ⭐⭐⭐ | Privacy |

## Setup Guides

### Cloud Providers

1. **[Claude Setup](claude/setup.md)** - Anthropic's Claude models
2. **[OpenAI Setup](openai/setup.md)** - GPT-3.5, GPT-4, GPT-4 Turbo
3. **[Sourcegraph Amp](sourcegraph-amp/setup.md)** - Original Ralph provider

### Local Providers

4. **[Ollama](local-models/ollama.md)** - Local models (CodeLlama, DeepSeek Coder)
5. **[llama.cpp](local-models/llamacpp.md)** - Direct model execution

## Configuration

Set your default provider in `.wiggumizer.yml`:

```yaml
provider: claude

api_keys:
  anthropic: ${ANTHROPIC_API_KEY}
  openai: ${OPENAI_API_KEY}

provider_config:
  claude:
    model: claude-sonnet-4.5
    max_tokens: 4096

  openai:
    model: gpt-4-turbo
    temperature: 0.2
```

Or use environment variables:

```bash
export WIGGUMIZER_PROVIDER=claude
export ANTHROPIC_API_KEY=sk-ant-...
```

## Switching Providers

Change provider per run:

```bash
wiggumize run --provider openai
wiggumize run --provider local
```

## Advanced Topics

- **[Provider Fallback](provider-fallback.md)** - Automatic failover between providers
- **[Cost Optimization](cost-optimization.md)** - Minimize API costs
- **[Custom Providers](custom-providers.md)** - Add your own provider

## Next Steps

1. Choose a provider from the comparison
2. Follow the setup guide for that provider
3. Run your first loop
4. Experiment with different providers for different tasks

---

**Not sure which to choose?** Start with [Claude](claude/setup.md) for best results.
