import { List, ActionPanel, Action, Icon, openExtensionPreferences, getPreferenceValues } from "@raycast/api";
import { providers } from "./providers";
import { useState, useEffect } from "react";

interface ExtensionPreferences {
  colorCoding: boolean;
  codexEnabled: boolean;
}

interface ProviderStatus {
  id: string;
  name: string;
  icon: string;
  description: string;
  configured: boolean;
  enabled: boolean;
}

export default function ManageProvidersCommand() {
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStatuses() {
      const prefs = getPreferenceValues<ExtensionPreferences>();
      const statuses: ProviderStatus[] = [];

      for (const provider of providers) {
        const configured = await provider.isConfigured();
        statuses.push({
          id: provider.id,
          name: provider.name,
          icon: provider.icon,
          description: provider.description,
          configured,
          enabled: prefs.codexEnabled ?? true,
        });
      }

      setProviderStatuses(statuses);
      setIsLoading(false);
    }

    loadStatuses();
  }, []);

  return (
    <List isLoading={isLoading} navigationTitle="Manage Providers">
      <List.Section title="Providers" subtitle={`${providerStatuses.length} configured`}>
        {providerStatuses.map((provider) => (
          <List.Item
            key={provider.id}
            title={provider.name}
            subtitle={provider.description}
            icon={provider.configured ? Icon.CheckCircle : Icon.XMarkCircle}
            accessories={[
              { text: provider.configured ? "Configured" : "Not configured" },
              { icon: provider.enabled ? Icon.Eye : Icon.EyeDisabled },
            ]}
            actions={
              <ActionPanel>
                <Action title="Open Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={() => {
                    setIsLoading(true);
                    // Trigger re-render
                    setTimeout(() => setIsLoading(false), 100);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Settings">
        <List.Item
          title="Open Extension Preferences"
          icon={Icon.Gear}
          actions={
            <ActionPanel>
              <Action title="Open Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
