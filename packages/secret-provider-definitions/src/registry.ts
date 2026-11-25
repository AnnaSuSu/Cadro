import { makeSecretProviderDefinitionRegistry } from "@cadro/secret-provider-core/shared/definition";
import * as OnePassword from "@cadro/secret-provider-onepassword/shared/definition";

export const builtInSecretProviderDefinitions = makeSecretProviderDefinitionRegistry([
  OnePassword.definition,
]);
