import { useAtomValue } from "@effect/atom-react";
import { Link } from "@tanstack/react-router";
import { providerClients } from "@cadro/client-runtime/provider-clients";
import { ProviderDriverKind } from "@cadro/contracts";
import {
  collectLimitAccounts,
  collectLimitPools,
  type LimitPoolWindow,
  poolWindowTimeLeftPercent,
  type SidebarLimitPoolSummary,
  summarizeSidebarUsage,
} from "@cadro/shared/usageLimits";
import {
  collectExternalUsageLinks,
  collectLimitNotices,
  cursorUsageWindowDetails,
  formatResetsIn,
} from "@cadro/shared/usageLimitsCopy";
import * as Schema from "effect/Schema";
import { useGT, useMessages } from "gt-react";
import { AlertTriangleIcon, ArrowUpRightIcon, ExternalLinkIcon, PinIcon } from "lucide-react";
import { useState } from "react";

import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useNowMinute } from "../../hooks/useNowMinute";
import { cn } from "../../lib/utils";
import { ensureLocalApi } from "../../localApi";
import { environmentPresentations } from "../../state/presentation";
import { ProviderInstanceIcon } from "../chat/ProviderInstanceIcon";
import { Button } from "../ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "../ui/popover";
import { barColor, usePaceMark } from "../usage/UsageLimits";
import { readUsagePagePreferences, saveUsagePagePreferences } from "../usage/usagePagePreferences";
import { PROVIDER_ORDER, PROVIDER_PRESENTATION } from "../usage/usageProviders";

const PINNED_USAGE_DRIVER_KEY = "cadro:sidebar-pinned-usage-driver:v1";
const PinnedUsageDriverSchema = Schema.NullOr(ProviderDriverKind);
const SIDEBAR_DRIVER_ORDER = PROVIDER_ORDER.map(
  (provider) => PROVIDER_PRESENTATION[provider].driverKind,
);

function providerLabelFor(driver: ProviderDriverKind): string {
  return providerClients.get(driver)?.label ?? String(driver);
}

function ProviderUsageRing({ entry }: { readonly entry: SidebarLimitPoolSummary }) {
  const label = providerLabelFor(entry.driver);
  const percent = entry.remainingPercent ?? 0;
  const ringBackground =
    entry.severity === "exhausted"
      ? "color-mix(in srgb, var(--destructive) 42%, var(--sidebar-border))"
      : entry.severity === "warning"
        ? `conic-gradient(var(--warning) ${percent}%, var(--sidebar-border) 0)`
        : `conic-gradient(color-mix(in srgb, var(--sidebar-foreground) 72%, transparent) ${percent}%, var(--sidebar-border) 0)`;
  const iconTone =
    entry.severity === "exhausted"
      ? "text-destructive"
      : entry.severity === "warning"
        ? "text-warning"
        : "text-sidebar-foreground/80";

  return (
    <span
      aria-hidden
      className="grid size-6 shrink-0 place-items-center rounded-full bg-sidebar-border"
      style={{ background: ringBackground }}
    >
      <span className="grid size-5 place-items-center rounded-full bg-sidebar">
        <ProviderInstanceIcon
          driverKind={entry.driver}
          displayName={label}
          className="size-3.5"
          iconClassName={cn("size-3.5", iconTone)}
        />
      </span>
    </span>
  );
}

