# ClaudeCodeUI Integration Analysis & Dyad Integration Fix

## Executive Summary

ClaudeCodeUI is a **web-based UI** for the Claude Code CLI that uses WebSocket for real-time communication. Dyad is an **Electron desktop app** using IPC for process communication. This document analyzes how ClaudeCodeUI implements its integration and provides a plan to fix Dyad's integration based on these patterns.

## Architecture Comparison

| Aspect | ClaudeCodeUI | Dyad |
|--------|--------------|------|
| **Runtime** | Web (Vite + Express Server) | Electron Desktop App |
| **Communication** | WebSocket + REST API | IPC (Inter-Process Communication) |
| **Backend** | Node.js Express Server | Electron Main Process |
| **Frontend** | React (React Router) | React (TanStack Router) |
| **State** | React Context + localStorage | TanStack Query + Jotai Atoms |
| **Database** | SQLite (sessions/messages) | SQLite (Drizzle ORM) |

## Key ClaudeCodeUI Patterns

### 1. WebSocket Integration (`server/index.js`)

```javascript
// Two WebSocket paths:
// - /ws for chat (Claude/Cursor commands)
// - /shell for terminal sessions

wss.on('connection', (ws, request) => {
  const pathname = urlObj.pathname;
  
  if (pathname === '/shell') {
    handleShellConnection(ws);
  } else if (pathname === '/ws') {
    handleChatConnection(ws);
  }
});
```

**Chat Connection Handler:**
- Receives `claude-command` or `cursor-command` messages
- Tracks active sessions with abort capability
- Sends real-time updates: `claude-response`, `claude-output`, `claude-error`
- Manages session lifecycle: `session-created`, `session-aborted`

### 2. Claude SDK Integration (`server/claude-sdk.js`)

**Key Features:**
- Uses `@anthropic-ai/claude-agent-sdk` directly (not CLI spawning)
- Session management with `Map<sessionId, queryInstance>`
- Options mapping: CLI format → SDK format
- Message transformation for WebSocket compatibility
- Token budget extraction from SDK responses
- Abort support via `queryInstance.interrupt()`

**Critical Pattern - Streaming:**
```javascript
const queryInstance = query({
  prompt: finalCommand,
  options: sdkOptions
});

// Process streaming messages
for await (const message of queryInstance) {
  // Transform and send to WebSocket
  ws.send(JSON.stringify({
    type: 'claude-response',
    data: transformedMessage
  }));
  
  // Extract token budget from result messages
  if (message.type === 'result') {
    const tokenBudget = extractTokenBudget(message);
    ws.send(JSON.stringify({
      type: 'token-budget',
      data: tokenBudget
    }));
  }
}
```

### 3. Frontend WebSocket Hook (`src/utils/websocket.js`)

```javascript
export function useWebSocket() {
  const [ws, setWs] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  // Auto-reconnect on close
  websocket.onclose = () => {
    setIsConnected(false);
    setTimeout(() => connect(), 3000);
  };

  const sendMessage = (message) => {
    if (ws && isConnected) {
      ws.send(JSON.stringify(message));
    }
  };

  return { ws, sendMessage, messages, isConnected };
}
```

### 4. Context Pattern (`src/contexts/WebSocketContext.jsx`)

Wraps WebSocket functionality in React Context, providing global access to:
- `ws` - WebSocket instance
- `sendMessage` - Send messages
- `messages` - Message array
- `isConnected` - Connection status

## Dyad Current Implementation Issues

### Problem 1: No Direct Claude SDK Integration
**Current:** Dyad uses the Vercel AI SDK (`streamText`) with custom providers but doesn't leverage the Claude Agent SDK directly.

**Impact:** 
- Missing Claude-specific features (MCP tools, session management)
- No access to Claude Agent capabilities
- Complex workarounds for streaming

