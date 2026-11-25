/// <reference lib="dom" />
import { expect } from "e2e";

import { test, WEB } from "./cadro.ts";

test(
  "Settings fills the workspace and Back restores the open draft",
  WEB,
  async ({ cadro, app, browser, screen }) => {
    await cadro.project("workspace-demo");
    await browser.setViewport({ width: 1440, height: 900 });
    await cadro.open();
    await screen.getByRole("button", "New chat", { exact: true }).tap();
    const editor = screen.getByTestId("composer-editor");
    await editor.fill("Keep this draft when I return");
    const draftUrl = await browser.url();

    await screen
      .getByRole("navigation", "Workspace navigation")
      .getByRole("button", "Workspace menu")
      .tap();
    await screen.getByRole("menuitem", /^Settings/).tap();
    const settings = screen.getByRole("main", "Settings");
    await expect(settings).toBeVisible();
    await expect(screen.getByRole("dialog", "Settings")).toHaveCount(0);
    await expect(screen.getByRole("navigation", "Threads")).toHaveCount(0);
    await expect(screen.getByRole("navigation", "Workspace navigation")).toHaveCount(1);
    await expect
      .poll(() =>
        browser.evaluate(() => {
          const rect = document.querySelector("[data-settings-workspace]")!.getBoundingClientRect();
          return [
            rect.left,
            rect.top,
            window.innerWidth - rect.right,
            window.innerHeight - rect.bottom,
          ];
        }),
      )
      .toEqual([48, 0, 0, 0]);

    await screen.getByRole("button", "Appearance", { exact: true }).tap();
    await expect.poll(() => browser.evaluate(() => location.pathname)).toBe("/settings/appearance");
    await expect(settings.getByRole("slider", "Contrast")).toBeVisible();
    await app.screenshot("settings-workspace");

    await browser.setViewport({ width: 480, height: 800 });
    await expect
      .poll(() =>
        browser.evaluate(() => {
          const rect = document.querySelector("[data-settings-workspace]")!.getBoundingClientRect();
          return [rect.left, window.innerWidth - rect.right];
        }),
      )
      .toEqual([0, 0]);
    await settings.getByRole("button", "Back", { exact: true }).tap();
    await expect(editor).toContainText("Keep this draft when I return");
    await expect.poll(() => browser.url()).toBe(draftUrl);
  },
);