function PopoverWindowBar({
  driver,
  window,
  label,
  now,
}: {
  readonly driver: ProviderDriverKind;
  readonly window: LimitPoolWindow;
  readonly label: string;
  readonly now: number;
}) {
  const m = useMessages();
  const remaining = window.remainingPercent;
  const timeLeft = poolWindowTimeLeftPercent(window, now);
  const [barRef, paceMark] = usePaceMark(timeLeft);
  const nextResetWindow = window.resets[0]?.member.window;
  const resetsIn = nextResetWindow ? formatResetsIn(nextResetWindow, now, m, "refill") : null;
  const exhausted = remaining === 0;
  const warning = !exhausted && remaining <= 15;
  const fillColor = warning ? "var(--warning)" : barColor(driver);

  return (
    <div className="flex flex-col gap-1 py-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="min-w-0 truncate text-foreground">{label}</span>
        <span className="flex shrink-0 items-baseline gap-1.5 tabular-nums">
          <span
            className={cn(
              exhausted
                ? "font-medium text-destructive"
                : warning
                  ? "font-medium text-warning"
                  : "text-foreground",
            )}
          >
            {remaining}%
          </span>
          {resetsIn ? <span className="text-muted-foreground">{resetsIn}</span> : null}
        </span>
      </div>
      <div ref={barRef} aria-hidden className="relative h-2 w-full">
        <div className="absolute inset-0" style={paceMark?.gap}>
          <div
            className={cn(
              "absolute inset-x-0 top-0.5 h-1.5 rounded-full",
              exhausted ? "bg-destructive/20" : "bg-muted",
            )}
          />
          {remaining > 0 ? (
            <div
              className="absolute top-0.5 left-0 h-1.5 rounded-full"
              style={{ width: `${remaining}%`, backgroundColor: fillColor }}
            />
          ) : null}
        </div>
        {paceMark ? (
          <span
            className="absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-foreground"
            style={paceMark.tick}
          />
        ) : null}
      </div>
    </div>
  );
}

