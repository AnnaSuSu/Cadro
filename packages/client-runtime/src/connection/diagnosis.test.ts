import { EnvironmentAuthInvalidError } from "@cadro/contracts";
import { describe, expect, it } from "@effect/vitest";

import { mapRemoteEnvironmentError } from "./errors.ts";
import { presentConnectionDiagnosis } from "./diagnosis.ts";
import {
  AVAILABLE_CONNECTION_STATE,
  ConnectionBlockedError,
  ConnectionTransientError,
  type ConnectionAttemptError,
  type SupervisorConnectionState,
} from "./model.ts";

const backoff = (lastFailure: ConnectionAttemptError): SupervisorConnectionState => ({
  ...AVAILABLE_CONNECTION_STATE,
  desired: true,
  network: "online",
  phase: "backoff",
  attempt: 3,
  lastFailure,
  retryAt: Date.UTC(2026, 9, 19, 12, 0, 30),
});

const diagnose = (state: SupervisorConnectionState) =>
  presentConnectionDiagnosis({ hostLabel: "Mac mini", state });
const results = (state: SupervisorConnectionState) =>
  diagnose(state)?.hops.map(({ hop, result }) => `${hop}:${result}`);

describe("presentConnectionDiagnosis", () => {
  it("reports this device as offline before any other hop", () => {
    const state = { ...AVAILABLE_CONNECTION_STATE, network: "offline" as const };
    expect(diagnose(state)?.headline).toBe("This device is offline");
    expect(results(state)?.[0]).toBe("device:failed");
  });

  it("asks for approval on the host instead of reporting it unreachable", () => {
    const diagnosis = diagnose(
      backoff(
        new ConnectionTransientError({
          reason: "approval-pending",
          detail: "Approve this device on Mac mini. It shows code K7QM-2XFD.",
          verificationCode: "K7QM-2XFD",
          hop: "server",
          via: "direct",
          failureCause: "approval_pending",
        }),
      ),
    );
    expect(diagnosis?.headline).toBe("Mac mini is waiting for someone to approve this device");
    expect(diagnosis?.steps.join(" ")).toContain("cadro auth connect-device approve K7QM-2XFD");
  });

  it("tells a host that refused this device's login to sign in again, not to start Cadro", () => {
    const failure = mapRemoteEnvironmentError(
      new EnvironmentAuthInvalidError({
        code: "auth_invalid",
        reason: "invalid_credential",
        traceId: "trace-1",
      }),
    );
    const steps = diagnose(backoff(failure))?.steps.join(" ");
    expect(steps).not.toContain("Make sure Cadro is running");
    expect(steps).toMatch(/pair|sign in/i);
  });

  it("does not report hops as working when the failure names none", () => {
    const failure = new ConnectionBlockedError({
      reason: "authentication",
      detail: "The environment rejected the credential.",
    });
    expect(results(backoff(failure))).not.toContainEqual(expect.stringMatching(/:ok$/));
  });
});
