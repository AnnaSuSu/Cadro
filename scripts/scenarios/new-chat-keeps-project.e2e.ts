/// <reference lib="dom" />
import { expect } from "e2e";

import { test, WEB } from "./cadro.ts";

test(
  "New chat stays in its project while standalone chats remain in Recents",
  WEB,
  async ({ cadro, app, browser, screen }) => {
    const project = await cadro.project("scenario-scratch");
    const standalone = await cadro.thread({ project, title: "Scratch work", messages: ["Start"] });
    const workspace = await cadro.project("cadro-example");
    await cadro.project("another-workspace");
    const current = await cadro.thread({
      project: workspace,
      title: "Project work",
      messages: ["Start"],
    });

    // The scenario home is inside a Git checkout, where the server disables native scratch.
    // Advertise the seeded workspace as scratch while leaving the real project and thread in place.
    await browser.addInitScript((scratchWorkspaceRoot) => {
      const configRequests = new WeakMap<WebSocket, string>();
      const send = WebSocket.prototype.send;
      WebSocket.prototype.send = function (data) {
        if (typeof data === "string") {
          for (const request of [JSON.parse(data)].flat()) {
            if (request?._tag === "Request" && request.tag === "subscribeServerConfig") {
              configRequests.set(this, String(request.id));
            }
          }
        }
        return send.call(this, data);
      };
      const addEventListener = WebSocket.prototype.addEventListener;
      WebSocket.prototype.addEventListener = function (
        this: WebSocket,
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
      ) {
        if (type !== "message" || typeof listener !== "function") {
          return addEventListener.call(this, type, listener, options);
        }
        return addEventListener.call(
          this,
          type,
          (event: Event) => {
            const data = (event as MessageEvent).data;
            if (typeof data !== "string") return listener.call(this, event);
            const parsed = JSON.parse(data);
            let changed = false;
            for (const message of [parsed].flat()) {
              if (
                message?._tag !== "Chunk" ||
                String(message.requestId) !== configRequests.get(this)
              )
                continue;
              for (const value of message.values) {
                if (value.type === "snapshot") {
                  value.config.scratchWorkspaceRoot = scratchWorkspaceRoot;
                  changed = true;
                }
              }
            }
            return listener.call(
              this,
              changed ? new MessageEvent("message", { data: JSON.stringify(parsed) }) : event,
            );
          },
          options,
        );
      } as typeof WebSocket.prototype.addEventListener;
    }, project);

    await cadro.open(standalone);
    await expect(screen.getByRole("heading", "Recents")).toBeVisible();
    await expect(screen.getByRole("button", "Scratch work", { exact: true })).toBeVisible();
    await expect(screen.getByTestId("sidebar-project-folder")).toHaveCount(2);

    await cadro.open(current);
    await screen.getByRole("button", "New chat", { exact: true }).tap();
    await expect(browser.locator("[data-draft-project-trigger]")).toContainText("cadro-example");
    await app.screenshot("new-chat-current-project");
  },
);
