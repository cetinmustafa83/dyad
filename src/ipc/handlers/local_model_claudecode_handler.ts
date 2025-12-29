import { ipcMain, dialog } from "electron";
import log from "electron-log";
import type { LocalModelListResponse, LocalModel } from "../ipc_types";
import {
  detectClaudeCodePath,
  isClaudeCodeInstalled,
  getClaudeCodeVersion,
  detectClaudeCodeCapabilities,
  setManualClaudeCodePath,
  installClaudeCode,
  updateClaudeCode,
  type ClaudeCodeCapabilities,
} from "../utils/claude_code_utils";

const logger = log.scope("claudecode_handler");

/**
 * Fetches available models from Claude Code
 * Note: Claude Code uses Anthropic models, so we return a predefined list
 */
export async function fetchClaudeCodeModels(): Promise<LocalModelListResponse> {
  if (!isClaudeCodeInstalled()) {
    throw new Error(
      "Claude Code is not installed. Please install Claude Code CLI first.",
    );
  }

  // Claude Code uses Anthropic's models
  // We'll provide a list of commonly available models
  const models: LocalModel[] = [
    {
      modelName: "claude-sonnet-4.5",
      displayName: "Claude Sonnet 4.5",
      provider: "claudecode",
    },
    {
      modelName: "claude-sonnet-4",
      displayName: "Claude Sonnet 4",
      provider: "claudecode",
    },
    {
      modelName: "claude-opus-4",
      displayName: "Claude Opus 4",
      provider: "claudecode",
    },
    {
      modelName: "claude-haiku-4",
      displayName: "Claude Haiku 4",
      provider: "claudecode",
    },
  ];

  logger.info(`Returning ${models.length} Claude Code models`);
  return { models };
}

/**
 * Checks if Claude Code is installed and returns installation info
 */
export interface ClaudeCodeInstallationInfo {
  installed: boolean;
  path: string | null;
  version: string | null;
}

export async function getClaudeCodeInstallationInfo(): Promise<ClaudeCodeInstallationInfo> {
  const path = detectClaudeCodePath();
  const installed = path !== null;
  const version = installed ? getClaudeCodeVersion() : null;

  return {
    installed,
    path,
    version,
  };
}

/**
 * Gets Claude Code capabilities (MCP servers, skills, plugins, agents)
 */
export async function getClaudeCodeCapabilities(): Promise<ClaudeCodeCapabilities | null> {
  return await detectClaudeCodeCapabilities();
}

/**
 * Opens a file dialog to select Claude Code executable
 */
export async function selectClaudeCodePath(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: "Select Claude Code Executable",
    properties: ["openFile"],
    filters: [
      { name: "Executable", extensions: ["*"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const selectedPath = result.filePaths[0];
  logger.info(`User selected Claude Code path: ${selectedPath}`);

  // Save the manual path
  setManualClaudeCodePath(selectedPath);

  return selectedPath;
}

/**
 * Install Claude Code via npm
 */
export interface InstallClaudeCodeParams {
  useSudo: boolean;
}

export async function handleInstallClaudeCode(
  params: InstallClaudeCodeParams,
): Promise<{ success: boolean; output: string; error?: string }> {
  logger.info(`Installing Claude Code (sudo: ${params.useSudo})...`);
  return await installClaudeCode(params.useSudo);
}

/**
 * Update Claude Code via clu update
 */
export async function handleUpdateClaudeCode(): Promise<{
  success: boolean;
  output: string;
  error?: string;
}> {
  logger.info("Updating Claude Code...");
  return await updateClaudeCode();
}

/**
 * Register all Claude Code related IPC handlers
 */
export function registerClaudeCodeHandlers() {
  ipcMain.handle(
    "local-models:list-claudecode",
    async (): Promise<LocalModelListResponse> => {
      return fetchClaudeCodeModels();
    },
  );

  ipcMain.handle(
    "claudecode:get-installation-info",
    async (): Promise<ClaudeCodeInstallationInfo> => {
      return getClaudeCodeInstallationInfo();
    },
  );

  ipcMain.handle(
    "claudecode:get-capabilities",
    async (): Promise<ClaudeCodeCapabilities | null> => {
      return getClaudeCodeCapabilities();
    },
  );

  ipcMain.handle(
    "claudecode:select-path",
    async (): Promise<string | null> => {
      return selectClaudeCodePath();
    },
  );

  ipcMain.handle(
    "claudecode:install",
    async (
      _event,
      params: InstallClaudeCodeParams,
    ): Promise<{ success: boolean; output: string; error?: string }> => {
      return handleInstallClaudeCode(params);
    },
  );

  ipcMain.handle(
    "claudecode:update",
    async (): Promise<{ success: boolean; output: string; error?: string }> => {
      return handleUpdateClaudeCode();
    },
  );
}

