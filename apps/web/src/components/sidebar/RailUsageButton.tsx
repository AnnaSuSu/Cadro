import { useAtomValue } from "@effect/atom-react";
import { Link } from "@tanstack/react-router";
import { providerClients } from "@cadro/client-runtime/provider-clients";
import {
  collectLimitAccounts,
  collectLimitPools,
  displayLimitWindows,
} from "@cadro/shared/usageLimits";
import { useGT } from "gt-react";
import { useState } from "react";

import { useNowMinute } from "../../hooks/useNowMinute";
import { environmentPresentations } from "../../state/presentation";
import { Button } from "../ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "../ui/popover";

export function RailUsageButton() {
  const gt = useGT();
  const [open, setOpen] = useState(false);
  const presentations = useAtomValue(environmentPresentations.presentationsWithProvidersAtom);
  const minute = useNowMinute();
  const pools = collectLimitPools(collectLimitAccounts(presentations), Date.parse(`${minute}:00Z`));
  const featured = pools.find((pool) => pool.driver === "codex") ?? pools[0];
  const window = featured?.windows.find((entry) => entry.kind === "weekly") ?? featured?.windows[0];
  const provider = featured && (providerClients.get(featured.driver)?.label ?? featured.driver);
  const title =
    provider && window
      ? gt("{label}: {remaining}% left", {
          label: `${provider} · ${window.label}`,
          remaining: window.remainingPercent,
        })
      : gt("Usage limits");
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={gt("Usage limits")}
        title={title}
        render={<Button size="icon-lg" variant="ghost-muted" />}
      >
        <span
          aria-hidden
          className="grid size-6 place-items-center rounded-full bg-sidebar-border"
          style={
            window
              ? {
                  background: `conic-gradient(currentColor ${window.remainingPercent}%, var(--sidebar-border) 0)`,
                }
              : undefined
          }
        >
          <span className="grid size-5 place-items-center rounded-full bg-sidebar">
            <span className="size-2 rotate-45 rounded-xs bg-current opacity-45" />
          </span>
        </span>
      </PopoverTrigger>
      <PopoverPopup
        aria-label={gt("Usage limits")}
        side="right"
        align="end"
        sideOffset={6}
        width="sm"
        padding="compact"
      >
        <div className="max-h-72 overflow-y-auto">
          {pools.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">{gt("No limits reported.")}</p>
          ) : null}
          {pools.map((pool) => (
            <section key={pool.driver} className="py-1">
              <div className="pb-1 text-xs text-muted-foreground">
                {providerClients.get(pool.driver)?.label ?? pool.driver}
                {pool.accounts.length === 1 && pool.accounts[0]?.plan
                  ? ` · ${pool.accounts[0].plan}`
                  : ""}
              </div>
              {displayLimitWindows(pool).map((entry) => (
                <div
                  key={`${entry.kind}:${entry.id}`}
                  className="flex min-h-7 items-center justify-between gap-3 text-sm"
                >
                  <span>{entry.label}</span>
                  <span className="shrink-0 tabular-nums">
                    {gt("{remaining}% left", { remaining: entry.remainingPercent })}
                  </span>
                </div>
              ))}
            </section>
          ))}
        </div>
        <div className="mt-1 border-t pt-1">
          <Link
            to="/usage"
            onClick={() => setOpen(false)}
            className="block rounded-md px-1 py-1.5 text-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset"
          >
            {gt("Manage usage")}
          </Link>
        </div>
      </PopoverPopup>
    </Popover>
  );
}
