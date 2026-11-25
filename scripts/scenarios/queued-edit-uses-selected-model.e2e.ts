import { expect } from "e2e";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { CADRO_HOME } from "../e2e.config.ts";
import { makeState, runPromise, test, WEB } from "./cadro.ts";

const SettingsJson = Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown));
const decodeSettings = Schema.decodeEffect(SettingsJson);
const encodeSettings = Schema.encodeEffect(SettingsJson);

const threadRuntimeSettings = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const settingsPath = (yield* Path.Path).join(CADRO_HOME, "userdata/settings.json");
  const original = yield* fs.readFileString(settingsPath);
  const settings = yield* decodeSettings(original);
  return {
    supervise: fs.writeFileString(
      settingsPath,
      yield* encodeSettings({ ...settings, defaultRuntimeMode: "approval-required" }),
    ),
    restore: fs.writeFileString(settingsPath, original),
  };
});

test(
  "A queued message runs with the model chosen while editing it",
  WEB,
  async ({ cadro, app, screen, browser }) => {
    const settings = await runPromise(threadRuntimeSettings);
    try {
      await runPromise(settings.supervise);
      const project = await cadro.project("demo");
      const thread = await cadro.thread({
        project,
        title: "Queued model",
        messages: ["Change the file"],
        model: "approval",
      });
      const { cli } = makeState(CADRO_HOME);
      await runPromise(cli(["thread", "send", thread.threadId, "Queued message"]));
      await cadro.open(thread);
      await screen
        .getByRole("listitem", "Queued message 1 of 1, not sent")
        .getByRole("button", "More")
        .tap();
      await screen.getByRole("menuitem", "Edit queued message").tap();
      await browser.locator("[data-chat-provider-model-picker-label]").first().tap();
      await browser.keyboard.type("Showcase");
      await browser.keyboard.press("Enter");
      await browser.keyboard.press("Escape");
      await screen.getByRole("button", "Update queued message", { exact: false }).tap();
      await screen.getByRole("button", "Approve", { exact: true }).tap();
      await expect
        .poll(async () => {
          const shown = await runPromise(cli(["thread", "show", thread.threadId, "--json"]));
          const result = JSON.parse(shown.stdout) as {
            thread: { model: string };
            messages: Array<{ text: string }>;
          };
          return result.messages.some((message) => message.text === "Queued message")
            ? result.thread.model
            : null;
        })
        .toBe("showcase");
      await app.screenshot("queued-model");
    } finally {
      await runPromise(settings.restore);
    }
  },
);
