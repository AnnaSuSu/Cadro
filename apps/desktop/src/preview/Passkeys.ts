import type { Session, WebFrameMain } from "electron";
import { app, BrowserWindow, dialog, webContents as electronWebContents } from "electron";
import { msg } from "gt-i18n";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import * as DesktopEnvironment from "../app/DesktopEnvironment.ts";
import { m } from "../i18n/messages.ts";

const PasskeyPackageMetadata = Schema.Struct({
  t3codeWebAuthn: Schema.optional(
    Schema.Struct({
      touchIdKeychainAccessGroup: Schema.optional(Schema.String),
    }),
  ),
});
const decodePasskeyPackageMetadata = Schema.decodeEffect(
  Schema.fromJsonString(PasskeyPackageMetadata),
);

export class PreviewPasskeysConfigureError extends Schema.TaggedError<PreviewPasskeysConfigureError>()(
  "PreviewPasskeysConfigureError",
  {
    keychainAccessGroup: Schema.String,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return `Failed to enable Touch ID passkeys for the in-app browser (keychain group ${this.keychainAccessGroup}).`;
  }
}

export class PreviewPasskeys extends Context.Service<
  PreviewPasskeys,
  {
    /** Runs after app ready. */
    readonly configure: Effect.Effect<void>;
    readonly installSessionHandlers: (session: Session) => void;
  }
>()("@cadro/desktop/preview/Passkeys/PreviewPasskeys") {}

const accountLabel = (account: Electron.WebAuthnAccount) =>
  account.displayName && account.name && account.displayName !== account.name
    ? `${account.displayName} (${account.name})`
    : (account.name ?? account.displayName ?? m(msg("Unnamed passkey")));

const ownerWindow = (frame: WebFrameMain | null) => {
  const contents = frame ? electronWebContents.fromFrame(frame) : undefined;
  const owner = contents?.hostWebContents ?? contents;
  return owner ? BrowserWindow.fromWebContents(owner) : null;
};

const chooseAccount = async (details: Electron.SelectWebauthnAccountDetails) => {
  const [onlyAccount] = details.accounts;
  // The Touch ID prompt that follows already asks the user to confirm.
  if (details.accounts.length === 1) return onlyAccount?.credentialId;
  const options: Electron.MessageBoxOptions = {
    type: "none",
    message: m(msg("Choose a passkey")),
    detail: details.relyingPartyId,
    buttons: [...details.accounts.map(accountLabel), m(msg("Cancel"))],
    cancelId: details.accounts.length,
    defaultId: 0,
    noLink: true,
  };
  const parent = ownerWindow(details.frame);
  const { response } = parent
    ? await dialog.showMessageBox(parent, options)
    : await dialog.showMessageBox(options);
  return details.accounts[response]?.credentialId;
};

const make = Effect.gen(function* () {
  const environment = yield* DesktopEnvironment.DesktopEnvironment;
  const fileSystem = yield* FileSystem.FileSystem;

  const metadata =
    environment.platform === "darwin" && environment.isPackaged
      ? yield* fileSystem
          .readFileString(environment.path.join(environment.appRoot, "package.json"))
          .pipe(
            Effect.flatMap(decodePasskeyPackageMetadata),
            Effect.map((parsed) => parsed.t3codeWebAuthn),
            Effect.orElseSucceed(() => undefined),
          )
      : undefined;
  const keychainAccessGroup = metadata?.touchIdKeychainAccessGroup;
  const sessionsWithHandlers = new WeakSet<Session>();

  return PreviewPasskeys.of({
    configure: Effect.gen(function* () {
      if (keychainAccessGroup === undefined) return;
      yield* Effect.try({
        try: () => app.configureWebAuthn({ touchID: { keychainAccessGroup } }),
        catch: (cause) => new PreviewPasskeysConfigureError({ keychainAccessGroup, cause }),
      }).pipe(Effect.catch((error) => Effect.logWarning(error.message, { cause: error.cause })));
    }).pipe(Effect.withSpan("desktop.previewPasskeys.configure")),
    installSessionHandlers: (session) => {
      if (sessionsWithHandlers.has(session)) return;
      sessionsWithHandlers.add(session);
      session.on("select-webauthn-account", (_event, details, callback) => {
        // The request stays pending until the callback runs, so it must run once.
        void chooseAccount(details).then(
          (credentialId) => callback(credentialId),
          () => callback(),
        );
      });
    },
  });
}).pipe(Effect.withSpan("PreviewPasskeys.make"));

export const layer = Layer.effect(PreviewPasskeys, make);
