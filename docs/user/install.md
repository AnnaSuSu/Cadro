# Install Cadro

## Desktop app

Download the installer from [Cadro Releases](https://github.com/AnnaSuSu/Cadro/releases/latest).
Choose the `arm64.dmg` for Apple silicon, the `x64.dmg` for Intel Macs, or the
`x64.exe` for Windows. On x86_64 Linux, choose the AppImage or Debian package.
The release includes a `SHA256SUMS` file for checking your download.

On macOS, open the disk image and drag Cadro into Applications. On Windows,
run the installer. On Linux, install the downloaded Debian package or mark the
AppImage executable and launch it.

## Requirements

Configure and authenticate a provider on the machine that will run your agents
before starting a thread. You can do this after opening Cadro.

## Command line

The desktop app includes the `cadro` command. Open **Settings → About** and
choose **Install** next to **cadro command**. Open a new terminal and run
`cadro --version`. If the folder needs to be added to your PATH, use **Add to PATH**.

For a standalone server built from this repository, follow the
[deployment guide](../DEPLOY.md).

### Windows Subsystem for Linux

Choose a WSL distro in **Settings → Sharing & access** to run agents and projects
there. Install the provider CLIs inside that distro. Cadro installs its own
server runtime there automatically; the first launch after an app update can
take longer.

### Open a project from a terminal

With the desktop app already running on the same machine:

```bash
cadro app
```

This opens a new thread for the current directory, adding the project if needed.
Pass a path, such as `cadro app ../my-project`, to open another directory. It requires
the desktop app, so a standalone server or an SSH session is not enough. If the
command cannot reach the app, start or update the desktop app and try again.

### Drop a folder on the sidebar

Drag one or more folders from Finder, Explorer, or your file manager onto the
sidebar. Each one opens as a project on this computer, the same as `cadro app`.
Files dropped on a thread still attach to that thread. Browsers do not share
folder paths, so in the web app use **Add project** instead.

## Providers

Open **Settings → Providers** in the web or desktop app, select the environment,
and enable the provider you want. Installation, login, and configuration belong
to that environment's machine, even when you connect from a phone or another
computer.

| Provider            | Install and authenticate                                                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codex               | [Connect with ChatGPT](./providers-codex.md#connect-with-chatgpt), or install [Codex CLI](https://developers.openai.com/codex/cli) and run `codex login`. |
| Claude              | Install [Claude Code](https://claude.com/product/claude-code), then run `claude auth login`.                                                              |
| Cursor              | Install [Cursor CLI](https://cursor.com/cli), then run `agent login`.                                                                                     |
| Grok Build          | Install [Grok Build CLI](https://x.ai/cli), then run `grok login`.                                                                                        |
| Kiro                | Install [Kiro CLI](https://kiro.dev/docs/cli/), then run `kiro-cli login`.                                                                                |
| OpenCode            | Install [OpenCode](https://opencode.ai), then run `opencode auth login`.                                                                                  |
| Antigravity         | Install and sign in with Google from Cadro's provider settings.                                                                                           |
| Pi                  | Install [Pi](./providers-pi.md#set-up-pi) with Node.js 22.19 or newer, then run `pi` and `/login`.                                                        |
| Muse Code           | Install [Muse Code](https://dev.meta.ai/docs/muse-code) on the server, run `muse login`, then enable it in Settings → Providers.                          |
| fx                  | Install [fx](https://fx.sh) with `curl -fsSL https://fx.sh/setup.sh \| bash`, then run `fx login`.                                                        |
| ACP Registry agents | Add GitHub Copilot and other [ACP agents](./providers-acp.md#add-an-agent) from **Settings → Providers → Add provider → Show more**.                      |

Provider CLIs must be on the server's `PATH`. If Cadro cannot find one, set its
**Binary path** in provider settings, especially when using a version manager.
Cursor's executable is `cursor-agent`, although its login command is
`agent login`. Codex connected through ChatGPT and Antigravity can use their
managed runtimes without a `PATH` entry.

Cadro warns when a provider version has known compatibility problems with your
release. Check **Settings → Providers** on that environment for the recommended
version or range. When its package manager supports installing a specific version,
you can install the recommendation there. Otherwise use the provider's installer
on the environment's machine. An unlisted version is unverified.

When a provider CLI is behind its latest release, its provider card shows the
available version. **Update now** runs the installer that owns the CLI
(Homebrew, mise, or a global npm, pnpm, Yarn, Bun, Volta, or Vite+ install), or
the CLI's own update command when Cadro cannot tell. Claude, Codex, and
OpenCode installs Cadro cannot identify stay manual: update them through the
installer you used. Cadro runs `mise upgrade`
only for a tool your mise config requests as `latest` when the provider's binary
path is a mise shim or under the tool's `installs/<tool>/latest` link; update a
pinned version, or a path into one version's directory, through mise yourself.
Update a CLI installed with Nix through Nix.
Cursor and Antigravity update with Cadro. Homebrew and Chocolatey installs
compare against the version their package manager offers, which can trail the
npm release; update Claude installed with Chocolatey through Chocolatey.

The managed runtimes for Antigravity and for Codex connected through ChatGPT
first install the release Cadro tested. When Cadro finds a newer compatible
release, their setup in **Settings → Providers** offers an update.

Add another provider instance for a separate account or configuration. Each
instance can have its own environment variables, such as API keys or a custom
base URL. Mark secret values as sensitive; after saving, Cadro does not display
their original values.

For provider-specific setup and accounts, see [Codex](./providers-codex.md),
[Claude](./providers-claude.md), [OpenCode](./providers-opencode.md),
[Antigravity](./providers-antigravity.md), [Kiro](./providers-kiro.md),
[Pi](./providers-pi.md), [Muse Code](./providers-muse.md), [fx](./providers-fx.md), and
[ACP Registry agents](./providers-acp.md).

### Provider check timeouts

If a provider works in its CLI but Cadro reports a timeout while checking it,
allow more time in the Cadro server's environment. For example, give Codex and
Claude readiness checks 60 seconds:

```bash
CADRO_CODEX_PROBE_TIMEOUT_MS=60000 CADRO_CLAUDE_PROBE_TIMEOUT_MS=60000 cadro serve
```

For a remote environment, set these on the machine running the Cadro server.
Keep them in your launcher or service configuration to retain them across
updates, then restart the server. For systemd, add
`Environment=CADRO_CODEX_PROBE_TIMEOUT_MS=60000` under `[Service]` in a service
override, reload systemd, and restart the service. Provider instances can also
set their own overrides in Settings → Providers.

Each variable extends that provider's readiness-probe deadlines; a phase whose
default is already longer keeps its default. Providers with several phases can
take longer than one deadline in total. Values must be whole milliseconds no
greater than 2147483647; unset or invalid values keep the defaults.

| Provider            | Environment variable                  |
| ------------------- | ------------------------------------- |
| Codex               | `CADRO_CODEX_PROBE_TIMEOUT_MS`        |
| Claude              | `CADRO_CLAUDE_PROBE_TIMEOUT_MS`       |
| Cursor              | `CADRO_CURSOR_PROBE_TIMEOUT_MS`       |
| Antigravity         | `CADRO_ANTIGRAVITY_PROBE_TIMEOUT_MS`  |
| Grok                | `CADRO_GROK_PROBE_TIMEOUT_MS`         |
| Kiro                | `CADRO_KIRO_PROBE_TIMEOUT_MS`         |
| fx                  | `CADRO_FX_PROBE_TIMEOUT_MS`           |
| Pi                  | `CADRO_PI_PROBE_TIMEOUT_MS`           |
| Muse Code           | `CADRO_MUSE_PROBE_TIMEOUT_MS`         |
| OpenCode            | `CADRO_OPENCODE_PROBE_TIMEOUT_MS`     |
| ACP Registry agents | `CADRO_ACP_REGISTRY_PROBE_TIMEOUT_MS` |

Longer deadlines also take longer to report a stalled check. These overrides
cover readiness and discovery, including OpenCode server startup. Usage and
config enrichment retain their own shorter limits. Turn execution, package
installation, update checks, and shutdown limits keep their existing behavior.

## Next steps

- [Working with threads](./thread-sidebar.md): start tasks and organize parallel work.
- [Permission modes](./permission-modes.md): choose when agents ask before acting.
- [Remote access](./remote-access.md): connect from another device.
- [Running in the background](./background-service.md): keep a host available.
- [Updating Cadro](./updating.md): update the app and connected servers.
- [Managed policy](./managed-policy.md): configure Cadro for everyone on a machine.
