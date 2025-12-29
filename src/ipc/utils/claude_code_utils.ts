import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";
import log from "electron-log";

const logger = log.scope("claude_code_utils");

export const CLAUDE_CODE_DEFAULT_PORT = 3000;

/**
 * Manually set Claude Code path (stored in memory)
 */
let manualClaudeCodePath: string | null = null;

/**
 * Possible installation paths for Claude Code CLI
 */
const CLAUDE_CODE_PATHS = {
  darwin: [
    join(homedir(), ".claude/claude"),
    join(homedir(), ".claude/bin/claude"),
    "/usr/local/bin/claude",
    join(homedir(), ".local/bin/claude"),
    join(homedir(), "bin/claude"),
  ],
  linux: [
    join(homedir(), ".claude/claude"),
    join(homedir(), ".claude/bin/claude"),
    "/usr/local/bin/claude",
    join(homedir(), ".local/bin/claude"),
    join(homedir(), "bin/claude"),
  ],
  win32: [
    // WSL paths for Windows
    "C:\\Windows\\System32\\wsl.exe",
  ],
};

/**
 * Sets the manual Claude Code path
 */
export function setManualClaudeCodePath(path: string | null): void {
  manualClaudeCodePath = path;
  if (path) {
    logger.info(`Manual Claude Code path set to: ${path}`);
  } else {
    logger.info("Manual Claude Code path cleared");
  }
}

/**
 * Gets the manual Claude Code path
 */
export function getManualClaudeCodePath(): string | null {
  return manualClaudeCodePath;
}

/**
 * Detects if Claude Code is installed and returns its path
 * Priority: 1. Manual path, 2. Auto-detected paths, 3. which command
 */
export function detectClaudeCodePath(): string | null {
  // First, check if manual path is set
  if (manualClaudeCodePath && existsSync(manualClaudeCodePath)) {
    logger.info(`Using manual Claude Code path: ${manualClaudeCodePath}`);
    return manualClaudeCodePath;
  }

  const currentPlatform = platform();

  // Windows is not officially supported, but we can check for WSL
  if (currentPlatform === "win32") {
    logger.warn("Claude Code is not officially supported on Windows. WSL support is experimental.");
    return null;
  }

  const paths = CLAUDE_CODE_PATHS[currentPlatform as keyof typeof CLAUDE_CODE_PATHS] || [];

  // Check each possible path
  for (const path of paths) {
    if (existsSync(path)) {
      logger.info(`Found Claude Code at: ${path}`);
      return path;
    }
  }

  // Try to find using 'which' command
  try {
    const whichResult = execSync("which claude", { encoding: "utf-8" }).trim();
    if (whichResult && existsSync(whichResult)) {
      logger.info(`Found Claude Code using 'which': ${whichResult}`);
      return whichResult;
    }
  } catch (error) {
    logger.debug("Could not find Claude Code using 'which' command");
  }

  logger.warn("Claude Code CLI not found in any standard location");
  return null;
}

/**
 * Checks if Claude Code is installed
 */
export function isClaudeCodeInstalled(): boolean {
  return detectClaudeCodePath() !== null;
}

/**
 * Gets the base URL for Claude Code API
 * Claude Code typically runs a local server when active
 */
export function getClaudeCodeBaseUrl(): string {
  const port = process.env.CLAUDE_CODE_PORT || CLAUDE_CODE_DEFAULT_PORT;
  return `http://localhost:${port}`;
}

/**
 * Gets Claude Code version
 */
export function getClaudeCodeVersion(): string | null {
  const claudePath = detectClaudeCodePath();
  if (!claudePath) {
    return null;
  }

  try {
    const version = execSync(`"${claudePath}" --version`, { encoding: "utf-8" }).trim();
    logger.info(`Claude Code version: ${version}`);
    return version;
  } catch (error) {
    logger.error("Failed to get Claude Code version:", error);
    return null;
  }
}

/**
 * Installs Claude Code via npm
 * @param useSudo Whether to use sudo for installation
 * @returns Installation output
 */
export async function installClaudeCode(useSudo = false): Promise<{
  success: boolean;
  output: string;
  error?: string;
}> {
  try {
    const installCommand = useSudo
      ? "sudo npm install -g @anthropic-ai/claude-code"
      : "npm install -g @anthropic-ai/claude-code";

    logger.info(`Installing Claude Code: ${installCommand}`);

    const output = execSync(installCommand, {
      encoding: "utf-8",
      stdio: "pipe",
    });

    logger.info("Claude Code installed successfully");
    return {
      success: true,
      output: output.trim(),
    };
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    logger.error("Failed to install Claude Code:", errorMessage);

    // Check if it's a permission error
    if (errorMessage.includes("EACCES") || errorMessage.includes("permission denied")) {
      return {
        success: false,
        output: "",
        error: "Permission denied. Please try again with sudo (requires password).",
      };
    }

    return {
      success: false,
      output: "",
      error: errorMessage,
    };
  }
}

