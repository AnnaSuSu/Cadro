import { expect } from "e2e";

import { test, WEB } from "./cadro.ts";

test("About and its navigation use the selected language", WEB, async ({ cadro, screen, app }) => {
  await cadro.project("about-demo");
  await cadro.open("/settings/general");
  await screen.getByLabel("Language", { exact: true }).tap();
  await screen.getByRole("option", /中文/).tap();
  await screen.getByRole("button", "关于", { exact: true }).tap();
  await expect(screen.getByRole("heading", "设置", { exact: true })).toBeVisible();
  await expect(screen.getByText("智能体与代码", { exact: true })).toBeVisible();
  await expect(screen.getByText("主机与隐私", { exact: true })).toBeVisible();
  await expect(screen.getByText("查看智能体并导入项目。")).toBeVisible();
  await expect(screen.getByText("查看 Cadro 所用依赖、资源和可选工具的许可声明。")).toBeVisible();
  await app.screenshot("about-zh");
});
