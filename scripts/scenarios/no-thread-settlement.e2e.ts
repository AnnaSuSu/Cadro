/// <reference lib="dom" />
import { expect } from "e2e";

import { test, WEB } from "./cadro.ts";

test(
  "A chat stays open and has no settlement controls",
  WEB,
  async ({ cadro, screen, browser, app }) => {
    const project = await cadro.project("history");
    const thread = await cadro.thread({ project, title: "继续之前的对话", messages: ["Start"] });
    await cadro.open(thread);
    const editor = screen.getByTestId("composer-editor");
    await expect(editor).toBeVisible();
    await editor.fill("继续上次的工作");
    const url = await browser.url();
    await browser.keyboard.press("Escape");
    await browser.keyboard.press("Meta+Shift+S");
    await expect(editor).toContainText("继续上次的工作");
    await expect.poll(() => browser.url()).toBe(url);
    await expect(screen.getByRole("button", /^(Un-settle|Settle)( thread)?$/i)).toHaveCount(0);
    await expect(screen.getByRole("heading", "Settled", { exact: true })).toHaveCount(0);
    await app.screenshot("open-chat");
    await cadro.open("/settings/threads");
    await expect(screen.getByRole("main", "Settings")).toBeVisible();
    await expect(screen.getByRole("heading", "Auto-settle", { exact: true })).toHaveCount(0);
  },
);