export function RailUsageButton() {
  const gt = useGT();
  const m = useMessages();
  const [open, setOpen] = useState(false);
  const [pinnedDriver, setPinnedDriver] = useLocalStorage(
    PINNED_USAGE_DRIVER_KEY,
    null,
    PinnedUsageDriverSchema,
  );
  const presentations = useAtomValue(environmentPresentations.presentationsWithProvidersAtom);
  const minute = useNowMinute();
  const now = Date.parse(`${minute}:00Z`);
  const pools = collectLimitPools(collectLimitAccounts(presentations), now);
  const summary = summarizeSidebarUsage({
    pools,
    pinnedDriver,
    driverOrder: SIDEBAR_DRIVER_ORDER,
  });
  const featured = summary.focused ?? summary.orderedPools[0] ?? null;
  const notices = collectLimitNotices(presentations, m);
  const externalLinks = collectExternalUsageLinks(presentations, m);

  const summaryTooltipParts = summary.orderedPools.flatMap((entry) => {
    if (!entry.bottleneck || entry.remainingPercent === null) return [];
    const provider = providerLabelFor(entry.driver);
    const nextResetWindow = entry.bottleneck.resets[0]?.member.window;
    const resetsIn = nextResetWindow ? formatResetsIn(nextResetWindow, now, m, "refill") : null;
    const text = gt("{label}: {remaining}% left", {
      label: `${provider} · ${entry.bottleneck.label}`,
      remaining: entry.remainingPercent,
    });
    return [resetsIn ? `${text} (${resetsIn})` : text];
  });
  const title =
    summaryTooltipParts.length > 0
      ? summaryTooltipParts.join(" · ")
      : notices.length > 0
        ? notices[0]!
        : gt("Usage limits");

  const handleTogglePin = (driver: ProviderDriverKind) => {
    setPinnedDriver((current) => (current === driver ? null : driver));
  };

  const handleOpenUsagePage = () => {
    saveUsagePagePreferences({ ...readUsagePagePreferences(), metric: "limits" });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={gt("Usage limits")}
        title={title}
        render={<Button size="icon-lg" variant="ghost-muted" />}
      >
        {featured ? (
          <ProviderUsageRing entry={featured} />
        ) : notices.length > 0 ? (
          <AlertTriangleIcon aria-hidden className="size-4 text-warning" />
        ) : (
          <span
            aria-hidden
            className="grid size-6 place-items-center rounded-full bg-sidebar-border"
          >
            <span className="grid size-5 place-items-center rounded-full bg-sidebar">
              <span className="size-2 rotate-45 rounded-xs bg-current opacity-45" />
            </span>
          </span>
        )}
      </PopoverTrigger>
      <PopoverPopup
        aria-label={gt("Usage limits")}
        side="right"
        align="end"
        sideOffset={6}
        width="md"
        padding="compact"
      >
        <div className="max-h-80 overflow-y-auto">
          {summary.orderedPools.length === 0 &&
          notices.length === 0 &&
          externalLinks.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">{gt("No limits reported.")}</p>
          ) : null}
          {summary.orderedPools.length > 0 ? (
            <div className="divide-y divide-border/60">
              {summary.orderedPools.map((entry) => {
                const label = providerLabelFor(entry.driver);
                const singlePlan =
                  entry.pool.accounts.length === 1 ? entry.pool.accounts[0]?.plan : undefined;
                const meta =
                  entry.pool.accounts.length > 1 ? `×${entry.pool.accounts.length}` : singlePlan;
                const pinLabel = entry.pinned ? gt("Unpin") : gt("Pin");
                return (
                  <section
                    key={entry.driver}
                    className="group/usage-pool py-2 first:pt-1 last:pb-1"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5 text-xs">
                        <ProviderInstanceIcon
                          driverKind={entry.driver}
                          displayName={label}
                          size="compact"
                          className="size-4"
                          iconClassName="size-3.5 text-foreground/80"
                        />
                        <span className="truncate font-medium text-foreground">{label}</span>
                        {meta ? (
                          <span className="truncate text-muted-foreground">· {meta}</span>
                        ) : null}
                      </div>
                      <div
                        className={cn(
                          "shrink-0 transition-opacity",
                          entry.pinned
                            ? "opacity-100"
                            : "opacity-0 group-hover/usage-pool:opacity-100 group-focus-within/usage-pool:opacity-100 pointer-coarse:opacity-100",
                        )}
                      >
                        <Button
                          type="button"
                          size="icon-micro"
                          variant={entry.pinned ? "ghost" : "ghost-muted"}
                          aria-label={pinLabel}
                          aria-pressed={entry.pinned}
                          title={pinLabel}
                          onClick={() => handleTogglePin(entry.driver)}
                        >
                          <PinIcon
                            aria-hidden
                            className={cn("size-3", entry.pinned && "fill-current")}
                          />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {entry.windows.map((window) => {
                        const details =
                          entry.driver === "cursor"
                            ? cursorUsageWindowDetails(window.id, entry.pool, m)
                            : undefined;
                        const windowLabel = details?.label ?? window.label;
                        return (
                          <PopoverWindowBar
                            key={`${window.kind}:${window.id}`}
                            driver={entry.driver}
                            window={window}
                            label={windowLabel}
                            now={now}
                          />
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : null}
          {notices.length > 0 ? (
            <div
              className={cn(
                "flex flex-col gap-1.5 py-2",
                summary.orderedPools.length > 0 && "border-t border-border/60",
              )}
            >
              {notices.map((notice) => (
                <div
                  key={notice}
                  className="flex items-start gap-1.5 text-xs text-muted-foreground"
                >
                  <AlertTriangleIcon
                    aria-hidden
                    className="mt-0.5 size-3.5 shrink-0 text-warning"
                  />
                  <span className="min-w-0 break-words">{notice}</span>
                </div>
              ))}
            </div>
          ) : null}
          {externalLinks.length > 0 ? (
            <div
              className={cn(
                "flex flex-col gap-1 py-1.5",
                (summary.orderedPools.length > 0 || notices.length > 0) &&
                  "border-t border-border/60",
              )}
            >
              {externalLinks.map((link) => (
                <Button
                  key={link.url}
                  type="button"
                  variant="ghost-muted"
                  size="xs"
                  className="w-full justify-between"
                  onClick={() => {
                    setOpen(false);
                    void ensureLocalApi().shell.openExternal(link.url);
                  }}
                >
                  <span className="truncate">{link.label}</span>
                  <ExternalLinkIcon aria-hidden className="size-3 shrink-0" />
                </Button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="mt-1 border-t border-border/60 pt-1">
          <Link
            to="/usage"
            onClick={handleOpenUsagePage}
            className="flex items-center justify-between rounded-md px-1.5 py-1.5 text-sm text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <span>{gt("Manage usage")}</span>
            <ArrowUpRightIcon aria-hidden className="size-3.5 text-muted-foreground" />
          </Link>
        </div>
      </PopoverPopup>
    </Popover>
  );
}
