import * as Exit from "effect/Exit";
import * as Schema from "effect/Schema";

import { CadroProjectFile, CADRO_PROJECT_FILE_SCHEMA_URL } from "@cadro/contracts";

import { fromLenientJson } from "./schemaJson.ts";

export const CadroProjectFileFromJson = fromLenientJson(CadroProjectFile);

const decodeCadroProjectFile = Schema.decodeExit(CadroProjectFileFromJson);

export function parseCadroProjectFile(contents: string): CadroProjectFile | null {
  const decoded = decodeCadroProjectFile(contents);
  return Exit.isSuccess(decoded) ? decoded.value : null;
}

export function buildCadroProjectFileJsonSchema(): Record<string, unknown> {
  const document = Schema.toJsonSchemaDocument(CadroProjectFile, { onExcessProperty: "error" });
  const jsonSchema: Record<string, unknown> = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: CADRO_PROJECT_FILE_SCHEMA_URL,
    ...document.schema,
  };
  if (document.definitions && Object.keys(document.definitions).length > 0) {
    jsonSchema.$defs = document.definitions;
  }
  return jsonSchema;
}
