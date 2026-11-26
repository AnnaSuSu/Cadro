# Deploy Cadro

Run the backend on the machine that has your projects and agent CLIs. Cadro can serve its web client from the same server. For a separate static client, deploy to Cloudflare Pages and give the browser an HTTPS route to your backend.

All examples run from the repository root with Node.js 24.10+ and Corepack installed.

```sh
corepack enable pnpm
corepack pnpm install --frozen-lockfile
```

## Cloudflare Pages

1. Create a **Direct Upload** Pages project named `cadro-web`, using `main` as the production branch in this example. Use the Pages dashboard or run:

   ```sh
   pnpm dlx wrangler login
   pnpm dlx wrangler pages project create cadro-web --production-branch main
   ```

2. Build the static client, apply the Cadro icons to the build output and upload it. The project name comes from `wrangler.jsonc`. If you choose another name, update that file and substitute your real branch name below.

   ```sh
   pnpm build:pages
   node scripts/apply-web-brand-assets.ts production apps/web/dist
   pnpm dlx wrangler pages deploy apps/web/dist --branch main
   ```

3. Open the Pages URL, such as `https://cadro-web.pages.dev`. Use the next section to connect the client to your backend. You can also attach a custom domain to the Pages project.

To deploy from GitHub Actions, add `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` as repository secrets. Give the token **Cloudflare Pages: Edit** permission for the project's account. The deploy workflow runs on pushes to the default branch and supports manual runs. It skips deployment when either secret is missing. The Pages project must already exist. [Cloudflare Direct Upload guide](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/) · [Deploy workflow](../.github/workflows/deploy-pages.yml)

## Cloudflare Tunnel

1. On your agent host, build the bundled server and start it on loopback. Set `--allowed-origins` to your Pages origin. For multiple origins, pass a single comma-separated string.

   ```sh
   pnpm exec vp run --filter cadro build
   node apps/server/dist/bin.mjs serve \
     --host 127.0.0.1 --port 3773 \
     --allowed-origins https://cadro-web.pages.dev
   ```

   With a custom frontend domain, use its exact HTTPS origin, for example `https://workbench.example.com`. The flag controls browser CORS and Cadro always permits HTTPS Pages origins. Clients still authenticate with a pairing token.

2. Install `cloudflared` on the agent host. Create a named tunnel and route a backend hostname through it. Use a domain in your Cloudflare account and replace `cadro-api.example.com` below.

   ```sh
   cloudflared tunnel login
   cloudflared tunnel create cadro
   cloudflared tunnel route dns cadro cadro-api.example.com
   ```

   Save this as `~/.cloudflared/config.yml`. Substitute the tunnel UUID and the absolute path of the credentials file printed by `tunnel create`.

   ```yaml
   tunnel: <TUNNEL_UUID>
   credentials-file: /absolute/path/to/<TUNNEL_UUID>.json
   ingress:
     - hostname: cadro-api.example.com
       service: http://127.0.0.1:3773
     - service: http_status:404
   ```

   ```sh
   cloudflared tunnel run cadro
   ```

   Keep both processes running. The tunnel carries HTTP and WebSocket traffic from the backend HTTPS hostname to loopback on the agent host. [Cloudflare tunnel setup](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/create-local-tunnel/)

3. In another terminal on the host, mint a one-time pairing token:

   ```sh
   node apps/server/dist/bin.mjs pair
   ```

   On the Pages client, choose **Add pairing link** to open Connections. Use the manual connection option and enter `https://cadro-api.example.com` with the printed pairing token. You can also open a hosted pairing link with the backend URL encoded in `host` and the token in the fragment:

   ```text
   https://cadro-web.pages.dev/pair?host=https%3A%2F%2Fcadro-api.example.com#token=<PAIRING_TOKEN>
   ```

   Confirm the backend hostname before pairing. Mint a fresh token for each device.

## Tailscale or LAN

Build the bundled server on the host as above. For Tailscale, sign in on both devices and use Tailscale Serve:

```sh
node apps/server/dist/bin.mjs serve --host 127.0.0.1 --port 3773
# In a second terminal:
node apps/server/dist/bin.mjs pair --tailscale
```

Open the printed tailnet HTTPS pairing URL on the client. Cadro serves the web client from the same origin.

For a trusted LAN, bind to the host's LAN address. Replace the example IP with the address reachable by the client and allow TCP port `3773` on the host firewall for your LAN.

```sh
node apps/server/dist/bin.mjs serve --host 192.168.1.10 --port 3773
# In a second terminal:
node apps/server/dist/bin.mjs pair
```

Open the printed LAN pairing URL on the client. Chrome requires HTTPS for a remote connection from a Pages client to a public HTTP backend. Use the backend's bundled web client for an HTTP LAN connection, or use Tailscale HTTPS for Pages.

## Desktop self-build

Build and launch the Electron app with its bundled server and web client:

```sh
pnpm build:desktop
pnpm start:desktop
```

To create installers, run the target on its native operating system. These commands build the required bundles and put artifacts under `release/`.

| Host                 | Prerequisites                                                                                                               | Command                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| macOS, Apple Silicon | Xcode 26+ and Rust with `aarch64-apple-darwin`                                                                              | `pnpm dist:desktop:dmg:arm64` |
| macOS, Intel         | Xcode 26+ and Rust with `x86_64-apple-darwin`                                                                               | `pnpm dist:desktop:dmg:x64`   |
| Linux, x64           | Rust with `x86_64-unknown-linux-gnu`, C/C++ toolchain, libsecret headers, pkg-config, and ImageMagick                       | `pnpm dist:desktop:linux`     |
| Windows, x64         | Rust with `x86_64-pc-windows-msvc`, Python 3, and Visual Studio Build Tools with C++, the Windows SDK and Spectre libraries | `pnpm dist:desktop:win:x64`   |

Use `rustup target add <target>` to install the required Rust target. On Ubuntu 24.04, install the native dependencies with `sudo apt-get install build-essential libsecret-1-dev pkg-config imagemagick`.

Local macOS builds use ad-hoc signatures. Windows installers are unsigned by default. The GitHub release workflow builds on `v*` tags and can also be run manually against an existing tag. Set `CSC_LINK` and `CSC_KEY_PASSWORD` for Developer ID signing, plus `APPLE_API_KEY` (the key contents), `APPLE_API_KEY_ID`, and `APPLE_API_ISSUER` for notarization. Windows signing uses the optional Azure Trusted Signing secrets listed in the workflow. [Desktop release workflow](../.github/workflows/release-desktop.yml)

macOS can ask for access to **cadro Safe Storage** when Cadro reads encrypted
connection settings. Ad-hoc builds lack a stable Developer ID identity, so
replacing the app can prompt again. Use the same Developer ID for releases
and submit each release for notarization.
