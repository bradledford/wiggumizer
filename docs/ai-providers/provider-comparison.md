# AI Provider Comparison

Wiggumizer supports multiple AI providers. This guide helps you choose the right one for your needs.

## Quick Comparison

| Provider | Speed | Cost | Quality | Best For |
|----------|-------|------|---------|----------|
| **Claude (Sonnet)** | Fast | Medium | Excellent | General use, complex refactoring |
| **Claude (Opus)** | Slow | High | Best | Critical code, architecture |
| **Claude (Haiku)** | Very Fast | Low | Good | Simple tasks, iteration speed |
| **GPT-4 Turbo** | Fast | Medium | Excellent | General use, documentation |
| **GPT-3.5 Turbo** | Very Fast | Very Low | Good | Simple refactoring, testing |
| **Sourcegraph Amp** | Medium | Medium | Good | Original Ralph experience |
| **Ollama (local)** | Slow | Free | Variable | Privacy, offline, learning |

## Detailed Comparison

### Claude (Anthropic)

**Models:**
- **Sonnet 4.5** - Balanced speed and quality
- **Opus 4.5** - Highest quality, slower
- **Haiku** - Fastest, lower cost

**Strengths:**
- Excellent code understanding
- Strong refactoring capabilities
- Good at following complex prompts
- Reliable convergence

**Weaknesses:**
- API rate limits can be restrictive
- Higher cost for Opus

**Best For:**
- Production refactoring
- Complex codebases
- When quality matters most

**Setup:** [Claude Setup Guide](claude/setup.md)

### OpenAI (GPT)

**Models:**
- **GPT-4 Turbo** - Balanced performance
- **GPT-4o** - Fast, multimodal capable
- **GPT-3.5 Turbo** - Fastest, cheapest

**Strengths:**
- Fast response times
- Good documentation generation
- Wide language support
- Well-established API

**Weaknesses:**
- Can be verbose
- Sometimes less focused on code quality
- May require more iterations

**Best For:**
- Documentation generation
- Test creation
- When speed matters
- Budget-conscious projects

**Setup:** [OpenAI Setup Guide](openai/setup.md)

### Sourcegraph Amp

**The original Ralph tool.**

**Strengths:**
- Designed for code
- Original Ralph experience
- Integrated with Sourcegraph ecosystem

**Weaknesses:**
- Requires Sourcegraph account
- Less provider flexibility

**Best For:**
- Sourcegraph users
- Original Ralph technique
- Code search integration

**Setup:** [Sourcegraph Amp Setup Guide](sourcegraph-amp/setup.md)

### Local Models (Ollama)

**Models:**
- **CodeLlama** - Code-specialized
- **DeepSeek Coder** - Strong coding model
- **Llama 3** - General purpose

**Strengths:**
- Free (after hardware cost)
- Complete privacy
- Offline capable
- No rate limits

**Weaknesses:**
- Slower (CPU/GPU dependent)
- Lower quality than cloud models
- Requires local setup
- Higher hardware requirements

**Best For:**
- Private/sensitive code
- Learning and experimentation
- Offline development
- Budget unlimited iteration

**Setup:** [Ollama Setup Guide](local-models/ollama.md)

## Cost Comparison

**Typical refactoring task (20 iterations, 1000 lines of code):**

| Provider | Estimated Cost |
|----------|----------------|
| Claude Haiku | $0.05 - $0.15 |
| Claude Sonnet | $0.50 - $1.50 |
| Claude Opus | $5.00 - $15.00 |
| GPT-3.5 Turbo | $0.05 - $0.20 |
| GPT-4 Turbo | $0.50 - $2.00 |
| GPT-4o | $0.30 - $1.00 |
| Sourcegraph Amp | $0.50 - $2.00 |
| Ollama (local) | $0.00 (hardware only) |

**Note:** Costs vary based on code size, complexity, and number of iterations.

## Performance Comparison

**Average iteration time:**

| Provider | Small File (<100 lines) | Large File (1000+ lines) |
|----------|-------------------------|--------------------------|
| Claude Haiku | 1-2s | 3-5s |
| Claude Sonnet | 2-4s | 5-10s |
| Claude Opus | 5-8s | 15-30s |
| GPT-3.5 Turbo | 1-2s | 3-6s |
| GPT-4 Turbo | 2-5s | 8-15s |
| Ollama (local) | 10-30s | 60-180s |

## Quality Comparison

**Convergence success rate (based on community reports):**

| Provider | Simple Tasks | Complex Refactoring | Architecture |
|----------|-------------|---------------------|--------------|
| Claude Opus | 95% | 90% | 85% |
| Claude Sonnet | 92% | 85% | 75% |
| GPT-4 Turbo | 90% | 80% | 70% |
| Claude Haiku | 85% | 70% | 60% |
| GPT-3.5 Turbo | 80% | 65% | 50% |
| Ollama (DeepSeek) | 75% | 60% | 45% |

## Recommendations

### For Beginners
**Start with:** Claude Sonnet or GPT-4 Turbo
- Good balance of cost and quality
- Reliable convergence
- Forgiving of prompt issues

### For Production Use
**Use:** Claude Opus or GPT-4 Turbo
- Highest quality output
- Reliable for important code
- Worth the extra cost

### For Learning/Experimentation
**Try:** GPT-3.5 Turbo or Ollama
- Low/no cost
- Fast iteration
- Learn without spending

### For Simple Tasks
**Use:** Claude Haiku or GPT-3.5 Turbo
- Fast and cheap
- Good enough for simple refactoring
- Quick convergence

### For Complex Refactoring
**Use:** Claude Sonnet or GPT-4 Turbo
- Better code understanding
- Handles complexity well
- More reliable convergence

### For Privacy-Sensitive Code
**Use:** Ollama (local models)
- No data leaves your machine
- Complete control
- Worth the speed tradeoff

## Mixed Strategy

Use different providers for different tasks:

```yaml
# .wiggumizer.yml
providers:
  default: claude-sonnet

  task_overrides:
    simple_refactor: claude-haiku
    test_generation: gpt-3.5-turbo
    architecture: claude-opus
    documentation: gpt-4-turbo
```

## Provider Switching

Easy to switch between providers:

```bash
# Try with Claude
wiggumize run --provider claude

# Not converging? Try GPT-4
wiggumize run --provider openai --continue

# Compare results
git diff HEAD~1
```

## Future Providers

Wiggumizer is designed to support new providers easily. Upcoming:
- Google Gemini
- Mistral AI
- Cohere
- More local model options

## See Also

- [Claude Setup](claude/setup.md)
- [OpenAI Setup](openai/setup.md)
- [Local Models Setup](local-models/ollama.md)
- [Cost Optimization](cost-optimization.md)
- [Custom Providers](custom-providers.md)

---

**Recommendation:** Start with Claude Sonnet for general use, experiment with others as you learn what works for your needs.
