import * as NodeServices from "@effect/platform-node/NodeServices";
import { expect, it } from "@effect/vitest";
import * as HostProcess from "@cadro/shared/HostProcess";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import { resolveCodexBinaryPath } from "./codexBinaryPath.ts";

it.effect(
  "uses the macOS app's executable only when no configured or PATH command takes precedence",
  () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const home = yield* fs.makeTempDirectoryScoped();
      const bundle = path.join(
        home,
        "Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex",
      );
      yield* fs.makeDirectory(path.dirname(bundle), { recursive: true });
      yield* fs.writeFileString(bundle, "#!/bin/sh\n", { mode: 0o755 });
      const resolve = (binary: string, lookup: string, platform: NodeJS.Platform = "darwin") =>
        resolveCodexBinaryPath(binary, { PATH: lookup }).pipe(
          Effect.provideService(HostProcess.HomeDirectory, home),
          Effect.provideService(HostProcess.Platform, platform),
        );
      expect(yield* resolve("codex", "")).toBe(bundle);
      expect(yield* resolve("codex", path.dirname(bundle))).toBe("codex");
      expect(yield* resolve("~/custom-codex", "")).toBe(path.join(home, "custom-codex"));
      expect(yield* resolve("codex", "", "linux")).toBe("codex");
    }).pipe(Effect.provide(NodeServices.layer)),
);
