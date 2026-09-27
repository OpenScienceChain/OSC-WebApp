import { environment } from '../../environments/environment';

export interface RuntimeConfig {
  API_BASE_URL?: string;
  MOCK_PREVIEW?: boolean;
}

const RUNTIME_CONFIG_KEY = '__runtimeConfig';

export function getRuntimeConfig(): RuntimeConfig | null {
  return (window as any)[RUNTIME_CONFIG_KEY] ?? null;
}

export function setRuntimeConfig(config: RuntimeConfig): void {
  (window as any)[RUNTIME_CONFIG_KEY] = config;
}

export function getApiBaseUrl(): string {
  const config = getRuntimeConfig();
  return (config?.API_BASE_URL ?? environment.apiUrl).trim();
}

export async function loadRuntimeConfig(): Promise<void> {
  try {
    const response = await fetch('/assets/runtime-config.json', {
      cache: 'no-store',
    });
    if (!response.ok) return;
    const config = (await response.json()) as RuntimeConfig;
    if (config && config.API_BASE_URL) {
      setRuntimeConfig(config);
    }
  } catch {
    // Fall back to environment.apiUrl if the runtime config is missing.
  }
}
