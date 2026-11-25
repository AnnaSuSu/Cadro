/// <reference lib="dom" />
import { expect } from "e2e";

import { test, WEB } from "./cadro.ts";

test(
  "Workspace navigation buttons stay in place across sections",
  WEB,
  async ({ cadro, browser, screen }) => {
    await cadro.project("navigation-demo");
    await browser.setViewport({ width: 1280, height: 800 });
    await cadro.open();
    const rail = screen.getByRole("navigation", "Workspace navigation");
    await rail.getByRole("link", "Pull requests").waitFor();
    const positions = () =>
      browser.evaluate(() =>
        Array.from(
          document.querySelectorAll('nav[aria-label="Workspace navigation"] a'),
          (link) => {
            const { x, y } = link.getBoundingClientRect();
            return [x, y];
          },
        ),
      );
    const initial = await positions();
    for (const [label, pathname] of [
      ["Projects", "/settings/projects"],
      ["Pull requests", "/pull-requests"],
      ["Scheduled tasks", "/settings/scheduled-tasks"],
      ["Worktrees", "/settings/worktrees"],
    ] as const) {
      await rail.getByRole("link", label, { exact: true }).tap();
      await expect.poll(() => browser.evaluate(() => location.pathname)).toBe(pathname);
      await expect.poll(positions).toEqual(initial);
    }
    await rail.getByRole("link", "Workbench").tap();
    await expect(screen.getByTestId("composer-editor")).toBeVisible();
    await expect.poll(positions).toEqual(initial);
  },
);

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

test(
  "The workspace menu changes appearance from either entry point",
  WEB,
  async ({ cadro, app, browser, screen }) => {
    const project = await cadro.project("Cadro");
    const thread = await cadro.thread({
      project,
      title: "检查 Cadro UI 设计",
      messages: ["Start"],
    });
    await cadro.open("/settings/general");
    await screen.getByLabel("Language", { exact: true }).tap();
    await screen.getByRole("option", /中文/).tap();
    await screen.getByLabel("语言", { exact: true }).waitFor();
    await cadro.open(thread);
    const rail = screen.getByRole("navigation", "工作区导航");
    await rail.getByRole("button", "工作区菜单").tap();
    await expect(screen.getByRole("menuitem", "连接与自托管")).toBeVisible();
    const waitForMenuPaint = () =>
      expect
        .poll(() =>
          browser.evaluate(() =>
            [...document.querySelectorAll('[data-menu-surface="panel"]')].every(
              (menu) =>
                !menu.hasAttribute("data-starting-style") && getComputedStyle(menu).opacity === "1",
            ),
          ),
        )
        .toBe(true);
    await waitForMenuPaint();
    await app.screenshot("workspace-menu-zh");
    const appearance = screen.getByRole("menuitem", "外观", { exact: true });
    await appearance.press("ArrowRight");
    const dark = screen.getByRole("menuitemradio", "深色");
    await expect(dark).toBeVisible();
    await waitForMenuPaint();
    await app.screenshot("workspace-menu-appearance");
    await dark.tap();
    await expect
      .poll(() => browser.evaluate(() => document.documentElement.classList.contains("dark")))
      .toBe(true);
    await browser.reload();
    await screen.getByRole("navigation", "工作区导航").getByRole("button", "工作区菜单").waitFor();
    await screen
      .getByRole("navigation", "会话", { exact: true })
      .getByRole("button", "工作区菜单")
      .tap();
    await appearance.tap();
    await expect(dark).toHaveAttribute("aria-checked", "true");
    await screen.getByRole("menuitemradio", "浅色").tap();
    await expect
      .poll(() => browser.evaluate(() => document.documentElement.classList.contains("dark")))
      .toBe(false);
  },
);
