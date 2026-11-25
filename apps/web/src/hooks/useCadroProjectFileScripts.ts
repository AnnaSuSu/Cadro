import {
  CADRO_PROJECT_FILE_NAME,
  type EnvironmentId,
  type CadroProjectFile,
  type CadroProjectFileScript,
} from "@cadro/contracts";
import { parseCadroProjectFile } from "@cadro/shared/cadroProjectFile";

import { useProjectFileQuery } from "~/components/files/projectFilesQueryState";

const NO_SCRIPTS: ReadonlyArray<CadroProjectFileScript> = [];

export interface CadroProjectFileState {
  status: "loading" | "missing" | "invalid" | "valid";
  file: CadroProjectFile | null;
  scripts: ReadonlyArray<CadroProjectFileScript>;
  refresh: () => void;
}

export function useCadroProjectFileState(
  environmentId: EnvironmentId,
  cwd: string | null,
): CadroProjectFileState {
  const query = useProjectFileQuery(environmentId, cwd ?? "", CADRO_PROJECT_FILE_NAME, cwd !== null);
  const contents = query.data && !query.data.truncated ? query.data.contents : null;
  const isPending = query.isPending;
  const refresh = query.refresh;
  if (contents === null) {
    return {
      status: isPending ? "loading" : "missing",
      file: null,
      scripts: NO_SCRIPTS,
      refresh,
    } as const;
  }
  const file = parseCadroProjectFile(contents);
  if (file === null) {
    return { status: "invalid", file: null, scripts: NO_SCRIPTS, refresh } as const;
  }
  return { status: "valid", file, scripts: file.scripts ?? NO_SCRIPTS, refresh } as const;
}
