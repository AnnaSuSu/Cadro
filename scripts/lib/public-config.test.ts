// @effect-diagnostics nodeBuiltinImport:off - Tests exercise root env file precedence directly.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { loadRepoEnv } from "./public-config.ts";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    NodeFS.rmSync(directory, { recursive: true, force: true });
  }
});

describe("loadRepoEnv", () => {
  it("applies process, root local, and root precedence in that order", () => {
    const repoRoot = makeTemporaryDirectory();
    NodeFS.writeFileSync(
      NodePath.join(repoRoot, ".env"),
      "CADRO_PORT=3773\nCADRO_HOST=localhost\n",
    );
    NodeFS.writeFileSync(NodePath.join(repoRoot, ".env.local"), "CADRO_PORT=4000\n");

    expect(loadRepoEnv({ baseEnv: {}, repoRoot })).toMatchObject({
      CADRO_PORT: "4000",
      CADRO_HOST: "localhost",
    });
    expect(loadRepoEnv({ baseEnv: { CADRO_PORT: "5000" }, repoRoot }).CADRO_PORT).toBe("5000");
  });
});

function makeTemporaryDirectory() {
  const directory = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "cadro-public-config-"));
  temporaryDirectories.push(directory);
  return directory;
}
