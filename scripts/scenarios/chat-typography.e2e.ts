/// <reference lib="dom" />
import { expect } from "e2e";

import { test, WEB } from "./cadro.ts";

test(
  "UI, conversation and code sizes are independent and survive a reload",
  WEB,
  async ({ cadro, browser, screen, app }) => {
    await cadro.open("/settings/general");
    await screen.getByLabel("Language", { exact: true }).tap();
    await screen.getByRole("option", /中文/).tap();
    await screen.getByLabel("语言", { exact: true }).waitFor();
    const title = "检查线上 GPU 模型服务";
    const project = await cadro.project("TechSpar");
    await cadro.thread({ project, title: "确认更新内容", messages: ["Start"] });
    const thread = await cadro.thread({
      project,
      title,
      messages: ["Start"],
    });
    await cadro.open(thread);
    const editor = screen.getByTestId("composer-editor");
    await editor.fill("检查服务状态，review the output.\n\n```ts\nconst status = 200;\n```");
    await editor.press("Enter");
    const metrics = () =>
      browser.evaluate((name) => {
        const label = [
          ...document.querySelectorAll('[data-testid="sidebar-row-folder"] span'),
        ].find((e) => e.children.length === 0 && e.textContent === name);
        const message = document.querySelector(".user-message-markdown");
        const code = message?.querySelector("pre code, .shiki");
        const prompt = document.querySelector("[data-testid=composer-editor]");
        const size = (el: Element | null | undefined) => el && getComputedStyle(el).fontSize;
        return [
          size(label),
          label && getComputedStyle(label).fontWeight,
          size(message),
          size(code),
          size(prompt),
        ].join("/");
      }, title);
    await expect.poll(metrics).toBe("14px/400/15px/12px/15px");
    await expect(browser.locator(".user-message-markdown .chat-markdown-shiki")).toContainText(
      "status",
    );
    await app.screenshot("sidebar-and-chat");
    await cadro.open("/settings/appearance");
    const content = screen.getByRole("combobox", "正文字号");
    await content.waitFor();
    await browser.evaluate(() => {
      document.querySelector('[aria-label="正文字号"]')?.scrollIntoView({ block: "center" });
      return null;
    });
    await app.screenshot("typography-settings");
    await content.tap();
    await screen.getByRole("option", "18 px", { exact: true }).tap();
    await screen.getByRole("combobox", "界面字号").tap();
    await screen.getByRole("option", "16 px", { exact: true }).tap();
    await screen.getByRole("combobox", "代码字号").tap();
    await screen.getByRole("option", "13 px", { exact: true }).tap();
    await cadro.open(thread);
    await expect.poll(metrics).toBe("16px/400/18px/13px/18px");
    await browser.reload();
    await expect.poll(metrics).toBe("16px/400/18px/13px/18px");
  },
);
