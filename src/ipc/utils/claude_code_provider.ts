import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { FetchFunction } from "@ai-sdk/provider-utils";
import { withoutTrailingSlash } from "@ai-sdk/provider-utils";
import type { LanguageModelV2 } from "@ai-sdk/provider";
import { getClaudeCodeBaseUrl } from "./claude_code_utils";

type ClaudeCodeModelId = string;

export interface ClaudeCodeProviderOptions {
  /**
   * Base URL for the Claude Code API.
   * If undefined, defaults to http://localhost:3000
   */
  baseURL?: string;
  headers?: Record<string, string>;
  fetch?: FetchFunction;
}

export interface ClaudeCodeChatSettings {}

export interface ClaudeCodeProvider {
  (modelId: ClaudeCodeModelId, settings?: ClaudeCodeChatSettings): LanguageModelV2;
}

/**
 * Creates a Claude Code provider that uses OpenAI-compatible API
 * Claude Code runs a local server that provides an API compatible with OpenAI's format
 */
export function createClaudeCodeProvider(
  options?: ClaudeCodeProviderOptions,
): ClaudeCodeProvider {
  const base = withoutTrailingSlash(
    options?.baseURL ?? getClaudeCodeBaseUrl(),
  )!;
  
  // Claude Code API is OpenAI-compatible
  const v1Base = (base.endsWith("/v1") ? base : `${base}/v1`) as string;
  
  const provider = createOpenAICompatible({
    name: "claudecode",
    baseURL: v1Base,
    headers: options?.headers,
  });
  
  return (modelId: ClaudeCodeModelId) => provider(modelId);
}

