import { expect } from "e2e";

import { CADRO_HOME } from "../e2e.config.ts";
import { makeState, runPromise, test, WEB } from "./cadro.ts";

test(
  "A queued message shows its @-file mention by name, not as a raw link",
  WEB,
  async ({ cadro, app, screen, browser }) => {
    const project = await cadro.project("demo", { "src/foo.ts": "export {};\n" });
    const thread = await cadro.thread({
      project,
      title: "Long work",
      messages: ["Show me around"],
      model: "showcase",
    });
    await cadro.open(thread);

    const composer = screen.getByRole("textbox");
    await composer.pressSequentially("Review @foo");
    await screen.getByRole("option", "foo.ts", { exact: false }).tap();
    await expect(composer).toContainText("foo.ts");

    // The showcase recording streams for several seconds, long enough to queue behind its turn.
    await runPromise(
      makeState(CADRO_HOME).cli(["thread", "send", thread.threadId, "Show me again"]),
    );
    await screen.getByText("Working for", { exact: false }).waitFor();
    // Leave the next instruction queued above the composer.
    await browser.keyboard.press("Enter");

    const queued = screen.getByRole("listitem", "Queued message 1 of 1, not sent");
    await queued.waitFor();
    // Read the row once: the queued message sends, and its row goes, when the turn ends.
    const text = await queued.textContent();
    await app.screenshot("queued-row");
    expect(text).toContain("Review foo.ts");
    await expect(browser.locator("[data-chat-composer-stack] [data-thread-queue]")).toBeVisible();
    await composer.fill("Keep this draft");
    await screen.getByRole("button", "Steer", { exact: true }).tap();
    await expect(queued).toHaveCount(0);
    await expect(composer).toContainText("Keep this draft");
  },
);