### Problem 2: IPC Streaming Limitations
**Current:** IPC handlers use `safeSend` to emit chunks, but there's no structured session management like ClaudeCodeUI.

**Code Reference:**
```typescript
// src/ipc/handlers/chat_stream_handlers.ts:448
safeSend(event.sender, "chat:response:chunk", {
  chatId: req.chatId,
  messages: updatedChat.messages,
});
```

**Issues:**
- No session tracking for abort/resume
- Token budget updates not synchronized with streaming
- No proper error recovery

### Problem 3: Missing Session Management

ClaudeCodeUI tracks sessions:
```javascript
const activeSessions = new Map();
function addSession(sessionId, queryInstance, tempImagePaths, tempDir) {
  activeSessions.set(sessionId, {
    instance: queryInstance,
    startTime: Date.now(),
    status: 'active',
    tempImagePaths,
    tempDir
  });
}
```

**Dyad only tracks AbortControllers:**
```typescript
// src/ipc/handlers/chat_stream_handlers.ts:97
const activeStreams = new Map<number, AbortController>();
```

Missing:
- Query instance tracking
- Session metadata
- Proper cleanup on abort

### Problem 4: No Token Budget Streaming

ClaudeCodeUI extracts and streams token usage:
```javascript
const tokenBudget = extractTokenBudget(message);
if (tokenBudget) {
  ws.send(JSON.stringify({
    type: 'token-budget',
    data: tokenBudget
  }));
}
```

**Dyad:** Token usage is only available after completion via `onFinish` callback.

## Integration Fix Plan

### Phase 1: Add Claude SDK Wrapper (High Priority)

Create `src/ipc/utils/claude_sdk_wrapper.ts`:

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

interface ClaudeSdkSession {
  instance: AsyncGenerator;
  startTime: number;
  status: 'active' | 'aborted' | 'completed';
  chatId: number;
}

export class ClaudeSdkManager {
  private activeSessions = new Map<string, ClaudeSdkSession>();

  async startSession(params: {
    prompt: string;
    chatId: number;
    options: any;
  }): Promise<string> {
    const sessionId = uuidv4();
    const queryInstance = query({
      prompt: params.prompt,
      options: this.mapOptions(params.options)
    });

    this.activeSessions.set(sessionId, {
      instance: queryInstance,
      startTime: Date.now(),
      status: 'active',
      chatId: params.chatId
    });

    return sessionId;
  }

  async abortSession(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    await session.instance.interrupt();
    session.status = 'aborted';
    this.activeSessions.delete(sessionId);
    return true;
  }

  private mapOptions(options: any) {
    // Map Dyad options to Claude SDK format
    return {
      cwd: options.appPath,
      model: options.model || 'sonnet',
      // ... other mappings
    };
  }
}
```

### Phase 2: Enhance IPC Stream Handler

Update `src/ipc/handlers/chat_stream_handlers.ts`:

```typescript
// Add session tracking
interface StreamSession {
  abortController: AbortController;
  sessionId: string;
  startTime: number;
  lastTokenUpdate?: TokenBudget;
}

const activeStreamSessions = new Map<number, StreamSession>();

// In chat:stream handler:
const sessionId = uuidv4();
const abortController = new AbortController();

activeStreamSessions.set(req.chatId, {
  abortController,
  sessionId,
  startTime: Date.now()
});

// Send session-created event
safeSend(event.sender, "chat:response:session-created", {
  chatId: req.chatId,
  sessionId
});

// During streaming, extract and send token updates
for await (const part of fullStream) {
  // ... existing chunk processing ...
  
  // Extract token budget from SDK responses
  if (part.type === 'usage' && part.usage) {
    const tokenBudget = {
      used: part.usage.totalTokens,
      total: contextWindow
    };
    
    safeSend(event.sender, "chat:response:token-budget", {
      chatId: req.chatId,
      tokenBudget
    });
  }
}
```

### Phase 3: Update IPC Client

Add to `src/ipc/ipc_client.ts`:

```typescript
export interface ChatStreamCallbacks {
  onUpdate: (messages: Message[]) => void;
  onEnd: (response: ChatResponseEnd) => void;
  onError: (error: string) => void;
  onSessionCreated?: (sessionId: string) => void;
  onTokenBudget?: (budget: { used: number; total: number }) => void;
}

