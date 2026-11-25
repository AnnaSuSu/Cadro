import * as NodeServices from "@effect/platform-node/NodeServices";
import * as NetService from "@cadro/shared/Net";
import { expect, it } from "@effect/vitest";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import { Command } from "effect/cli";
import { HttpRouter, HttpServerResponse } from "effect/http";
import { describe } from "vite-plus/test";

import { resolveServerConfig, sharedServerCommandFlags } from "./cli/config.ts";
import * as ServerConfig from "./config.ts";
import { layerBrowserApiCors } from "./http.ts";

const environmentUrl = "http://127.0.0.1:3773/api/environment";

const serveCors = (overrides: Partial<ServerConfig.ServerConfig["Service"]> = {}) => {
  const route = HttpRouter.add(
    "GET",
    "/api/environment",
    HttpServerResponse.empty({
      status: 401,
      headers: { "www-authenticate": 'DPoP error="use_dpop_nonce"', "dpop-nonce": "test-nonce" },
    }),
  );
  const config = Layer.effect(
    ServerConfig.ServerConfig,
    Effect.map(ServerConfig.ServerConfig, (config) => ({ ...config, ...overrides })),
  ).pipe(Layer.provide(ServerConfig.layerTest(process.cwd(), { prefix: "self-host-cors-" })));
  const app = Layer.merge(route, layerBrowserApiCors).pipe(
    Layer.provide(config),
    Layer.provide(NodeServices.layer),
  );
  const { handler, dispose } = HttpRouter.toWebHandler(app, { disableLogger: true });
  return { handler, [Symbol.asyncDispose]: dispose };
};

const preflight = (origin: string, privateNetwork = false) =>
  new Request(environmentUrl, {
    method: "OPTIONS",
    headers: {
      origin,
      "access-control-request-method": "GET",
      "access-control-request-headers": "authorization, dpop",
      ...(privateNetwork ? { "access-control-request-private-network": "true" } : {}),
    },
  });

describe("self-host browser API CORS", () => {
  it("allows Pages to preflight loopback access with DPoP headers", async () => {
    await using server = serveCors();
    const origin = "https://my-app.pages.dev";
    const response = await server.handler(preflight(origin, true));

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-private-network")).toBe("true");
    expect(response.headers.get("access-control-allow-origin")).toBe(origin);
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
    expect(response.headers.get("access-control-allow-headers")?.split(/,\s*/)).toContain("dpop");
    expect(response.headers.get("vary")).toBe("Origin, Access-Control-Request-Private-Network");

    const publicNetwork = await server.handler(preflight(origin));
    expect(publicNetwork.headers.get("access-control-allow-private-network")).toBeNull();
    expect(publicNetwork.headers.get("vary")).toBe(response.headers.get("vary"));
  });

  it("allows Pages with devUrl set and exposes DPoP challenges on the actual response", async () => {
    await using server = serveCors({ devUrl: new URL("http://127.0.0.1:5733") });
    const origin = "https://preview.pages.dev";
    const options = await server.handler(preflight(origin));
    expect(options.headers.get("access-control-allow-origin")).toBe(origin);
    expect(options.headers.get("access-control-allow-credentials")).toBeNull();

    const request = (headers: Record<string, string>) =>
      server.handler(new Request(environmentUrl, { headers: { origin, ...headers } }));
    const response = await request({ authorization: "DPoP test-token", dpop: "test-proof" });
    expect(response.status).toBe(401);
    expect(response.headers.get("access-control-allow-origin")).toBe(origin);
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
    expect(response.headers.get("access-control-expose-headers")?.split(/,\s*/)).toEqual([
      "www-authenticate",
      "dpop-nonce",
    ]);
    expect(response.headers.get("vary")).toBe("Origin");

    const cookieResponse = await request({ cookie: "session=test", authorization: "Bearer test" });
    expect(cookieResponse.headers.get("access-control-allow-origin")).toBeNull();
    expect(cookieResponse.headers.get("access-control-allow-credentials")).toBeNull();
  });

  it("limits credentialed CORS to the dev URL, desktop renderers and the server origin", async () => {
    const devUrl = new URL("http://127.0.0.1:5733");
    await using server = serveCors({ devUrl });
    for (const origin of [
      devUrl.origin,
      "cadro://app",
      "cadro-dev://app",
      new URL(environmentUrl).origin,
    ]) {
      const response = await server.handler(
        new Request(environmentUrl, { headers: { origin, cookie: "session=test" } }),
      );
      expect(response.headers.get("access-control-allow-origin")).toBe(origin);
      expect(response.headers.get("access-control-allow-credentials")).toBe("true");
    }
  });

  it("accepts exact and suffix allowlist matches and rejects other origins", async () => {
    await using server = serveCors({
      allowedOrigins: ["https://frontend.example.com", "https://*.preview.example.com"],
    });
    for (const origin of [
      "https://frontend.example.com",
      "https://branch.app.preview.example.com",
      "https://branch.app.pages.dev",
    ]) {
      const response = await server.handler(preflight(origin, true));
      expect(response.headers.get("access-control-allow-origin")).toBe(origin);
      expect(response.headers.get("access-control-allow-private-network")).toBe("true");
      expect(response.headers.get("access-control-allow-credentials")).toBeNull();
    }
    for (const origin of [
      "https://preview.example.com",
      "https://evilpreview.example.com",
      "https://app.preview.example.com.evil.test",
      "http://app.preview.example.com",
      "https://app.preview.example.com:8443",
      "https://unlisted.example.com",
    ]) {
      const response = await server.handler(preflight(origin, true));
      expect(response.headers.get("access-control-allow-origin")).toBeNull();
      expect(response.headers.get("access-control-allow-private-network")).toBeNull();
      expect(response.headers.get("access-control-allow-credentials")).toBeNull();
    }
  });

  it.effect("reads CADRO_ALLOWED_ORIGINS and gives --allowed-origins precedence", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const directory = yield* fs.makeTempDirectoryScoped({ prefix: "self-host-cors-cli-" });
      const checkConfig = (extraArgs: ReadonlyArray<string>, expected: ReadonlyArray<string>) => {
        const command = Command.make("cadro", sharedServerCommandFlags).pipe(
          Command.withHandler((flags) =>
            resolveServerConfig(flags, Option.none()).pipe(
              Effect.map((config) => expect(config.allowedOrigins).toEqual(expected)),
            ),
          ),
        );
        return Command.runWith(command, { version: "0.0.0" })([
          "--mode",
          "desktop",
          "--port",
          "3773",
          "--base-dir",
          directory,
          ...extraArgs,
        ]);
      };

      yield* checkConfig([], ["https://frontend.example.com", "*.preview.example.com"]);
      yield* checkConfig(
        ["--allowed-origins", "https://cli.example.com, *"],
        ["https://cli.example.com", "*"],
      );
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          NodeServices.layer,
          NetService.layer,
          ConfigProvider.layer(
            ConfigProvider.fromEnv({
              env: {
                CADRO_ALLOWED_ORIGINS: " https://frontend.example.com, , *.preview.example.com ",
              },
            }),
          ),
        ),
      ),
    ),
  );
});
