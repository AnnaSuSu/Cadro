import { describe, expect, it } from "vite-plus/test";

import "~/index.css";
import { applyAppearanceFontVariables, DEFAULT_SANS_FONT_STACK } from "./appearanceFonts";

function renderedFontSize(style: (probe: HTMLElement) => void): string {
  const probe = document.createElement("div");
  style(probe);
  document.body.append(probe);
  try {
    return getComputedStyle(probe).fontSize;
  } finally {
    probe.remove();
  }
}

const composerFontSize = () =>
  renderedFontSize((probe) => {
    // The composer editor's own size class.
    probe.className = "text-(length:--font-size-prompt,var(--text-sm))";
  });

const touchComposerFontSize = () =>
  renderedFontSize((probe) => {
    probe.style.fontSize = "var(--font-size-prompt-touch)";
  });

describe("applyAppearanceFontVariables", () => {
  it("fits Simplified Chinese glyphs without resizing Latin text or overriding a chosen font", async () => {
    const root = document.documentElement;
    const language = root.getAttribute("lang");
    const style = root.getAttribute("style");
    const probe = document.createElement("span");
    probe.style.cssText = "position:absolute; white-space:pre; font-size:14px";
    document.body.append(probe);
    const width = (text: string, family: string) => {
      probe.style.fontFamily = family;
      probe.textContent = text;
      return probe.getBoundingClientRect().width;
    };
    try {
      root.lang = "zh";
      root.style.removeProperty("--font-sans");
      const han = "检查服务器状态";
      const available = await document.fonts.load('14px "Cadro Han SC"', han).catch(() => []);
      expect(width("TechSpar ak47", "var(--font-sans)")).toBe(
        width("TechSpar ak47", DEFAULT_SANS_FONT_STACK),
      );
      if (available.length > 0) {
        const nativeWidth = width(han, '"PingFang SC"');
        expect(width(han, "var(--font-sans)") / nativeWidth).toBeCloseTo(0.94, 2);
        applyAppearanceFontVariables(root, {
          sans: "PingFang SC",
          content: "",
          code: "",
          composer: "",
          sizeInterface: 14,
          sizeContent: 15,
          sizeCode: 12,
          sizePrompt: 14,
          smoothing: true,
          separate: false,
        });
        expect(width(han, "var(--font-sans)")).toBe(nativeWidth);
      }
      root.style.removeProperty("--font-sans");
      probe.style.fontFamily = "var(--font-sans)";
      root.lang = "en";
      expect(getComputedStyle(probe).fontFamily).toContain("Cadro Han SC");
      root.lang = "ja";
      expect(getComputedStyle(probe).fontFamily).not.toContain("Cadro Han SC");
    } finally {
      probe.remove();
      if (language === null) root.removeAttribute("lang");
      else root.lang = language;
      if (style === null) root.removeAttribute("style");
      else root.setAttribute("style", style);
    }
  });

  it("uses the interface size for writing until a separate prompt size is selected", () => {
    const root = document.documentElement;
    const style = root.getAttribute("style");
    const preferences = {
      sans: "",
      content: "",
      sizeContent: 15,
      code: "",
      composer: "",
      sizeInterface: 20,
      sizePrompt: 14,
      sizeCode: 13,
      smoothing: true,
    };
    try {
      applyAppearanceFontVariables(root, { ...preferences, separate: false });
      expect(composerFontSize()).toBe("20px");
      expect(touchComposerFontSize()).toBe("20px");

      applyAppearanceFontVariables(root, { ...preferences, separate: true });
      expect(composerFontSize()).toBe("14px");
      // iOS zooms into inputs under 16px.
      expect(touchComposerFontSize()).toBe("16px");
    } finally {
      if (style === null) root.removeAttribute("style");
      else root.setAttribute("style", style);
    }
  });

  it("widens the numbered-list gutter only when the interface font's marker would clip", () => {
    const root = document.documentElement;
    const style = root.getAttribute("style");
    const gutter = (sans: string) => {
      applyAppearanceFontVariables(root, {
        sans,
        content: "",
        sizeContent: 15,
        code: "",
        composer: "",
        sizeInterface: 16,
        sizePrompt: 14,
        sizeCode: 13,
        smoothing: true,
        separate: false,
      });
      const markdown = document.createElement("div");
      markdown.className = "chat-markdown";
      markdown.style.fontSize = "14px";
      const list = document.createElement("ol");
      markdown.append(list);
      document.body.append(markdown);
      try {
        return Number.parseFloat(getComputedStyle(list).paddingInlineStart);
      } finally {
        markdown.remove();
      }
    };
    try {
      // `0. ` in a 14px monospace font is about 25px, past the 20px default.
      expect(gutter("monospace")).toBeGreaterThan(24);
      expect(gutter("sans-serif")).toBe(20);
    } finally {
      if (style === null) root.removeAttribute("style");
      else root.setAttribute("style", style);
    }
  });
});
