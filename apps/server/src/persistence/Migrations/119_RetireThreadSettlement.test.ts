import { assert, it } from "@effect/vitest";
import * as NodeSqliteClient from "@cadro/shared/nodeSqliteClient";
import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";

import { runMigrations } from "../Migrations.ts";

it.layer(NodeSqliteClient.layer({ filename: ":memory:" }))("119_RetireThreadSettlement", (it) => {
  it.effect("restores historical chats without moving, waking or unarchiving them", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations({ toMigrationInclusive: 118 });
      const timestamp = "2026-09-01T14:00:00.000Z";
      const saved = [
        { id: "manual", settledOverride: "settled", settledAt: timestamp, pinnedAt: timestamp },
        { id: "automatic", settledOverride: null, settledAt: timestamp, archivedAt: timestamp },
        {
          id: "reopened",
          settledOverride: "active",
          unsettledAt: timestamp,
          snoozedUntil: timestamp,
        },
        { id: "opt-out", autoSettleDisabledAt: timestamp },
        { id: "ordinary" },
      ];
      for (const record of saved) {
        yield* sql`INSERT INTO orchestration_v2_projection_threads
          (thread_id, project_id, title, default_provider, runtime_mode, interaction_mode, created_at, updated_at, archived_at, payload_json)
          VALUES (${record.id}, 'demo', ${record.id}, 'codex', 'full-access', 'default', ${timestamp}, ${timestamp},
          ${record.archivedAt ?? null}, ${JSON.stringify(record)})`;
      }
      yield* runMigrations({ toMigrationInclusive: 119 });
      const rows = yield* sql<{
        thread_id: string;
        updated_at: string;
        archived_at: string | null;
        payload_json: string;
      }>`SELECT thread_id, updated_at, archived_at, payload_json FROM orchestration_v2_projection_threads`;
      assert.equal(rows.length, saved.length);
      for (const record of saved) {
        const row = rows.find((row) => row.thread_id === record.id)!;
        assert.equal(row.updated_at, timestamp);
        assert.equal(row.archived_at, record.archivedAt ?? null);
        assert.deepEqual(
          JSON.parse(row.payload_json),
          record.id === "ordinary"
            ? record
            : {
                ...record,
                settledOverride: null,
                settledAt: null,
                unsettledAt: null,
                autoSettleDisabledAt: null,
              },
        );
      }
    }),
  );
});
