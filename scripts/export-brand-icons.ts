#!/usr/bin/env node

import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import { Command, Flag } from "effect/cli";
import sharp from "sharp";

import { BRAND_ASSET_PATHS, WEB_BRAND_ASSETS } from "./lib/brand-assets.ts";
import { encodePngIco, WINDOWS_ICON_SIZES } from "./lib/icon-export.ts";

const ICNS_RENDITIONS = [
  ["icp4", 16],
  ["icp5", 32],
  ["icp6", 64],
  ["ic07", 128],
  ["ic08", 256],
  ["ic09", 512],
  ["ic10", 1024],
  ["ic11", 32],
  ["ic12", 64],
  ["ic13", 256],
  ["ic14", 512],
] as const;

function encodePngIcns(render: (size: number) => Buffer): Buffer {
  const chunks = ICNS_RENDITIONS.map(([type, size]) => {
    const png = render(size);
    const header = Buffer.alloc(8);
    header.write(type, 0, "ascii");
    header.writeUInt32BE(header.length + png.length, 4);
    return Buffer.concat([header, png]);
  });
  const header = Buffer.alloc(8);
  header.write("icns", 0, "ascii");
  header.writeUInt32BE(header.length + chunks.reduce((sum, chunk) => sum + chunk.length, 0), 4);
  return Buffer.concat([header, ...chunks]);
}

class IconRenderError extends Schema.TaggedError<IconRenderError>()("IconRenderError", {
  size: Schema.Int,
  cause: Schema.Defect(),
}) {}

class StaleBrandIconsError extends Schema.TaggedError<StaleBrandIconsError>()(
  "StaleBrandIconsError",
  { paths: Schema.Array(Schema.String) },
) {
  override get message() {
    return `Run pnpm icons:export to regenerate ${this.paths.join(", ")}.`;
  }
}

export const exportBrandIcons = Effect.fn("exportBrandIcons")(function* (checkOnly: boolean) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const repoRoot = yield* path.fromFileUrl(new URL("..", import.meta.url));
  const svg = yield* fs.readFile(path.join(repoRoot, BRAND_ASSET_PATHS.svg));
  const pngOutputs = [
    { source: BRAND_ASSET_PATHS.png1024, size: 1024 },
    { source: BRAND_ASSET_PATHS.png512, size: 512 },
    { source: BRAND_ASSET_PATHS.png256, size: 256 },
    ...WEB_BRAND_ASSETS.filter((asset) => "size" in asset),
  ];
  const sizes = new Set([
    ...pngOutputs.map(({ size }) => size),
    ...ICNS_RENDITIONS.map(([, size]) => size),
    ...WINDOWS_ICON_SIZES,
  ]);
  const renditions = new Map(
    yield* Effect.forEach(sizes, (size) =>
      Effect.tryPromise({
        try: async () => [size, await sharp(svg).resize(size, size).png().toBuffer()] as const,
        catch: (cause) => new IconRenderError({ size, cause }),
      }),
    ),
  );
  const render = (size: number) => renditions.get(size)!;
  const generated = [
    ...pngOutputs.map(({ source, size }) => [source, render(size)] as const),
    [BRAND_ASSET_PATHS.icns, encodePngIcns(render)] as const,
    [
      BRAND_ASSET_PATHS.ico,
      encodePngIco(WINDOWS_ICON_SIZES.map((size) => ({ size, contents: render(size) }))),
    ] as const,
  ];

  const stale: string[] = [];
  for (const [output, bytes] of generated) {
    const destination = path.join(repoRoot, output);
    if ((yield* fs.exists(destination)) && bytes.equals(yield* fs.readFile(destination))) {
      continue;
    }
    if (checkOnly) {
      stale.push(output);
      continue;
    }
    yield* Effect.scoped(
      Effect.gen(function* () {
        const temp = yield* fs.makeTempFileScoped({ directory: path.dirname(destination) });
        yield* fs.writeFile(temp, bytes, { mode: 0o644 });
        yield* fs.rename(temp, destination);
      }),
    );
  }
  if (stale.length > 0) return yield* new StaleBrandIconsError({ paths: stale });
  yield* Console.log(`${generated.length} Cadro icon files are current.`);
});

export const exportBrandIconsCommand = Command.make(
  "export-brand-icons",
  {
    check: Flag.Boolean("check").pipe(
      Flag.withDescription("Verify generated icon assets without modifying files."),
      Flag.withDefault(false),
    ),
  },
  ({ check }) => exportBrandIcons(check),
).pipe(Command.withDescription("Generate Cadro icons from assets/cadro/icon.svg."));

if (import.meta.main) {
  Command.run(exportBrandIconsCommand, { version: "0.0.0" }).pipe(
    Effect.provide(NodeServices.layer),
    NodeRuntime.runMain,
  );
}
