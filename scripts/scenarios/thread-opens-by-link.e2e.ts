import { expect } from "e2e";

import { test, WEB } from "./cadro.ts";

test(
  "A seeded thread opens by its link and shows its history",
  WEB,
  async ({ cadro, app, screen }) => {
    const project = await cadro.project("demo");
    const thread = await cadro.thread({
      project,
      title: "Earlier work",
      messages: ["first", "second"],
    });
    await cadro.open(thread);

    await expect(screen.getByText("second fixture turn complete", { exact: false })).toBeVisible();
    await app.screenshot("thread");
  },
);
