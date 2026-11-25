import * as ManagedRuntime from "effect/ManagedRuntime";
import type * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Socket from "effect/socket/Socket";

import { layerRemoteHttpClient } from "@cadro/client-runtime/rpc";
import * as PrimaryEnvironmentHttpClient from "../environments/primary/httpClient";
import * as PrimaryEnvironmentHttpLayer from "../environments/primary/httpLayer";

import { DpopProof } from "@cadro/client-runtime/authorization";
import { loadOrCreateProofKey, layer as dpopCryptoLayer } from "../connection/dpop";
import * as ClientTracer from "../observability/clientTracer";

const layerRuntime = Layer.mergeAll(
  layerRemoteHttpClient((input, init) => globalThis.fetch(input, init)),
  DpopProof.layerSigner({
    keyStore: "indexed-db",
    loadOrCreateKey: loadOrCreateProofKey(),
  }).pipe(Layer.provideMerge(dpopCryptoLayer)),
  Socket.layerWebSocketConstructorGlobal,
  ClientTracer.layer,
);
type RuntimeLayerSource = typeof layerRuntime;

const primaryHttpRuntime = ManagedRuntime.make(
  PrimaryEnvironmentHttpClient.layer.pipe(Layer.provide(PrimaryEnvironmentHttpLayer.layer)),
);

export type PrimaryHttpEffectRunner = <A, E>(
  effect: Effect.Effect<A, E, PrimaryEnvironmentHttpClient.PrimaryEnvironmentHttpClient>,
) => Promise<A>;

const livePrimaryHttpRunner: PrimaryHttpEffectRunner = (effect) =>
  primaryHttpRuntime.runPromise(effect);

let primaryHttpRunner = livePrimaryHttpRunner;

export const runPrimaryHttp = <A, E>(
  effect: Effect.Effect<A, E, PrimaryEnvironmentHttpClient.PrimaryEnvironmentHttpClient>,
) => primaryHttpRunner(effect);

export function __setPrimaryHttpRunnerForTests(runner?: PrimaryHttpEffectRunner): void {
  primaryHttpRunner = runner ?? livePrimaryHttpRunner;
}

export const runtime: ManagedRuntime.ManagedRuntime<
  Layer.Success<RuntimeLayerSource>,
  Layer.Error<RuntimeLayerSource>
> = ManagedRuntime.make(layerRuntime);

export const layer: Layer.Layer<
  Layer.Success<RuntimeLayerSource>,
  Layer.Error<RuntimeLayerSource>
> = Layer.effectContext(runtime.contextEffect);
