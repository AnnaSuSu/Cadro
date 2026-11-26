# FAQ

## What does Cadro run?

Cadro connects to coding agents on the machine that hosts your project files.
Choose a configured provider to start a conversation. [Provider setup](./install.md#providers)

## Which desktop installer do I need?

Choose the macOS Apple silicon or Intel disk image, the Windows x64 installer,
or the Linux x86_64 AppImage or Debian package from [Cadro Releases](https://github.com/AnnaSuSu/Cadro/releases/latest).

## Can I use separate work and personal logins?

Add a provider instance for the second account. For Codex, the independent home
field is optional. Enter a separate home when you want to keep two CLI logins.
[Codex account setup](./providers-codex.md#multiple-cli-logins)

## Can I use an API key or OpenRouter instead of a subscription?

Yes. Add another provider instance in Settings and give it its own keys and endpoint. Claude has a full OpenRouter recipe. Your subscription setup stays untouched. [OpenRouter](./providers-claude.md#openrouter) · [Provider instances](./install.md#providers)

## How do I use Cadro remotely?

Run Cadro on the machine that has your agents and project files. Pair the web client with that machine over your LAN, Tailscale or a self-hosted HTTPS route. [Deployment guide](../DEPLOY.md)

## How do I use Cadro on my phone?

Open the Cadro web client on your phone and connect it to the machine running your agents. That machine needs to stay on. [Private network setup](../DEPLOY.md#tailscale-or-lan)

## Worktrees are eating my disk. How do I clean them up?

Open **Settings → Worktrees → Cleanup** and turn on automatic worktree cleanup. You can also run it now from there. Worktrees add up fast. One user cleared 500 GB. [Storage cleanup](./project-settings.md#storage-cleanup)

## Is there voice input?

Yes. On iPhone and Android, dictation uses on-device speech by default, with the option to use a paired environment. On macOS 26 or later, desktop users can choose Apple Speech directly under **On this Mac** or choose an environment. Web and other desktop users can enable dictation by choosing an environment. The transcript goes into your draft for review. See [Voice input](./voice-input.md).

## Why is my provider missing?

Check that the provider CLI is installed and signed in on the machine running
Cadro. In **Settings → Providers**, check its status and executable path.
[Codex settings](./providers-codex.md) · [Other providers](./install.md#providers)

## Source code and attribution

Cadro derives from the MIT-licensed T3 Code project. The [README](../../README.md)
describes Cadro's features, and the [third-party notices](../../THIRD-PARTY-NOTICES.md)
credit the upstream project and other dependencies.