// Update constructor to handle new events:
this.ipcRenderer.on("chat:response:session-created", (data) => {
  const { chatId, sessionId } = data as { chatId: number; sessionId: string };
  const callbacks = this.chatStreams.get(chatId);
  if (callbacks?.onSessionCreated) {
    callbacks.onSessionCreated(sessionId);
  }
});

this.ipcRenderer.on("chat:response:token-budget", (data) => {
  const { chatId, tokenBudget } = data as {
    chatId: number;
    tokenBudget: { used: number; total: number };
  };
  const callbacks = this.chatStreams.get(chatId);
  if (callbacks?.onTokenBudget) {
    callbacks.onTokenBudget(tokenBudget);
  }
});
```

### Phase 4: Update Preload

Add to `src/preload.ts`:

```typescript
const validReceiveChannels = [
  // ... existing channels ...
  "chat:response:session-created",
  "chat:response:token-budget",
] as const;
```

### Phase 5: Enhance useStreamChat Hook

Update `src/hooks/useStreamChat.ts`:

```typescript
export function useStreamChat() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tokenBudget, setTokenBudget] = useState<{
    used: number;
    total: number;
  } | null>(null);

  const streamMessage = useCallback(async ({
    prompt,
    chatId,
    // ... other params
  }) => {
    IpcClient.getInstance().streamMessage(prompt, {
      chatId,
      onUpdate: (updatedMessages) => {
        // ... existing logic ...
      },
      onSessionCreated: (sessionId) => {
        setSessionId(sessionId);
      },
      onTokenBudget: (budget) => {
        setTokenBudget(budget);
      },
      onEnd: (response) => {
        // ... existing logic ...
        setSessionId(null);
      },
      onError: (error) => {
        // ... existing logic ...
        setSessionId(null);
      }
    });
  }, [/* deps */]);

  return {
    streamMessage,
    sessionId,
    tokenBudget,
    // ... other returns
  };
}
```

## Implementation Priority

1. **High Priority:**
   - Add session tracking to IPC handlers
   - Implement token budget streaming
   - Add session-created event

2. **Medium Priority:**
   - Integrate Claude SDK wrapper
   - Add session management utilities
   - Improve abort handling

3. **Low Priority:**
   - Add reconnection logic
   - Implement session persistence
   - Add advanced debugging tools

## Testing Strategy

1. **Unit Tests:**
   - Test session management functions
   - Test token budget extraction
   - Test abort/resume logic

2. **Integration Tests:**
   - Test streaming with session tracking
   - Test abort during streaming
   - Test token updates during stream

3. **E2E Tests:**
   - Test complete chat flow with sessions
   - Test multi-session scenarios
   - Test error recovery

## Benefits of This Integration

1. **Better Session Management:** Track and manage chat sessions properly
2. **Real-time Token Updates:** Show token usage as it happens
3. **Improved Abort Handling:** Clean session cleanup on abort
4. **Better Error Recovery:** Handle errors with session context
5. **Future-proof:** Ready for Claude Agent SDK features

## Conclusion

ClaudeCodeUI's WebSocket-based architecture provides excellent patterns for real-time streaming and session management. While Dyad uses IPC instead of WebSockets, we can adapt these patterns by:

1. Adding structured session tracking to IPC handlers
2. Implementing real-time token budget updates
3. Enhancing abort/cleanup mechanisms
4. Optionally integrating Claude SDK for advanced features

This will significantly improve Dyad's chat streaming experience and bring it closer to ClaudeCodeUI's robust implementation.