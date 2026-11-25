import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { CADRO_PROJECT_FILE_NAME, type CadroProjectFile } from "@cadro/contracts";
import { CadroProjectFileFromJson } from "@cadro/shared/cadroProjectFile";

const decodeCadroProjectFileJson = Schema.decodeEffect(CadroProjectFileFromJson);

export class CadroProjectFileLoadError extends Schema.TaggedError<CadroProjectFileLoadError>()(
  "CadroProjectFileLoadError",
  {
    operation: Schema.Literals(["read", "decode"]),
    workspaceRoot: Schema.String,
    filePath: Schema.String,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return `Failed to ${this.operation} ${CADRO_PROJECT_FILE_NAME} at ${this.filePath}.`;
  }
}

export class CadroProjectFileLoader extends Context.Service<
  CadroProjectFileLoader,
  {
    /** Never fails; missing/unreadable/invalid files return none, with warnings for invalid files. */
    readonly load: (workspaceRoot: string) => Effect.Effect<Option.Option<CadroProjectFile>>;
  }
>()("cadro/project/CadroProjectFileLoader") {}

const logCadroProjectFileLoadError = (error: CadroProjectFileLoadError) =>
  Effect.logWarning(error).pipe(
    Effect.annotateLogs({
      operation: error.operation,
      workspaceRoot: error.workspaceRoot,
      filePath: error.filePath,
      errorTag: error._tag,
    }),
  );

/** @public */
export const make = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const load: CadroProjectFileLoader["Service"]["load"] = Effect.fn("CadroProjectFileLoader.load")(
    function* (workspaceRoot) {
      const filePath = path.join(workspaceRoot, CADRO_PROJECT_FILE_NAME);
      const raw = yield* fileSystem.readFileString(filePath).pipe(
        Effect.asSome,
        Effect.catchTags({
          PlatformError: (error) =>
            error.reason._tag === "NotFound"
              ? Effect.succeed(Option.none<string>())
              : logCadroProjectFileLoadError(
                  new CadroProjectFileLoadError({
                    operation: "read",
                    workspaceRoot,
                    filePath,
                    cause: error,
                  }),
                ).pipe(Effect.as(Option.none<string>())),
        }),
      );
      if (Option.isNone(raw)) {
        return Option.none<CadroProjectFile>();
      }
      return yield* decodeCadroProjectFileJson(raw.value).pipe(
        Effect.asSome,
        Effect.catchTags({
          SchemaError: (error) =>
            logCadroProjectFileLoadError(
              new CadroProjectFileLoadError({
                operation: "decode",
                workspaceRoot,
                filePath,
                cause: error,
              }),
            ).pipe(Effect.as(Option.none<CadroProjectFile>())),
        }),
      );
    },
  );

  return CadroProjectFileLoader.of({ load });
});

export const layer = Layer.effect(CadroProjectFileLoader, make);
