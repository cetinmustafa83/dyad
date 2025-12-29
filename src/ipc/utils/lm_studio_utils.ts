export const LM_STUDIO_BASE_URL =
  process.env.LM_STUDIO_BASE_URL_FOR_TESTING || "http://localhost:1234";

/**
 * Check if LM Studio is installed by attempting to connect to its API
 */
export function isLmStudioInstalled(): boolean {
  try {
    // Simple synchronous check - LM Studio runs on localhost:1234 by default
    // We can't do a real network check here synchronously, so we check for the process
    // This is a best-effort detection
    const { execSync } = require("node:child_process");
    
    // Check if LM Studio process is running
    const platform = process.platform;
    if (platform === "win32") {
      execSync('tasklist /FI "IMAGENAME eq LM Studio.exe"', { encoding: "utf8" });
      return true;
    } else if (platform === "darwin") {
      const result = execSync('pgrep -f "LM Studio"', { encoding: "utf8" });
      return result.trim().length > 0;
    } else {
      const result = execSync('pgrep -f "lm-studio"', { encoding: "utf8" });
      return result.trim().length > 0;
    }
  } catch {
    return false;
  }
}
