import * as Schema from "effect/Schema";
import { describe, expect, it } from "vite-plus/test";

import { parseCadroProjectFile, CadroProjectFileFromJson } from "./cadroProjectFile.ts";

const decodeJson = Schema.decodeUnknownSync(CadroProjectFileFromJson);

describe("CadroProjectFileFromJson", () => {
  it("decodes lenient JSONC with comments and trailing commas", () => {
    const decoded = decodeJson(`{
      // team scripts
      "iconPath": "assets/logo.svg",
      "scripts": [
        { "name": "Dev", "command": "pnpm dev", "stopOnSettle": true, },
      ],
    }`);

    expect(decoded.iconPath).toBe("assets/logo.svg");
    expect(decoded.scripts?.[0]).toEqual({ name: "Dev", command: "pnpm dev", stopOnSettle: true });
  });
});

describe("parseCadroProjectFile", () => {
  it("reads project defaults from JSONC with a URL in a block comment", () => {
    expect(
      parseCadroProjectFile(`{
        /* See /schema/cadro.json */
        "defaultThreadEnvMode": "worktree"
      }`),
    ).toEqual({ defaultThreadEnvMode: "worktree" });
  });
});
