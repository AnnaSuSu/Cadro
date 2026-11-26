import { expect } from "e2e";

import { test, WEB } from "./cadro.ts";

test(
  "Thread search finds an accented message by a short unaccented word",
  WEB,
  async ({ cadro, app, screen }) => {
    const project = await cadro.project("demo");
    const thread = await cadro.thread({ project, title: "Weekly notes", messages: ["Start"] });
    await cadro.open(thread);

    // Search reads what the user wrote; messages the CLI sends count as an agent's.
    const composer = screen.getByRole("textbox");
    await composer.pressSequentially("École fermée à Lyon");
    await composer.press("Enter");
    await expect(screen.getByText("second fixture turn complete", { exact: false })).toBeVisible();

    await screen.getByRole("button", "Search threads", { exact: true }).tap();
    const palette = screen.getByRole("dialog", "Command palette");
    await expect(palette.getByRole("tab", "Threads")).toHaveAttribute("aria-selected", "true");
    const field = palette.getByRole("combobox");
    await field.fill("fermée ec");
    await expect(palette.getByRole("option", /Weekly notes/)).toContainText("École fermée");
    await app.screenshot("search");
    await field.press("Escape");
    await expect(palette).toHaveCount(0);
  },
);
