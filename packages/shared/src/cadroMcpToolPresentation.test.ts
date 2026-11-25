import { describe, expect, it } from "vite-plus/test";

import {
  CADRO_MCP_TOOL_NAMES,
  resolveCadroMcpSummaryAction,
  resolveCadroMcpToolDefinition,
  resolveCadroMcpToolPresentation,
} from "./cadroMcpToolPresentation.ts";

describe("resolveCadroMcpToolPresentation", () => {
  it("recognizes every T3 tool across provider prefixes and completion suffixes", () => {
    for (const tool of CADRO_MCP_TOOL_NAMES) {
      const presentation = resolveCadroMcpToolPresentation(tool);
      for (const prefix of [
        "mcp__cadro__",
        "cadro.",
        "cadro-direct.",
        "mcp__cadro-direct__",
        "mcp__t3-code__",
        "mcp__t3_code__",
        "mcp__t3code__",
        "T3-code.",
        "t3code.",
        "t3-code-direct.",
        "mcp__t3_code_direct__",
        "t3_code/",
        "t3code:",
        "mcp_t3-code_",
        "T3 Code ",
        "t3-code · ",
      ]) {
        expect(resolveCadroMcpToolPresentation(`${prefix}${tool} completed`), tool).toEqual(
          presentation,
        );
      }
      expect(resolveCadroMcpToolPresentation(`mcp__another-server__${tool}`), tool).toBeNull();
    }
  });

  it("matches OpenCode 2's per-thread server names, whose thread ids hold underscores", () => {
    expect(
      resolveCadroMcpToolPresentation("t3-code-thread_opencode2-adapter_delegate_task")
        ?.displayName,
    ).toBe("Delegate a child task");
    expect(
      resolveCadroMcpToolPresentation("t3-code-thread_opencode2-adapter_not_a_tool"),
    ).toBeNull();
  });
});

describe("resolveCadroMcpToolDefinition", () => {
  it("labels an action tool call as the action it ran", () => {
    expect(
      resolveCadroMcpToolDefinition("mcp__t3-code__preview_act", { action: "type" })?.labels,
    ).toEqual(resolveCadroMcpToolDefinition("preview_type")?.labels);
    expect(
      resolveCadroMcpToolDefinition("t3_thread_transfer", { action: "fork" })?.displayName,
    ).toBe(resolveCadroMcpToolDefinition("t3_thread_fork")?.displayName);
    expect(resolveCadroMcpToolDefinition("preview_act", { action: "unknown" })?.labels[2]).toBe(
      "Used",
    );
  });
});

describe("resolveCadroMcpSummaryAction", () => {
  it("summarizes an action tool by the action each call ran", () => {
    expect(resolveCadroMcpSummaryAction("mcp__t3-code__t3_queue", { action: "list" })).toBe(
      "queue-list",
    );
    expect(resolveCadroMcpSummaryAction("t3_queue", { action: "edit" })).toBe("queue-edit");
    expect(resolveCadroMcpSummaryAction("t3_thread_transfer", { action: "status" })).toBe(
      "thread-transfers",
    );
    expect(resolveCadroMcpSummaryAction("t3_thread_configure", {})).toBe("thread-configuration");
    expect(resolveCadroMcpSummaryAction("schedule_task", { scheduledTaskId: "task-1" })).toBe(
      "schedule-update",
    );
    expect(resolveCadroMcpSummaryAction("delegate_task", { task: "x" })).toBe("delegate");
  });
});
