import { useCallback } from "react";
import { useAtom } from "jotai";
import { atom } from "jotai";
import { IpcClient } from "@/ipc/ipc_client";
import type { LocalModel } from "@/ipc/ipc_types";

// Atoms for Claude Code models state
export const claudeCodeModelsAtom = atom<LocalModel[]>([]);
export const claudeCodeModelsLoadingAtom = atom<boolean>(false);
export const claudeCodeModelsErrorAtom = atom<Error | null>(null);

// Atoms for Claude Code installation info
export const claudeCodeInstallationAtom = atom<{
  installed: boolean;
  path: string | null;
  version: string | null;
} | null>(null);

// Atoms for Claude Code capabilities
export const claudeCodeCapabilitiesAtom = atom<{
  mcpServers: string[];
  skills: string[];
  plugins: string[];
  agents: string[];
  subAgents: string[];
  models: string[];
} | null>(null);

export function useClaudeCodeModels() {
  const [models, setModels] = useAtom(claudeCodeModelsAtom);
  const [loading, setLoading] = useAtom(claudeCodeModelsLoadingAtom);
  const [error, setError] = useAtom(claudeCodeModelsErrorAtom);
  const [installation, setInstallation] = useAtom(claudeCodeInstallationAtom);
  const [capabilities, setCapabilities] = useAtom(claudeCodeCapabilitiesAtom);

  const ipcClient = IpcClient.getInstance();

  /**
   * Load local models from Claude Code
   */
  const loadModels = useCallback(async () => {
    setLoading(true);
    try {
      const modelList = await ipcClient.listLocalClaudeCodeModels();
      setModels(modelList);
      setError(null);

      return modelList;
    } catch (error) {
      console.error("Error loading Claude Code models:", error);
      setError(error instanceof Error ? error : new Error(String(error)));
      return [];
    } finally {
      setLoading(false);
    }
  }, [ipcClient, setModels, setError, setLoading]);

  /**
   * Check Claude Code installation
   */
  const checkInstallation = useCallback(async () => {
    try {
      const info = await ipcClient.getClaudeCodeInstallationInfo();
      setInstallation(info);
      return info;
    } catch (error) {
      console.error("Error checking Claude Code installation:", error);
      setInstallation({ installed: false, path: null, version: null });
      return { installed: false, path: null, version: null };
    }
  }, [ipcClient, setInstallation]);

  /**
   * Load Claude Code capabilities
   */
  const loadCapabilities = useCallback(async () => {
    try {
      const caps = await ipcClient.getClaudeCodeCapabilities();
      setCapabilities(caps);
      return caps;
    } catch (error) {
      console.error("Error loading Claude Code capabilities:", error);
      setCapabilities(null);
      return null;
    }
  }, [ipcClient, setCapabilities]);

  /**
   * Open file dialog to select Claude Code path
   */
  const selectPath = useCallback(async () => {
    try {
      const selectedPath = await ipcClient.selectClaudeCodePath();
      if (selectedPath) {
        // Refresh installation info after path selection
        await checkInstallation();
        await loadCapabilities();
      }
      return selectedPath;
    } catch (error) {
      console.error("Error selecting Claude Code path:", error);
      return null;
    }
  }, [ipcClient, checkInstallation, loadCapabilities]);

  /**
   * Install Claude Code via npm
   */
  const installClaudeCode = useCallback(
    async (useSudo = false) => {
      try {
        const result = await ipcClient.installClaudeCode({ useSudo });
        if (result.success) {
          // Refresh installation info after successful install
          await checkInstallation();
          await loadCapabilities();
        }
        return result;
      } catch (error) {
        console.error("Error installing Claude Code:", error);
        return {
          success: false,
          output: "",
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    [ipcClient, checkInstallation, loadCapabilities]
  );

  /**
   * Update Claude Code via clu update
   */
  const updateClaudeCode = useCallback(async () => {
    try {
      const result = await ipcClient.updateClaudeCode();
      if (result.success) {
        // Refresh installation info after successful update
        await checkInstallation();
        await loadCapabilities();
      }
      return result;
    } catch (error) {
      console.error("Error updating Claude Code:", error);
      return {
        success: false,
        output: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }, [ipcClient, checkInstallation, loadCapabilities]);

  return {
    models,
    loading,
    error,
    installation,
    capabilities,
    loadModels,
    checkInstallation,
    loadCapabilities,
    selectPath,
    installClaudeCode,
    updateClaudeCode,
  };
}

