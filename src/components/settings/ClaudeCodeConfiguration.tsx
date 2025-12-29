import { useEffect, useState } from "react";
import { useClaudeCodeModels } from "@/hooks/useClaudeCodeModels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Info, Zap, FolderOpen, Download, ArrowUpCircle } from "lucide-react";
import { toast } from "@/lib/toast";

export function ClaudeCodeConfiguration() {
  const {
    installation,
    capabilities,
    loading,
    checkInstallation,
    loadCapabilities,
    selectPath,
    installClaudeCode,
    updateClaudeCode,
  } = useClaudeCodeModels();

  const [isSelecting, setIsSelecting] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    checkInstallation();
    loadCapabilities();
  }, [checkInstallation, loadCapabilities]);

  const handleRefresh = async () => {
    await checkInstallation();
    await loadCapabilities();
  };

  const handleSelectPath = async () => {
    setIsSelecting(true);
    try {
      const path = await selectPath();
      if (path) {
        toast({
          title: "Path selected",
          description: "Claude Code path has been set successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to select path",
        variant: "destructive",
      });
    } finally {
      setIsSelecting(false);
    }
  };

  const handleInstall = async (useSudo = false) => {
    setIsInstalling(true);
    try {
      const result = await installClaudeCode(useSudo);
      if (result.success) {
        toast({
          title: "Installation successful",
          description: "Claude Code has been installed successfully.",
        });
      } else {
        // If permission error and not using sudo, suggest sudo
        if (result.error?.includes("EACCES") && !useSudo) {
          toast({
            title: "Permission denied",
            description: "Installation requires administrator privileges. Try with sudo?",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Installation failed",
            description: result.error || "Failed to install Claude Code",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Installation error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsInstalling(false);
    }
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const result = await updateClaudeCode();
      if (result.success) {
        toast({
          title: "Update successful",
          description: "Claude Code has been updated successfully.",
        });
      } else {
        toast({
          title: "Update failed",
          description: result.error || "Failed to update Claude Code",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Update error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Claude Code is an all-in-one provider.</strong> Configure your API keys (Claude API or GLM API)
          directly in Claude Code. This integration leverages Claude Code's context, agents, skills, and plugins
          to enhance your development workflow.
        </AlertDescription>
      </Alert>

      {/* Installation Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Claude Code Status
              </CardTitle>
              <CardDescription>
                All-in-one AI provider with context, agents, skills, and plugins
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            {installation?.installed ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-medium">Claude Code is installed</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="font-medium">Claude Code is not installed</span>
              </>
            )}
          </div>

          {installation?.installed && (
            <div className="space-y-2 text-sm">
              {installation.path && (
                <div>
                  <span className="text-muted-foreground">Path: </span>
                  <code className="bg-muted px-2 py-1 rounded">{installation.path}</code>
                </div>
              )}
              {installation.version && (
                <div>
                  <span className="text-muted-foreground">Version: </span>
                  <code className="bg-muted px-2 py-1 rounded">{installation.version}</code>
                </div>
              )}
            </div>
          )}

          {!installation?.installed && (
            <div className="text-sm space-y-3">
              <p className="text-muted-foreground">Claude Code CLI is not detected on your system.</p>

              <div className="bg-muted/50 p-3 rounded-md space-y-2">
                <p className="font-medium">Installation Options:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>
                    Use the install button below to install via npm
                  </li>
                  <li>
                    Or install manually from{" "}
                    <a
                      href="https://code.claude.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      code.claude.com
                    </a>
                  </li>
                  <li>Configure your API keys in Claude Code (Claude API or GLM API)</li>
                  <li>Click refresh to detect the installation</li>
                </ol>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleInstall(false)}
                  disabled={isInstalling}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {isInstalling ? "Installing..." : "Install Claude Code"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleInstall(true)}
                  disabled={isInstalling}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {isInstalling ? "Installing..." : "Install with Sudo"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectPath}
                  disabled={isSelecting}
                  className="flex items-center gap-2"
                >
                  <FolderOpen className="h-4 w-4" />
                  {isSelecting ? "Selecting..." : "Select Path Manually"}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                <strong>Platform Support:</strong> macOS and Linux only (Windows via WSL experimental)
              </p>
            </div>
          )}

          {installation?.installed && (
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                <ArrowUpCircle className="h-4 w-4" />
                {isUpdating ? "Updating..." : "Update Claude Code"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Capabilities */}
      {installation?.installed && (
        <Card>
          <CardHeader>
            <CardTitle>Available Capabilities</CardTitle>
            <CardDescription>
              Claude Code's context, agents, skills, and plugins will be automatically available
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {capabilities && (
              <>
                {capabilities.mcpServers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <span className="text-blue-500">●</span> MCP Servers
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {capabilities.mcpServers.map((server) => (
                        <Badge key={server} variant="secondary">
                          {server}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {capabilities.skills.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <span className="text-green-500">●</span> Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {capabilities.skills.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {capabilities.plugins.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <span className="text-purple-500">●</span> Plugins
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {capabilities.plugins.map((plugin) => (
                        <Badge key={plugin} variant="secondary">
                          {plugin}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {capabilities.agents.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <span className="text-orange-500">●</span> Agents
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {capabilities.agents.map((agent) => (
                        <Badge key={agent} variant="secondary">
                          {agent}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {capabilities.subAgents.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <span className="text-pink-500">●</span> Sub-Agents
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {capabilities.subAgents.map((subAgent) => (
                        <Badge key={subAgent} variant="secondary">
                          {subAgent}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show message if no capabilities detected */}
                {capabilities.mcpServers.length === 0 &&
                  capabilities.skills.length === 0 &&
                  capabilities.plugins.length === 0 &&
                  capabilities.agents.length === 0 &&
                  capabilities.subAgents.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No capabilities detected yet. Configure Claude Code and refresh to see available features.
                    </div>
                  )}
              </>
            )}

            {!capabilities && (
              <div className="text-sm text-muted-foreground text-center py-4">
                Loading capabilities...
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

