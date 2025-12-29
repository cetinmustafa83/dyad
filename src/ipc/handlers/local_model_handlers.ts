import { registerOllamaHandlers } from "./local_model_ollama_handler";
import { registerLMStudioHandlers } from "./local_model_lmstudio_handler";
import { registerClaudeCodeHandlers } from "./local_model_claudecode_handler";

export function registerLocalModelHandlers() {
  registerOllamaHandlers();
  registerLMStudioHandlers();
  registerClaudeCodeHandlers();
}
