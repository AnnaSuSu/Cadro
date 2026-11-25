import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import { afterEach, beforeEach, vi } from "vite-plus/test";

const electron = vi.hoisted(() => ({
  configureWebAuthn: vi.fn(),
  showMessageBox: vi.fn(),
  fromWebContents: vi.fn(),
}));

vi.mock("electron", () => ({
  app: { configureWebAuthn: electron.configureWebAuthn },
  dialog: { showMessageBox: electron.showMessageBox },
  BrowserWindow: { fromWebContents: electron.fromWebContents },
  webContents: { fromFrame: () => undefined },
}));

import * as DesktopEnvironment from "../app/DesktopEnvironment.ts";
import * as PreviewPasskeys from "./Passkeys.ts";

const layerFor = (packageJson: object, isPackaged = true) =>
  PreviewPasskeys.layer.pipe(
    Layer.provide(
      Layer.succeed(
        DesktopEnvironment.DesktopEnvironment,
        DesktopEnvironment.DesktopEnvironment.of({
          platform: "darwin",
          isPackaged,
          appRoot: "/app",
          path: { join: (...parts: ReadonlyArray<string>) => parts.join("/") },
        } as DesktopEnvironment.DesktopEnvironment["Service"]),
      ),
    ),
    Layer.provide(
      FileSystem.layerNoop({
        readFileString: () => Effect.succeed(JSON.stringify(packageJson)),
      }),
    ),
  );

describe("PreviewPasskeys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    electron.fromWebContents.mockReturnValue({
      isDestroyed: () => false,
      getNativeWindowHandle: () => Buffer.from([1]),
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.effect("configures Touch ID only for packaged builds with a keychain group", () =>
    Effect.gen(function* () {
      const entitled = yield* PreviewPasskeys.PreviewPasskeys.pipe(
        Effect.provide(
          layerFor({
            t3codeWebAuthn: {
              touchIdKeychainAccessGroup: "ABC1234567.dev.cadro.app.webauthn",
            },
          }),
        ),
      );
      yield* entitled.configure;
      assert.deepStrictEqual(electron.configureWebAuthn.mock.calls, [
        [{ touchID: { keychainAccessGroup: "ABC1234567.dev.cadro.app.webauthn" } }],
      ]);

      const unpackaged = yield* PreviewPasskeys.PreviewPasskeys.pipe(
        Effect.provide(layerFor({ t3codeWebAuthn: { touchIdKeychainAccessGroup: "X" } }, false)),
      );
      yield* unpackaged.configure;
      assert.strictEqual(electron.configureWebAuthn.mock.calls.length, 1);
    }),
  );

  it.effect("asks which passkey to use only when a site has several", () =>
    Effect.gen(function* () {
      const passkeys = yield* PreviewPasskeys.PreviewPasskeys;
      const listeners: Array<(...args: ReadonlyArray<unknown>) => void> = [];
      const session = {
        on: (_event: string, listener: (...args: ReadonlyArray<unknown>) => void) =>
          listeners.push(listener),
      } as unknown as Electron.Session;
      passkeys.installSessionHandlers(session);
      passkeys.installSessionHandlers(session);
      assert.strictEqual(listeners.length, 1);

      const select = (accounts: ReadonlyArray<Electron.WebAuthnAccount>) =>
        Effect.promise(
          () =>
            new Promise<unknown>((resolve) =>
              listeners[0]?.(
                {},
                { relyingPartyId: "example.com", accounts, frame: null },
                (credentialId?: string) => resolve(credentialId),
              ),
            ),
        );
      const alice = { credentialId: "alice", name: "alice@example.com" };
      const bob = { credentialId: "bob", displayName: "Bob", name: "bob@example.com" };

      assert.strictEqual(yield* select([alice]), "alice");
      assert.strictEqual(electron.showMessageBox.mock.calls.length, 0);

      electron.showMessageBox.mockResolvedValueOnce({ response: 1 });
      assert.strictEqual(yield* select([alice, bob]), "bob");
      assert.deepStrictEqual(electron.showMessageBox.mock.calls[0]?.[0]?.buttons, [
        "alice@example.com",
        "Bob (bob@example.com)",
        "Cancel",
      ]);

      electron.showMessageBox.mockResolvedValueOnce({ response: 2 });
      assert.isUndefined(yield* select([alice, bob]));
    }).pipe(Effect.provide(layerFor({}))),
  );
});
