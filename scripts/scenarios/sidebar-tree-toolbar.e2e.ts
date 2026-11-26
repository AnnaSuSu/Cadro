/// <reference lib="dom" />
import { expect } from "e2e";

import { test, WEB } from "./cadro.ts";

test(
  "Project sidebar keeps the active chat and its toolbar within reach",
  WEB,
  async ({ cadro, app, browser, screen }) => {
    const workspace = await cadro.project("Cadro");
    const game = await cadro.project("game");
    for (const name of ["ak47", "OpenContextEngine", "毕业论文", "TechSpar"]) {
      await cadro.project(name);
    }
    await cadro.thread({ project: game, title: "检查商店自动提审能力", messages: ["Start"] });
    const thread = await cadro.thread({
      project: workspace,
      title: "检查 Cadro UI 设计",
      messages: ["Start"],
    });
    await browser.setViewport({ width: 1440, height: 940 });
    await cadro.open(thread);
    await expect(screen.getByRole("heading", "Recents")).toBeVisible();
    await expect(screen.getByRole("button", "检查 Cadro UI 设计", { exact: true })).toBeVisible();
    await app.screenshot("sidebar-tree");

    const threads = screen.getByRole("navigation", "Threads");
    const search = threads.getByRole("button", "Search threads", { exact: true });
    const filter = browser.locator('button[aria-label="Projects"]');
    await expect
      .poll(() =>
        browser.evaluate(() => {
          const rect = (selector: string) =>
            document.querySelector(selector)!.getBoundingClientRect();
          const brand = rect('a[aria-label="Cadro home"]');
          const search = rect('button[aria-label="Search threads"]');
          const filter = rect('button[aria-label="Projects"]');
          const middle = (r: DOMRect) => r.top + r.height / 2;
          return middle(brand) === middle(search) && middle(search) === middle(filter);
        }),
      )
      .toBe(true);

    await filter.tap();
    await expect(screen.getByRole("combobox", "Search projects")).toBeVisible();
    await browser.keyboard.press("Escape");
    await search.tap();
    const palette = screen.getByRole("dialog", "Command palette");
    await expect(palette.getByRole("tab", "Threads")).toHaveAttribute("aria-selected", "true");
    const field = palette.getByRole("combobox");
    await field.fill("商店");
    await expect(palette.getByRole("option", /检查商店自动提审能力/)).toBeVisible();
    await field.press("Escape");
    await expect(palette).toHaveCount(0);

    await threads.getByRole("button", "Workspace menu", { exact: true }).tap();
    await screen.getByRole("menuitem", /^Settings/).tap();
    await expect(screen.getByRole("main", "Settings")).toBeVisible();
  },
);
