import { ORCHESTRATION_PROTOCOL_HEADER } from "@cadro/contracts";

export const browserApiCorsAllowedMethods = ["GET", "POST", "OPTIONS"] as const;
export const browserApiCorsAllowedHeaders = [
  "authorization",
  "b3",
  "traceparent",
  "content-type",
  "dpop",
  ORCHESTRATION_PROTOCOL_HEADER,
] as const;
export const browserApiCorsExposeHeaders = ["www-authenticate", "dpop-nonce"] as const;

export const DESKTOP_RENDERER_ORIGINS = ["cadro://app", "cadro-dev://app"] as const;

export function isAllowedSelfHostOrigin(
  origin: string,
  configuredAllowedOrigins: ReadonlyArray<string>,
): boolean {
  if (configuredAllowedOrigins.includes(origin) || configuredAllowedOrigins.includes("*")) {
    return true;
  }

  const url = URL.parse(origin);
  if (url === null || url.origin !== origin) return false;

  return configuredAllowedOrigins.some((pattern) => {
    const [, scheme = "https", suffix] =
      /^(?:(https?):\/\/)?\*\.([a-z\d.-]+(?::\d+)?)$/i.exec(pattern) ?? [];
    return (
      suffix !== undefined &&
      url.protocol === `${scheme.toLowerCase()}:` &&
      url.host.endsWith(`.${suffix.toLowerCase()}`)
    );
  });
}

/** MCP refuses every browser Origin with 403, so the browser CORS layer must not answer for it. */
export const MCP_HTTP_PATH = "/mcp";
