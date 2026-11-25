import {
  CADRO_PROJECT_FILE_NAME,
  type EnvironmentId,
  type ProjectReadFileResult,
  type CadroProjectFile,
} from "@cadro/contracts";
import { parseCadroProjectFile } from "@cadro/shared/cadroProjectFile";
import { executeAtomQuery } from "@cadro/client-runtime/state/runtime";
import { AsyncResult } from "effect/reactivity";

import {
  getProjectFileQueryAtom,
  resolveProjectFileQueryData,
} from "~/components/files/projectFilesQueryState";
import { appAtomRegistry } from "~/rpc/atomRegistry";

function toT3ProjectFile(
  environmentId: EnvironmentId,
  workspaceRoot: string,
  result: ProjectReadFileResult | null,
): CadroProjectFile | null {
  const data = resolveProjectFileQueryData(
    environmentId,
    workspaceRoot,
    CADRO_PROJECT_FILE_NAME,
    result,
  );
  if (data === null || data.exists === false || data.truncated) return null;
  return parseCadroProjectFile(data.contents);
}

export async function readT3ProjectFile(
  environmentId: EnvironmentId,
  workspaceRoot: string,
): Promise<CadroProjectFile | null> {
  const result = await executeAtomQuery(
    appAtomRegistry,
    getProjectFileQueryAtom(environmentId, workspaceRoot, CADRO_PROJECT_FILE_NAME),
    { reportDefect: false, reportFailure: false },
  );
  return toT3ProjectFile(
    environmentId,
    workspaceRoot,
    result._tag === "Success" ? result.value : null,
  );
}

/** The project's t3.json from an earlier read, or `undefined` when none has loaded yet. */
export function peekT3ProjectFile(
  environmentId: EnvironmentId,
  workspaceRoot: string,
): CadroProjectFile | null | undefined {
  const result = appAtomRegistry.get(
    getProjectFileQueryAtom(environmentId, workspaceRoot, CADRO_PROJECT_FILE_NAME),
  );
  return AsyncResult.isSuccess(result)
    ? toT3ProjectFile(environmentId, workspaceRoot, result.value)
    : undefined;
}
