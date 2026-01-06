# Troubleshooting

Common issues and solutions for Wiggumizer.

## Quick Diagnosis

Run the diagnostic tool:

```bash
wiggumize doctor
```

This checks:
- Installation validity
- Provider configuration
- API connectivity
- Git availability
- Dependency status

## Common Issues

### Loop Not Converging

**Symptoms:** Loop runs many iterations without stopping

**Solutions:**
- [Loop Not Converging Guide](loop-not-converging.md)
- Check prompt for conflicting requirements
- Use `--verbose` to see what's changing
- Try making prompt more specific

### API Errors

**Symptoms:** Authentication failures, rate limiting, timeouts

**Solutions:**
- [Provider Errors Guide](provider-errors.md)
- Verify API key is set correctly
- Check API quota/credits
- Try different provider

### Installation Issues

**Symptoms:** Command not found, permission errors

**Solutions:**
- [Troubleshooting Setup](../getting-started/troubleshooting-setup.md)
- Verify installation path is in PATH
- Check permissions
- Try reinstalling

### Performance Issues

**Symptoms:** Slow iterations, high costs

**Solutions:**
- [Performance Issues Guide](performance-issues.md)
- Use faster/cheaper model
- Limit file scope with `--files`
- Optimize prompt length

## By Error Message

### "API key not found"

```bash
export ANTHROPIC_API_KEY=your-key-here
# or
export OPENAI_API_KEY=your-key-here
```

[Provider setup guides](../ai-providers/README.md)

### "Rate limit exceeded"

Wait and retry, or switch providers:

```bash
wiggumize run --provider openai
```

[Provider errors guide](provider-errors.md)

### "No convergence detected"

Your prompt may need refinement:

```bash
wiggumize run --max-iterations 30 --verbose
```

[Loop not converging guide](loop-not-converging.md)

### "Git repository not found"

Initialize git in your project:

```bash
git init
git add .
git commit -m "Initial commit"
```

## Documentation

- **[Loop Not Converging](loop-not-converging.md)** - Non-convergence issues
- **[Provider Errors](provider-errors.md)** - API and provider problems
- **[Performance Issues](performance-issues.md)** - Speed and cost problems
- **[Debugging](debugging.md)** - Debug mode and logging
- **[Edge Cases](edge-cases.md)** - Known edge cases
- **[Getting Help](getting-help.md)** - How to get support

## Debug Mode

Enable detailed logging:

```bash
wiggumize run --debug
```

Shows:
- Full API requests/responses
- Iteration details
- File changes
- Convergence calculations

[Full debugging guide](debugging.md)

## Getting Help

If you're still stuck:

1. Check [FAQ](../appendices/faq.md)
2. Search [GitHub Issues](https://github.com/bradledford/wiggumizer/issues)
3. Ask in [Discussions](https://github.com/bradledford/wiggumizer/discussions)
4. [Report a bug](getting-help.md#reporting-bugs)

[Getting help guide](getting-help.md)

## Prevention

Avoid issues before they happen:

1. **Commit before running loops** - Easy rollback
2. **Start with small scopes** - `--files` flag
3. **Use `--dry-run`** - Preview changes
4. **Monitor costs** - Check API usage
5. **Test your prompts** - Iterate on prompt first

## Next Steps

- [Common Issues](common-issues.md) - Full list
- [Debugging Guide](debugging.md) - Advanced debugging
- [FAQ](../appendices/faq.md) - Frequently asked questions

---

Most issues are quickly resolved with the right guidance.
