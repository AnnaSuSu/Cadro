import appCss from "../index.css?inline";
import { page, userEvent } from "vite-plus/test/browser";
import { describe, expect, it, vi } from "vite-plus/test";

import { render } from "../../test/render";

vi.mock(import("../state/server"), async (original) => {
  const actual = await original();
  const { Atom } = await import("effect/reactivity");
  const { compileResolvedKeybindingsConfig } = await import("@cadro/shared/keybindings");
  const keybindings = compileResolvedKeybindingsConfig([
    { key: "mod+b", command: "sidebar.toggle", when: "!terminalFocus" },
  ]);
  return { ...actual, primaryServerKeybindingsAtom: Atom.make(keybindings) };
});
// The thread list needs live environments; keep the footer so footer controls render in the shell.
vi.mock(import("./Sidebar"), async () => {
  const { SidebarChromeFooter } = await import("./sidebar/SidebarChrome");
  return { default: (() => <SidebarChromeFooter />) as never };
});

import { AppSidebarLayout } from "./AppSidebarLayout";

describe("sidebar toggle shortcut", () => {
  it("opens the usage summary from the sidebar footer and links to the usage page", async () => {
    await page.viewport(1280, 800);
    await using screen = await render(
      <AppSidebarLayout>
        <style>{appCss}</style>
      </AppSidebarLayout>,
    );
    const usage = screen.getByRole("button", { name: "Usage limits" });
    await usage.click();
    await expect.element(page.getByText("No limits reported.")).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: "Manage usage" }))
      .toHaveAttribute("href", "/usage");
    await userEvent.keyboard("{Escape}");
    await expect.element(usage).toHaveFocus();
    await expect.element(screen.getByRole("button", { name: "Settings" })).toBeVisible();
  });

  it("leaves the key to a focused terminal when its rule excludes terminalFocus", async () => {
    await page.viewport(1280, 800);
    using _platform = vi.spyOn(navigator, "platform", "get").mockReturnValue("Linux x86_64");
    await using screen = await render(
      <AppSidebarLayout>
        <style>{appCss}</style>
        <div data-terminal-owner="drawer">
          <textarea aria-label="Terminal input" />
        </div>
        <button type="button">Outside</button>
      </AppSidebarLayout>,
    );
    const wrapper = screen.container.querySelector('[data-slot="sidebar-wrapper"]')!;
    const sidebar = wrapper.querySelector("[data-app-sidebar]")!;
    expect(screen.container.querySelector('[aria-label="Workspace navigation"]')).toBeNull();
    expect(sidebar.getBoundingClientRect().left).toBe(0);

    await userEvent.click(screen.getByRole("textbox", { name: "Terminal input" }));
    await userEvent.keyboard("{Control>}b{/Control}");
    expect(wrapper.getAttribute("data-sidebar-state")).toBe("expanded");

    await userEvent.click(screen.getByRole("button", { name: "Outside" }));
    await userEvent.keyboard("{Control>}b{/Control}");
    await vi.waitFor(() => expect(wrapper.getAttribute("data-sidebar-state")).toBe("collapsed"));
  });
});
