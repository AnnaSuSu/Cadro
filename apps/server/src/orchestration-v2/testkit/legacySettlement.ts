import type { OrchestrationV2DomainEvent } from "@cadro/contracts";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";

// Modern projectors ignore settlement events. These rows model databases saved by older clients.
export const restoreLegacySettlement = Effect.fn(function* (event: OrchestrationV2DomainEvent) {
  if (event.type !== "thread.created" || event.payload.settledAt == null) return;
  const sql = yield* SqlClient.SqlClient;
  yield* sql`UPDATE orchestration_v2_projection_threads
    SET payload_json = json_set(payload_json, '$.settledOverride', 'settled', '$.settledAt', ${DateTime.formatIso(event.payload.settledAt)})
    WHERE thread_id = ${event.threadId}`;
});
