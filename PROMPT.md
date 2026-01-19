## Chat Service Integration

Add the ability to connect Wiggumizer to external chat services using a provider model architecture. This allows Ralph Wiggum responses to be delivered through various messaging platforms.

### Provider Model Design

Implement a pluggable provider system where each chat service is a separate provider module. Providers should:

- Implement a common interface for sending/receiving messages
- Handle authentication and connection management specific to each service
- Support both sending Ralph responses and receiving user prompts

### Communication Triggers

Providers should send messages at these key points:

1. **Successful completion** - At the end of a successful `wiggumizer run` event, send a short summary of the work completed (e.g., files modified, iterations performed)

2. **Unexpected stoppage** - When iterations are interrupted unexpectedly, send a notification with the reason why (e.g., error encountered, rate limit hit, permission denied)

### Initial Providers (CLI-based, local execution)

Start with CLI-based chat systems that users can run locally (assuming they have the respective CLI tools installed):

1. **Slack Provider**
   - Use the Slack CLI (`slack`) for local workspace integration
   - Support posting to channels and responding to direct messages
   - Leverage Slack CLI's authentication flow

2. **WhatsApp Provider**
   - Use WhatsApp CLI tools (e.g., `whatsapp-cli` or similar)
   - Support sending messages to contacts and groups
   - Handle WhatsApp's authentication/QR code flow

### Usage

```bash
# Send a Ralph response to Slack
wiggumizer run --provider slack --channel "#general"

# Send a Ralph response via WhatsApp
wiggumizer run --provider whatsapp --contact "+1234567890"

# Interactive mode - listen and respond
wiggumizer listen --provider slack --channel "#random"
```

### Future Considerations

- Add API-based providers for hosted/cloud integrations
- Support Discord, Teams, Telegram, and other platforms
- Add message threading and conversation context