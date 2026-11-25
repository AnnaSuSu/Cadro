const ASSET_DIRECTORY = "assets/cadro";

export const BRAND_ASSET_PATHS = {
  svg: `${ASSET_DIRECTORY}/icon.svg`,
  png1024: `${ASSET_DIRECTORY}/icon-1024.png`,
  png512: `${ASSET_DIRECTORY}/icon-512.png`,
  png256: `${ASSET_DIRECTORY}/icon-256.png`,
  icns: `${ASSET_DIRECTORY}/icon.icns`,
  ico: `${ASSET_DIRECTORY}/icon.ico`,
} as const;

export const WEB_BRAND_ASSETS = [
  { target: "favicon.svg", source: BRAND_ASSET_PATHS.svg },
  { target: "favicon.ico", source: BRAND_ASSET_PATHS.ico },
  { target: "favicon-16x16.png", source: `${ASSET_DIRECTORY}/icon-16.png`, size: 16 },
  { target: "favicon-32x32.png", source: `${ASSET_DIRECTORY}/icon-32.png`, size: 32 },
  { target: "apple-touch-icon.png", source: `${ASSET_DIRECTORY}/icon-180.png`, size: 180 },
  { target: "icon-192x192.png", source: `${ASSET_DIRECTORY}/icon-192.png`, size: 192 },
  { target: "icon-512x512.png", source: BRAND_ASSET_PATHS.png512 },
] as const;

export type WebAssetBrand = "development" | "nightly" | "production";

export const WEB_ASSET_CHANNELS = ["latest", "nightly"] as const;

export type WebAssetChannel = (typeof WEB_ASSET_CHANNELS)[number];

export function resolveWebAssetBrandForChannel(channel: WebAssetChannel): WebAssetBrand {
  return channel === "nightly" ? "nightly" : "production";
}
