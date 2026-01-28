import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  openExtensionPreferences,
  getPreferenceValues,
  Color,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { codexProvider, CodexUsageData } from "./providers";

function getProgressIcon(percent: number, colorCoding: boolean): { source: Icon; tintColor?: Color } {
  if (!colorCoding) {
    return { source: Icon.Circle };
  }
  if (percent >= 90) return { source: Icon.CircleFilled, tintColor: Color.Red };
  if (percent >= 75) return { source: Icon.CircleFilled, tintColor: Color.Orange };
  if (percent >= 50) return { source: Icon.CircleFilled, tintColor: Color.Yellow };
  return { source: Icon.CircleFilled, tintColor: Color.Green };
}

function getProgressText(percent: number, colorCoding: boolean): string {
  if (!colorCoding) {
    return `${Math.round(percent)}%`;
  }
  // Return text with emoji indicators when color coding is enabled
  if (percent >= 90) return `🔴 ${Math.round(percent)}%`;
  if (percent >= 75) return `🟠 ${Math.round(percent)}%`;
  if (percent >= 50) return `🟡 ${Math.round(percent)}%`;
  return `🟢 ${Math.round(percent)}%`;
}

function formatPercent(percent: number): string {
  return `${Math.round(percent)}%`;
}

function formatResetTime(timestamp?: number): string {
  if (!timestamp) return "";
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours < 1) return `${diffMinutes}m`;
  if (diffHours < 24) return `${diffHours}h ${diffMinutes}m`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ${diffHours % 24}h`;
}

interface Preferences {
  colorCoding: boolean;
  codexEnabled: boolean;
}

export default function Command() {
  const [usage, setUsage] = useState<CodexUsageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [colorCoding, setColorCoding] = useState(true);

  const loadUsage = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const prefs = getPreferenceValues<Preferences>();
    setColorCoding(prefs.colorCoding ?? true);

    if (!(prefs.codexEnabled ?? true)) {
      setError("Codex is disabled in preferences");
      setIsLoading(false);
      return;
    }

    const configured = await codexProvider.isConfigured();
    setIsConfigured(configured);

    if (!configured) {
      setError("Codex CLI not authenticated. Run 'codex login' in terminal.");
      setIsLoading(false);
      return;
    }

    try {
      const data = await codexProvider.fetchUsage();
      setUsage(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch usage");
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  const refresh = useCallback(async () => {
    await showToast({ style: Toast.Style.Animated, title: "Refreshing..." });
    await loadUsage();
    await showToast({ style: Toast.Style.Success, title: "Refreshed" });
  }, [loadUsage]);

  if (!isConfigured || error) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          title={error || "Not Configured"}
          description="Check terminal: codex login"
          icon={Icon.XMarkCircle}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
              <Action title="Open Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Build navigation title with plan and status
  const planName = usage?.plan || "Codex";

  let mainTitle: string;
  if (usage?.limitReached) {
    mainTitle = `${planName} • LIMIT REACHED`;
  } else if (usage) {
    mainTitle = `${planName} • ${formatPercent(usage.percentUsed)}`;
  } else {
    mainTitle = "Codex";
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={mainTitle}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={refresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action title="Open Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
        </ActionPanel>
      }
    >
      {usage && (
        <>
          {/* Status Overview */}
          {usage.limitReached && (
            <List.Item
              title="Status"
              subtitle="Rate limit reached"
              icon={{ source: Icon.Warning, tintColor: Color.Red }}
              accessories={[{ text: "Requests blocked until reset" }]}
            />
          )}

          {/* 5-Hour Session */}
          <List.Section title="5-Hour Session">
            <List.Item
              title="Usage"
              subtitle={`${usage.used} / ${usage.limit} requests`}
              icon={getProgressIcon(usage.percentUsed, colorCoding)}
              accessories={[
                {
                  text: usage.limitReached ? "BLOCKED" : getProgressText(usage.percentUsed, colorCoding),
                  tooltip: "Percentage used",
                },
              ]}
            />
            <List.Item
              title="Resets in"
              subtitle={formatResetTime(usage.resetDate ? new Date(usage.resetDate).getTime() / 1000 : undefined)}
              icon={Icon.Clock}
            />
          </List.Section>

          {/* Weekly Limit */}
          <List.Section title="Weekly Limit">
            <List.Item
              title="Usage"
              subtitle={`${usage.weeklyUsed} / ${usage.weeklyLimit} requests`}
              icon={getProgressIcon(usage.weeklyPercentUsed, colorCoding)}
              accessories={[{ text: getProgressText(usage.weeklyPercentUsed, colorCoding) }]}
            />
            <List.Item
              title="Resets in"
              subtitle={usage.weeklyResetAt ? formatResetTime(usage.weeklyResetAt) : ""}
              icon={Icon.Calendar}
            />
          </List.Section>

          {/* Credits */}
          {usage.credits > 0 && (
            <List.Section title="Credits">
              <List.Item
                title="Balance"
                subtitle={`${usage.credits} credits`}
                icon={Icon.Coin}
                accessories={[{ text: "Available for use" }]}
              />
            </List.Section>
          )}

          {/* Plan Info */}
          <List.Section title="Account">
            <List.Item title="Plan" subtitle={usage.plan} icon={Icon.Star} />
          </List.Section>
        </>
      )}
    </List>
  );
}
