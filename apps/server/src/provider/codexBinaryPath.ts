import * as HostProcess from "@cadro/shared/HostProcess";
import { resolveCommandPath } from "@cadro/shared/shell";
import * as Effect from "effect/Effect";
import * as Path from "effect/Path";

import { expandHomePath } from "@cadro/provider-core/server/pathExpansion";

/** Finder-launched servers may have no shell-installed Codex on PATH. */
export const resolveCodexBinaryPath = Effect.fn("resolveCodexBinaryPath")(function* (
  configured: string,
  environment: NodeJS.ProcessEnv,
) {
  const home = yield* HostProcess.HomeDirectory;
  const command = expandHomePath(configured || "codex", home);
  if (command !== "codex" || (yield* HostProcess.Platform) !== "darwin") return command;
  if (yield* resolveCommandPath(command, { env: environment })) return command;

  const path = yield* Path.Path;
  for (const directory of [path.join(home, "Applications"), "/Applications"]) {
    for (const relative of [
      "ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex",
      "Codex.app/Contents/Resources/codex",
    ]) {
      const bundled = yield* resolveCommandPath(path.join(directory, relative), {
        env: environment,
      });
      if (bundled !== null) return bundled;
    }
  }
  return command;
});
