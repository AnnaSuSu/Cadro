import { EnvironmentAuthInvalidError } from "@cadro/contracts";
import { describe, expect, it } from "@effect/vitest";

import { isHostCredentialRefusal, mapRemoteDpopEnvironmentError } from "./errors.ts";

describe("mapRemoteDpopEnvironmentError", () => {
  it("keeps a direct host's clock refusal apart from a refused pairing", () => {
    const mapped = mapRemoteDpopEnvironmentError(
      new EnvironmentAuthInvalidError({
        code: "auth_invalid",
        reason: "invalid_credential",
        dpopFailureReason: "time_window",
        traceId: "trace-clock",
      }),
    );
    expect(mapped).toMatchObject({ via: "direct", failureCause: "clock_skew" });
    expect(isHostCredentialRefusal(mapped)).toBe(false);
  });
});
