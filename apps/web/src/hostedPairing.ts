import { PRIMARY_LOCAL_ENVIRONMENT_ID } from "@cadro/contracts";
import { getPairingTokenFromUrl, setPairingTokenOnUrl } from "@cadro/shared/remote";

export interface HostedPairingRequest {
  readonly host: string;
  readonly token: string;
  readonly label: string;
}

export type HostedAppChannel = "latest" | "nightly";

export function configuredHostedAppUrl(): string {
  const configured = import.meta.env.VITE_HOSTED_APP_URL?.trim();
  if (configured) return configured;
  const local = window.desktopBridge
    ?.getLocalEnvironmentBootstraps()
    .find((environment) => environment.id === PRIMARY_LOCAL_ENVIRONMENT_ID);
  return local?.httpBaseUrl ?? window.location.href;
}

function configuredBackendUrl(): string {
  return import.meta.env.VITE_HTTP_URL?.trim() || import.meta.env.VITE_WS_URL?.trim() || "";
}

function configuredHostedAppChannel(): HostedAppChannel | null {
  const channel = import.meta.env.VITE_HOSTED_APP_CHANNEL?.trim().toLowerCase();
  return channel === "latest" || channel === "nightly" ? channel : null;
}

function originFromUrl(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isHostedStaticApp(url?: URL): boolean {
  if (configuredBackendUrl()) {
    return false;
  }

  if (import.meta.env.VITE_CADRO_STATIC_WEB === "1" || configuredHostedAppChannel()) {
    return true;
  }

  if (url === undefined && (typeof window === "undefined" || window.location === undefined)) {
    return false;
  }

  const currentUrl = url ?? new URL(window.location.href);
  if (currentUrl.hostname.endsWith(".pages.dev")) {
    return true;
  }

  const hostedOrigin = originFromUrl(import.meta.env.VITE_HOSTED_APP_URL?.trim() ?? "");
  return hostedOrigin !== null && currentUrl.origin === hostedOrigin;
}

export function readHostedPairingRequest(url: URL = new URL(window.location.href)) {
  const host = url.searchParams.get("host")?.trim() ?? "";
  const token = getPairingTokenFromUrl(url)?.trim() ?? "";
  const label = url.searchParams.get("label")?.trim() ?? "";

  if (!host || !token) {
    return null;
  }

  return {
    host,
    token,
    label,
  } satisfies HostedPairingRequest;
}

export function hasHostedPairingRequest(url: URL = new URL(window.location.href)): boolean {
  return readHostedPairingRequest(url) !== null;
}

export function buildHostedPairingUrl(input: {
  readonly host: string;
  readonly token: string;
  readonly label?: string | null;
}): string {
  const url = new URL("/pair", import.meta.env.VITE_HOSTED_APP_URL?.trim() || input.host);
  url.searchParams.set("host", input.host);

  const label = input.label?.trim();
  if (label) {
    url.searchParams.set("label", label);
  }

  return setPairingTokenOnUrl(url, input.token).toString();
}
