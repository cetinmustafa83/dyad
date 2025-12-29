import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { FetchFunction } from "@ai-sdk/provider-utils";
import { withoutTrailingSlash } from "@ai-sdk/provider-utils";
import type { LanguageModelV2 } from "@ai-sdk/provider";

type OllamaChatModelId = string;

export interface OllamaProviderOptions {
  /**
   * Base URL for the Ollama API. For real Ollama, use e.g. http://localhost:11434/api
   * The provider will POST to `${baseURL}/chat`.
   * If undefined, defaults to http://localhost:11434/api
   */
  baseURL?: string;
  headers?: Record<string, string>;
  fetch?: FetchFunction;
}

export interface OllamaChatSettings {}

export interface OllamaProvider {
  (modelId: OllamaChatModelId, settings?: OllamaChatSettings): LanguageModelV2;
}

export function createOllamaProvider(
  options?: OllamaProviderOptions,
): OllamaProvider {
  const base = withoutTrailingSlash(
    options?.baseURL ?? "http://localhost:11434",
  )!;
  const v1Base = (base.endsWith("/v1") ? base : `${base}/v1`) as string;
  const provider = createOpenAICompatible({
    name: "ollama",
    baseURL: v1Base,
    headers: options?.headers,
  });
  return (modelId: OllamaChatModelId) => provider(modelId);
}

/**
 * Check if Ollama is installed by attempting to connect to its API
 */
export function isOllamaInstalled(): boolean {
  try {
    // Simple synchronous check - Ollama runs on localhost:11434 by default
    // We can't do a real network check here synchronously, so we check for the process
    // This is a best-effort detection
    const { execSync } = require("node:child_process");
    
    // Check if ollama process is running
    const platform = process.platform;
    if (platform === "win32") {
      execSync('tasklist /FI "IMAGENAME eq ollama.exe"', { encoding: "utf8" });
      return true;
    } else {
      const result = execSync("pgrep -x ollama", { encoding: "utf8" });
      return result.trim().length > 0;
    }
  } catch {
    return false;
  }
}
