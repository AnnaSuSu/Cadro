import { Alert, AlertDescription } from "../ui/alert";
import type { AuthSessionState } from "@cadro/contracts";
import { squashAtomCommandFailure } from "@cadro/client-runtime/state/runtime";
import { msg, T, useGT, useMessages, Var } from "gt-react";
import React, {
  startTransition,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { connectPairing } from "../../connection/onboarding";
import {
  peekPairingTokenFromUrl,
  stripPairingTokenFromUrl,
  submitServerAuthCredential,
} from "../../environments/primary";
import { readHostedPairingRequest } from "../../hostedPairing";
import { resolveRemotePairingTarget, setPairingTokenOnUrl } from "@cadro/shared/remote";
import { CadroMark } from "../CadroBrand";
import { CommandBlock } from "../CommandBlock";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { StandalonePage, StandalonePageHeader } from "../ui/standalone-page";
import { useAtomCommand } from "../../state/use-atom-command";
import { m, type MessageResolver } from "../../i18n/messages";

export function PairingPendingSurface() {
  const gt = useGT();
  return (
    <StandalonePage>
      <StandalonePageHeader
        title={gt("Pairing with this environment")}
        description={gt("Validating the pairing link and preparing your session.")}
      />
    </StandalonePage>
  );
}

function HostConnectionCard({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <section className="w-full max-w-[440px] rounded-2xl border border-border bg-(--surface-raised) p-6 text-foreground shadow-sm sm:p-7">
      <CadroMark aria-hidden className="size-8 text-foreground" />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h1>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      {children}
      <details className="mt-5 border-t border-border/70 pt-4 text-sm text-muted-foreground">
        <summary className="cursor-pointer font-medium">
          <T>Self-host quickstart</T>
        </summary>
        <div className="mt-3 space-y-2">
          <CommandBlock command="cadro --host 0.0.0.0 --port 3773" />
          <CommandBlock command="cloudflared tunnel --url http://localhost:3773" />
          <p>
            <T>Generate a pairing token on the host.</T>
          </p>
          <CommandBlock command="cadro pair" />
        </div>
      </details>
    </section>
  );
}

function HostConnectionFields({
  host,
  onHostChange,
  token,
  onTokenChange,
  disabled,
}: {
  host: string;
  onHostChange: (value: string) => void;
  token: string;
  onTokenChange: (value: string) => void;
  disabled: boolean;
}) {
  const gt = useGT();
  const hostId = useId();
  return (
    <>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor={hostId}>
          <T>Host URL</T>
        </label>
        <Input
          id={hostId}
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          disabled={disabled}
          inputMode="url"
          nativeInput
          onChange={(event) => onHostChange(event.currentTarget.value)}
          placeholder="http://127.0.0.1:3773"
          spellCheck={false}
          required
          value={host}
        />
        <p className="text-xs text-muted-foreground">
          <T>
            For a tunnel, use its public HTTPS URL, such as{" "}
            <code>https://your-host.trycloudflare.com</code>.
          </T>
        </p>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor={`${hostId}-token`}>
          <T>Pairing token</T>
        </label>
        <Input
          id={`${hostId}-token`}
          type="password"
          autoComplete="off"
          disabled={disabled}
          nativeInput
          onChange={(event) => onTokenChange(event.currentTarget.value)}
          placeholder={gt("Paste a one-time token or pairing secret")}
          required
          value={token}
        />
      </div>
    </>
  );
}

const connectionPageClass =
  "flex min-h-0 w-full flex-1 items-center-safe justify-center overflow-y-auto scrollbar-gutter-both bg-background px-4 py-10";

export function HostedHostConnectionCard({ onConnected }: { onConnected: () => void }) {
  const gt = useGT();
  const [host, setHost] = useState("");
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const connect = useAtomCommand(connectPairing, { reportFailure: false });

  return (
    <HostConnectionCard title={gt("Connect to Cadro Host")}>
      <form
        className="mt-5 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const pairingCode = token.trim();
          if (submitting || !pairingCode || !host.trim()) return;
          setSubmitting(true);
          setError("");
          const result = await connect({ host: host.trim(), pairingCode });
          setSubmitting(false);
          if (result._tag === "Success") {
            setToken("");
            onConnected();
          } else {
            setError(errorMessageFromUnknown(squashAtomCommandFailure(result)));
          }
        }}
      >
        <HostConnectionFields
          host={host}
          onHostChange={setHost}
          token={token}
          onTokenChange={setToken}
          disabled={submitting}
        />
        {error ? (
          <Alert variant="error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Button
          className="w-full"
          size="sm-pill"
          type="submit"
          disabled={submitting || !host.trim() || !token.trim()}
        >
          {submitting ? gt("Pairing...") : gt("Connect")}
        </Button>
      </form>
    </HostConnectionCard>
  );
}

export function HostedManualPairingSurface({ onConnected }: { onConnected: () => void }) {
  return (
    <main className={`h-full ${connectionPageClass}`}>
      <HostedHostConnectionCard onConnected={onConnected} />
    </main>
  );
}

export function PairingRouteSurface({
  auth,
  initialErrorMessage,
  onAuthenticated,
}: {
  auth: AuthSessionState["auth"];
  initialErrorMessage?: string;
  onAuthenticated: () => void;
}) {
  const gt = useGT();
  const messages = useMessages();
  const [autoPairToken] = useState(peekPairingTokenFromUrl);
  const [credential, setCredential] = useState(autoPairToken ?? "");
  const [localHost] = useState(() => window.location.origin);
  const [host, setHost] = useState(localHost);
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const autoSubmitAttemptedRef = useRef(false);

  const submitCredential = async (nextCredential: string) => {
    setIsSubmitting(true);
    setErrorMessage("");

    const submitError = await submitServerAuthCredential(nextCredential).then(
      () => null,
      (error) => errorMessageFromUnknown(error),
    );

    setIsSubmitting(false);

    if (submitError) {
      setErrorMessage(submitError);
      return;
    }

    startTransition(() => {
      onAuthenticated();
    });
  };

  const handleSubmit = async (event?: React.SubmitEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (isSubmitting || !credential.trim() || !host.trim()) return;
    const pairingCode = credential.trim();
    let url: URL;
    try {
      const target = resolveRemotePairingTarget({ host: host.trim(), pairingCode });
      url = new URL("/pair", target.httpBaseUrl);
    } catch (error) {
      setErrorMessage(errorMessageFromUnknown(error));
      return;
    }
    if (url.origin === localHost) {
      await submitCredential(pairingCode);
      return;
    }

    // A direct-host session cookie has to be issued on the destination origin.
    window.location.assign(setPairingTokenOnUrl(url, pairingCode));
  };

  const autoSubmit = useEffectEvent((token: string) => {
    void submitCredential(token);
  });

  // oxlint-disable-next-line cadro/no-unreasoned-state-sync -- strips the pairing token from the URL and submits it once when the route carries one
  useEffect(() => {
    if (!autoPairToken || autoSubmitAttemptedRef.current) {
      return;
    }

    autoSubmitAttemptedRef.current = true;
    stripPairingTokenFromUrl();
    autoSubmit(autoPairToken);
  }, [autoPairToken]);

  return (
    <main className={`h-full ${connectionPageClass}`}>
      <HostConnectionCard
        title={gt("Connect to Cadro Host")}
        description={describeAuthGate(auth.bootstrapMethods, messages)}
      >
        <form className="mt-5 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <HostConnectionFields
            host={host}
            onHostChange={(value) => {
              setHost(value);
              if (autoPairToken && credential === autoPairToken) setCredential("");
            }}
            token={credential}
            onTokenChange={setCredential}
            disabled={isSubmitting}
          />
          {errorMessage ? (
            <Alert variant="error">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}
          <Button
            className="w-full"
            size="sm-pill"
            type="submit"
            disabled={isSubmitting || !host.trim() || !credential.trim()}
          >
            {isSubmitting ? gt("Pairing...") : gt("Connect")}
          </Button>
        </form>
      </HostConnectionCard>
    </main>
  );
}

export function HostedPairingRouteSurface() {
  const connectPairingEnvironment = useAtomCommand(connectPairing, {
    reportFailure: false,
  });
  const [request] = useState(readHostedPairingRequest);
  // The origin shows the scheme along with the host.
  const [origin] = useState(() => {
    if (!request) return null;
    try {
      return new URL(
        resolveRemotePairingTarget({ host: request.host, pairingCode: request.token }).httpBaseUrl,
      ).origin;
    } catch {
      return null;
    }
  });
  const gt = useGT();
  const [status, setStatus] = useState<"confirm" | "pairing" | "paired" | "error">(
    origin ? "confirm" : "error",
  );
  const [message, setMessage] = useState(() =>
    origin
      ? m(msg("This link adds a backend to this browser. Continue only if you trust it."))
      : request
        ? m(msg("This pairing link has an invalid backend host."))
        : m(msg("This pairing link is missing its backend host or token.")),
  );
  const [canRetry, setCanRetry] = useState(false);
  // Nothing is sent to the link's host until the user confirms.
  // The token stays in the URL until then: the root route picks this page from it.
  const tokenSubmittedRef = useRef(false);

  const submitHostedPairingRequest = async () => {
    if (!request) {
      setStatus("error");
      setMessage(gt("This pairing link is missing its backend host or token."));
      setCanRetry(false);
      return;
    }

    if (tokenSubmittedRef.current) {
      setStatus("error");
      setMessage(
        gt("This one-time pairing token was already submitted. Request a new pairing link."),
      );
      setCanRetry(false);
      return;
    }

    setStatus("pairing");
    setMessage(gt("Connecting to this backend."));
    setCanRetry(false);
    tokenSubmittedRef.current = true;
    stripPairingTokenFromUrl();

    const result = await connectPairingEnvironment({
      host: request.host,
      pairingCode: request.token,
    });
    if (result._tag === "Success") {
      setStatus("paired");
      setMessage(
        request.label
          ? gt("{environment} is saved in this browser.", { environment: request.label })
          : gt("The environment is saved in this browser."),
      );
      return;
    }

    tokenSubmittedRef.current = false;
    setStatus("error");
    setCanRetry(true);
    setMessage(
      gt(
        "{error} If the backend accepted this one-time token, request a new pairing link before retrying.",
        { error: errorMessageFromUnknown(squashAtomCommandFailure(result)) },
      ),
    );
  };

  const title =
    status === "paired"
      ? gt("Backend paired")
      : status === "error"
        ? gt("Pairing failed")
        : gt("Connect to Cadro Host");

  return (
    <main className={`h-full ${connectionPageClass}`}>
      <HostConnectionCard title={title} description={message}>
        {request ? (
          <div className="mt-5 rounded-lg border border-border/70 bg-background/55 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
            <T>
              Host:{" "}
              <span className="font-mono text-foreground/80">
                <Var>{origin ?? request.host}</Var>
              </span>
            </T>
          </div>
        ) : null}

        {status === "error" ? (
          <Alert variant="error" className="mt-5">
            <AlertDescription>
              <T>
                Verify the backend is reachable from this browser, supports CORS for hosted clients,
                and is served over HTTPS when opening this page from HTTPS.
              </T>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          {status === "confirm" ? (
            <>
              <Button size="sm-pill" onClick={() => void submitHostedPairingRequest()}>
                <T>Connect</T>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  stripPairingTokenFromUrl();
                  window.location.href = "/";
                }}
              >
                <T>Cancel</T>
              </Button>
            </>
          ) : status === "pairing" ? (
            <Button disabled size="sm">
              <T>Pairing...</T>
            </Button>
          ) : canRetry ? (
            <Button size="sm-pill" onClick={() => void submitHostedPairingRequest()}>
              <T>Try again</T>
            </Button>
          ) : null}
          {status === "paired" ? (
            <Button size="sm" variant="outline" onClick={() => (window.location.href = "/")}>
              <T>Open app</T>
            </Button>
          ) : null}
        </div>
      </HostConnectionCard>
    </main>
  );
}

function errorMessageFromUnknown(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return m(msg("Authentication failed."));
}

function describeAuthGate(
  bootstrapMethods: ReadonlyArray<string>,
  resolve: MessageResolver,
): string {
  if (bootstrapMethods.includes("desktop-bootstrap")) {
    return resolve(
      msg("This environment expects a trusted pairing credential before the app can connect."),
    );
  }

  return resolve(msg("Enter a pairing token to start a session with this environment."));
}
