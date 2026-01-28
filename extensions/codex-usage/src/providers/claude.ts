import { homedir } from "os";
import { join } from "path";
import * as fs from "fs";
import { Provider, UsageData } from "./types";

interface ClaudeConfig {
  apiKey?: string;
  enabled?: boolean;
}

interface ClaudeUsageData extends UsageData {
  requestsToday: number;
  requestsLimit: number;
}

/**
 * Claude Code provider - tracks usage from Anthropic's Claude CLI
 *
 * Note: Claude Code currently does not expose a public API for usage tracking.
 * This is a placeholder implementation that will be expanded when such API becomes available.
 */
export class ClaudeProvider implements Provider {
  id = "claude";
  name = "Claude Code";
  icon = "🧠";
  description = "Anthropic Claude Code CLI usage (coming soon)";

  private config: ClaudeConfig | null = null;

  async isConfigured(): Promise<boolean> {
    // Check for Claude Code installation
    // Claude stores config in ~/.claude/settings.json or similar
    const paths = [
      join(homedir(), ".claude", "settings.json"),
      join(homedir(), ".anthropic", "claude.json"),
      join(homedir(), ".config", "claude", "config.json"),
    ];

    for (const configPath of paths) {
      try {
        if (fs.existsSync(configPath)) {
          const content = fs.readFileSync(configPath, "utf-8");
          this.config = JSON.parse(content) as ClaudeConfig;
          return true;
        }
      } catch {
        // Continue checking other paths
      }
    }

    return false;
  }

  async fetchUsage(): Promise<ClaudeUsageData> {
    // Placeholder: Claude does not currently expose usage API
    // This will be implemented when Anthropic adds usage tracking

    return {
      used: 0,
      limit: 0,
      remaining: 0,
      percentUsed: 0,
      plan: "Claude Code",
      requestsToday: 0,
      requestsLimit: 0,
    };
  }

  getSetupInstructions(): string {
    return "Claude Code usage tracking is coming soon. Install Claude Code from https://claude.ai/code";
  }
}

export const claudeProvider = new ClaudeProvider();
export type { ClaudeUsageData };
