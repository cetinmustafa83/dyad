# Claude Code Provider Implementation

## Overview

This implementation adds Claude Code as an **all-in-one local AI provider** to Dyad. Claude Code is a complete solution where users configure their API keys (Claude API or GLM API) directly in Claude Code itself. This integration leverages Claude Code's powerful capabilities including context management, agents, skills, and plugins to enhance the development workflow.

## Key Concept: All-in-One Provider

**No API Key Configuration in Dyad UI** - Users configure their API keys (Claude API or GLM API) directly in Claude Code. Dyad simply connects to the locally running Claude Code instance and leverages all its capabilities.

## Features

### 🔍 Automatic Detection
- **Path Detection**: Automatically detects Claude Code CLI installation on macOS and Linux
- **Version Checking**: Displays installed Claude Code version
- **Installation Status**: Shows real-time installation status in settings

### 🛠️ MCP Capabilities
- **MCP Servers**: Detects and displays configured MCP servers
- **Skills**: Lists available skills
- **Plugins**: Shows installed plugins
- **Agents & Sub-Agents**: Detects configured agents and sub-agents

### 🤖 Model Support
- Claude Sonnet 4.5
- Claude Sonnet 4
- Claude Opus 4
- Claude Haiku 4

### 🔌 Integration
- OpenAI-compatible API integration
- Seamless integration with existing Dyad architecture
- Settings UI with installation info and capabilities display

## Architecture

### Files Created

1. **`src/ipc/utils/claude_code_utils.ts`**
   - Path detection utilities
   - Installation checking
   - Version retrieval
   - Capabilities detection (MCP servers, skills, plugins, agents)

2. **`src/ipc/handlers/local_model_claudecode_handler.ts`**
   - IPC handlers for Claude Code operations
   - Model listing
   - Installation info retrieval
   - Capabilities retrieval

3. **`src/ipc/utils/claude_code_provider.ts`**
   - OpenAI-compatible provider implementation
   - Local server connection (default port 3000)

4. **`src/hooks/useClaudeCodeModels.ts`**
   - React hook for Claude Code state management
   - Atoms for models, installation, and capabilities

5. **`src/components/settings/ClaudeCodeConfiguration.tsx`**
   - Settings UI component
   - Installation status display
   - Capabilities display

### Files Modified

1. **`src/lib/schemas.ts`**
   - Added 'claudecode' to providers list
   - Updated cloudProviders filter

2. **`src/ipc/shared/language_model_constants.ts`**
   - Added Claude Code to LOCAL_PROVIDERS

3. **`src/ipc/utils/get_model_client.ts`**
   - Added Claude Code provider case
   - Imported Claude Code utilities

4. **`src/ipc/handlers/local_model_handlers.ts`**
   - Registered Claude Code handlers

5. **`src/preload.ts`**
   - Added Claude Code IPC channels to allowlist

6. **`src/ipc/ipc_client.ts`**
   - Added Claude Code methods

7. **`src/components/settings/ApiKeyConfiguration.tsx`**
   - Added special handling for Claude Code

8. **`src/ipc/ipc_types.ts`**
   - Updated LocalModel interface

## Usage

### Prerequisites

1. Install Claude Code CLI on macOS or Linux
2. Configure your API keys in Claude Code:
   - **Option 1**: Use Claude API (Anthropic)
   - **Option 2**: Use GLM API
3. Ensure Claude Code is accessible in your PATH

### Setup in Dyad

1. Navigate to Settings → Providers → Claude Code
2. Dyad will automatically detect your Claude Code installation
3. View installation status, version, and detected capabilities
4. Select Claude Code models from the model dropdown
5. Start using Claude Code with all its capabilities (context, agents, skills, plugins)

**Important**: No API key configuration is needed in Dyad. All authentication is handled by Claude Code itself.

### Path Detection

The system checks the following locations:
- `/usr/local/bin/claude`
- `~/.local/bin/claude`
- `~/bin/claude`
- Result of `which claude` command

### Capabilities Detection

Claude Code capabilities are read from configuration files in:
- `~/.config/claude-code/config.json`
- `~/.claude-code/config.json`
- `~/Library/Application Support/claude-code/config.json` (macOS)

## Platform Support

- ✅ **macOS**: Full support
- ✅ **Linux**: Full support
- ⚠️ **Windows**: Not officially supported (WSL experimental)

## API Integration

Claude Code provider uses OpenAI-compatible API format:
- Base URL: `http://localhost:3000/v1` (configurable via `CLAUDE_CODE_PORT` env var)
- Compatible with AI SDK's `createOpenAICompatible` provider

## Future Enhancements

- [ ] Real-time MCP server status monitoring
- [ ] Dynamic model discovery from Claude Code API
- [ ] Agent execution integration
- [ ] Skill and plugin management UI
- [ ] Windows native support (when available)

## Testing

To test the implementation:

1. Install Claude Code CLI
2. Start Dyad
3. Navigate to Settings → Providers → Claude Code
4. Verify installation detection
5. Check capabilities display
6. Select a Claude Code model and test chat functionality

## Notes

- Claude Code must be running for the provider to work
- MCP capabilities are detected from config files
- The provider respects Claude Code's local server configuration
- No API key required (uses local installation)