/**
 * Updates Claude Code using clu update command
 * @returns Update result
 */
export async function updateClaudeCode(): Promise<{
  success: boolean;
  output: string;
  error?: string;
}> {
  const claudePath = detectClaudeCodePath();
  if (!claudePath) {
    return {
      success: false,
      output: "",
      error: "Claude Code is not installed",
    };
  }

  try {
    logger.info("Updating Claude Code via clu update...");

    const output = execSync("clu update", {
      encoding: "utf-8",
      stdio: "pipe",
    });

    logger.info("Claude Code updated successfully");
    return {
      success: true,
      output: output.trim(),
    };
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    logger.error("Failed to update Claude Code:", errorMessage);

    return {
      success: false,
      output: "",
      error: errorMessage,
    };
  }
}

/**
 * Interface for Claude Code capabilities
 */
export interface ClaudeCodeCapabilities {
  mcpServers: string[];
  skills: string[];
  plugins: string[];
  agents: string[];
  subAgents: string[];
  models: string[];
}

/**
 * Lists directories in a given path
 */
function listDirectories(dirPath: string): string[] {
  try {
    if (!existsSync(dirPath)) {
      return [];
    }
    return readdirSync(dirPath).filter((item) => {
      try {
        return statSync(join(dirPath, item)).isDirectory();
      } catch {
        return false;
      }
    });
  } catch (error) {
    logger.error(`Failed to list directories in ${dirPath}:`, error);
    return [];
  }
}

/**
 * Interface for Claude Code settings
 */
export interface ClaudeCodeSettings {
  env?: {
    ANTHROPIC_AUTH_TOKEN?: string;
    ANTHROPIC_BASE_URL?: string;
    API_TIMEOUT_MS?: string;
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC?: number;
    [key: string]: string | number | undefined;
  };
  models?: string[];
  mcpServers?: any;
  [key: string]: any;
}

/**
 * Reads Claude Code settings file
 */
function readClaudeCodeSettings(): ClaudeCodeSettings | null {
  try {
    const settingsPath = join(homedir(), ".claude", "settings.json");
    
    if (existsSync(settingsPath)) {
      const settingsContent = readFileSync(settingsPath, "utf-8");
      logger.info(`✓ Found Claude Code settings at: ${settingsPath}`);
      return JSON.parse(settingsContent);
    }

    logger.warn("Claude Code settings.json not found");
    return null;
  } catch (error) {
    logger.error("Failed to read Claude Code settings:", error);
    return null;
  }
}

/**
 * Reads Claude Code settings file (exported version)
 */
export function getClaudeCodeSettings(): ClaudeCodeSettings | null {
  return readClaudeCodeSettings();
}

/**
 * Detects Claude Code capabilities by scanning directories and settings
 * Claude Code stores capabilities as directories in ~/.claude/
 */
export async function detectClaudeCodeCapabilities(): Promise<ClaudeCodeCapabilities | null> {
  const claudePath = detectClaudeCodePath();
  if (!claudePath) {
    return null;
  }

  try {
    logger.info("Detecting Claude Code capabilities from ~/.claude directory...");

    const claudeDir = join(homedir(), ".claude");
    
    // Check if .claude directory exists
    if (!existsSync(claudeDir)) {
      logger.warn("~/.claude directory not found");
      return null;
    }

    const capabilities: ClaudeCodeCapabilities = {
      mcpServers: [],
      skills: [],
      plugins: [],
      agents: [],
      subAgents: [],
      models: [],
    };

    // Detect agents from ~/.claude/agents directory
    const agentsDir = join(claudeDir, "agents");
    if (existsSync(agentsDir)) {
      capabilities.agents = listDirectories(agentsDir);
      logger.info(`Found ${capabilities.agents.length} agents:`, capabilities.agents);
    }

    // Detect plugins from ~/.claude/plugins directory
    const pluginsDir = join(claudeDir, "plugins");
    if (existsSync(pluginsDir)) {
      capabilities.plugins = listDirectories(pluginsDir);
      logger.info(`Found ${capabilities.plugins.length} plugins:`, capabilities.plugins);
    }

    // Read settings.json for additional info (API keys, models, etc.)
    const settings = readClaudeCodeSettings();
    if (settings) {
      // Extract any model information from settings
      if (settings.models && Array.isArray(settings.models)) {
        capabilities.models = settings.models;
      }
      
      // Check for MCP server configurations in settings
      if (settings.mcpServers) {
        capabilities.mcpServers = Array.isArray(settings.mcpServers)
          ? settings.mcpServers
          : Object.keys(settings.mcpServers);
      }
    }

    logger.info("Detected capabilities summary:", {
      agents: capabilities.agents.length,
      plugins: capabilities.plugins.length,
      mcpServers: capabilities.mcpServers.length,
      models: capabilities.models.length,
    });

    return capabilities;
  } catch (error) {
    logger.error("Failed to detect Claude Code capabilities:", error);
    return null;
  }
}

