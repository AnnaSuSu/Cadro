<p align="center">
  <img src="./assets/cadro/icon-256.png" width="88" height="88" alt="Cadro" />
</p>

# Cadro

Cadro is an open-source, self-hostable workbench for running multiple coding agents. The Codex-inspired desktop and web workspace supports Claude Code, Codex, OpenCode, Cursor, Antigravity, Kiro, Grok, Pi, Muse, and agents that speak the Agent Client Protocol (ACP). Install and sign in to the agents you want to use on the machine running Cadro.

- **Projects + Recents.** Organize threads in project folders and jump back into recent work from the sidebar. Review diffs and keep parallel work in separate Git worktrees.
- **Zero Telemetry / Zero Clerk / Zero Closed Relay.** Cadro sends no product analytics by default. Pairing and sessions are managed by your Cadro server. Optional OpenTelemetry exports go to endpoints you configure, and each provider uses its own account and network settings.
- **Cloudflare Pages + `cloudflared` Tunnel.** Serve the static web client on Pages, and connect it to your own backend over HTTPS and WebSockets. The backend runs agents and keeps project files and session state on your machine. Tailscale and LAN connections work directly.
- **Open Desktop Self-Build.** Build the Electron app and package macOS, Linux, and Windows installers from source without a signing account.

## Run locally

From this repository with Node.js 24.10+ and Corepack installed, run:

```sh
corepack pnpm install --frozen-lockfile && corepack pnpm dev
```

Open the pairing URL printed in the terminal. Add a project directory, then choose an agent you have configured on this machine.

For a desktop build, run `corepack pnpm build:desktop` and `corepack pnpm start:desktop`. See the deployment guide for production server setup, platform prerequisites and installers. [Deployment guide](./docs/DEPLOY.md)

## Audit the source

Run this from the root of your Git checkout to check production source and dependency manifests for known analytics SDKs, Clerk packages, and T3 hosted relay and connect URLs:

```sh
git grep -niE '@clerk/|electron-webauthn|clerk\.accounts\.dev|posthog-(js|node)|posthog\.com|api\.segment\.io|amplitude\.com|sentry\.io|(connect|relay)\.t3\.codes' \
  -- apps packages package.json pnpm-workspace.yaml pnpm-lock.yaml \
  ':(exclude,glob)**/*.test.*' ':(exclude,glob)**/i18n/**'
```

Git exits with status 1 when the patterns have no matches. To inspect the browser's runtime requests, open DevTools → Network, reload Cadro and start a thread. Provider traffic originates on the host running the agent.

## Roadmap

**Unified Cross-Harness MCP Layer.** A shared way to configure and use MCP servers across provider harnesses is planned for a later phase. Current integrations use each agent's existing MCP configuration.

## License and attribution

Cadro is MIT-licensed. Its orchestration and provider kernel derives from the MIT-licensed [`pingdotgg/t3code`](https://github.com/pingdotgg/t3code). Cadro is an independent open-source project with no affiliation with or endorsement by T3 Tools, Inc. [License](./LICENSE) · [Third-party notices](./THIRD-PARTY-NOTICES.md)
