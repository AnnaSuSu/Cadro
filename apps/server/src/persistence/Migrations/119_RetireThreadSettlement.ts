import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  // Preserve activity order and historical events. Only the obsolete list placement changes.
  yield* sql`
    UPDATE orchestration_v2_projection_threads
    SET payload_json = json_set(payload_json,
      '$.settledOverride', NULL, '$.settledAt', NULL, '$.unsettledAt', NULL, '$.autoSettleDisabledAt', NULL)
    WHERE CASE WHEN json_valid(payload_json) THEN
      json_extract(payload_json, '$.settledOverride') IS NOT NULL
      OR json_extract(payload_json, '$.settledAt') IS NOT NULL
      OR json_extract(payload_json, '$.unsettledAt') IS NOT NULL
      OR json_extract(payload_json, '$.autoSettleDisabledAt') IS NOT NULL
    END
  `;
});
