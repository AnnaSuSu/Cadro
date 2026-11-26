import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useGT } from "gt-react";
import {
  ChartNoAxesColumnIcon,
  ClockIcon,
  CircleDotIcon,
  FolderIcon,
  GitForkIcon,
  HomeIcon,
  KeyboardIcon,
  PaletteIcon,
  NetworkIcon,
  SettingsIcon,
} from "lucide-react";

import { useTheme } from "../../hooks/useTheme";
import { cn, isMacPlatform } from "../../lib/utils";
import {
  useIssuesSupported,
  usePullRequestsSupported,
  usePrimaryEnvironment,
  useEnvironments,
} from "../../state/environments";
import { RailUsageButton } from "./RailUsageButton";
import { CadroMark } from "../CadroBrand";
import { readIssueListPreferences } from "../issue/issueListPreferences";
import { PullRequestGlyph } from "../pullRequest/pullRequestIcons";
import { Button } from "../ui/button";
import { readPullRequestListPreferences } from "../pullRequest/pullRequestListPreferences";
import {
  Menu,
  MenuGroup,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRadioItemIndicator,
  MenuShortcut,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuSeparator,
  MenuTrigger,
} from "../ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

const railButtonClass =
  "flex size-9 shrink-0 items-center justify-center rounded-lg text-sidebar-muted-foreground outline-none motion-safe:transition-colors motion-safe:duration-150 hover:bg-sidebar-row-hover active:bg-sidebar-row-active hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

export function CadroActivityRail({
  clearTrafficLights = false,
  className,
}: {
  clearTrafficLights?: boolean;
  className?: string;
}) {
  const gt = useGT();
  const pathname = useLocation({ select: (location) => location.pathname });
  const pullRequestsSupported = usePullRequestsSupported();
  const links = [
    {
      to: "/",
      label: gt("Workbench"),
      icon: HomeIcon,
      active: !/^\/(settings|pull-requests|issues|usage)(\/|$)/.test(pathname),
    },
    { to: "/settings/projects", label: gt("Projects"), icon: FolderIcon },
    ...(pullRequestsSupported
      ? [
          {
            to: "/pull-requests",
            label: gt("Pull requests"),
            icon: PullRequestGlyph.pullRequest,
            search: readPullRequestListPreferences(),
          } as const,
        ]
      : []),
    { to: "/settings/scheduled-tasks", label: gt("Scheduled tasks"), icon: ClockIcon },
    { to: "/settings/worktrees", label: gt("Worktrees"), icon: GitForkIcon },
  ] as const;

  return (
    <nav
      aria-label={gt("Workspace navigation")}
      className={cn(
        "relative hidden w-12 shrink-0 flex-col items-center gap-1 border-r border-sidebar-border/60 bg-(--rail) px-1.5 pb-2 md:flex",
        clearTrafficLights ? "pt-(--workspace-topbar-height)" : "pt-2",
        className,
      )}
    >
      {clearTrafficLights ? (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-(--workspace-topbar-height) drag-region"
        />
      ) : null}
      {/* The shell positions its sidebar toggle over this row on pages that use it. */}
      <div aria-hidden className="size-9 shrink-0" />
      {links.map(({ to, label, icon: Icon, ...options }) => {
        const active = "active" in options ? options.active : pathname === to;
        return (
          <Tooltip key={to}>
            <TooltipTrigger
              render={
                <Link
                  to={to}
                  {...("search" in options ? { search: options.search } : {})}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    railButtonClass,
                    active && "bg-sidebar-row-active text-sidebar-foreground",
                  )}
                />
              }
            >
              <Icon aria-hidden className="size-[17px]" />
            </TooltipTrigger>
            <TooltipPopup side="right">{label}</TooltipPopup>
          </Tooltip>
        );
      })}
      <div className="mt-auto flex flex-col items-center gap-1">
        <RailUsageButton />
        <Menu>
          <MenuTrigger
            aria-label={gt("Workspace menu")}
            render={<Button size="icon-lg" variant="ghost" />}
          >
            <span className="grid size-7 place-items-center rounded-full bg-sidebar-row-active text-sidebar-foreground">
              <CadroMark aria-hidden className="size-5" />
            </span>
          </MenuTrigger>
          <WorkspaceMenuPopup side="right" />
        </Menu>
      </div>
    </nav>
  );
}

function useWorkspaceHost() {
  const gt = useGT();
  const primary = usePrimaryEnvironment();
  const { environments } = useEnvironments();
  const host =
    primary ??
    environments.find((environment) => environment.connection.phase === "connected") ??
    environments[0];
  const connected = host?.connection.phase === "connected";
  const connecting =
    host?.connection.phase === "connecting" || host?.connection.phase === "reconnecting";
  const connectionLabel = connected
    ? gt("Host connected")
    : connecting
      ? gt("Connecting to host")
      : gt("Host offline");
  return { host, connectionLabel };
}

const workspaceMenuIcon = "size-3.5 text-foreground opacity-80";

export function WorkspaceMenuPopup({ side }: { side: "right" | "bottom" }) {
  const gt = useGT();
  const navigate = useNavigate();
  const issuesSupported = useIssuesSupported();
  const { host, connectionLabel } = useWorkspaceHost();
  const { appearanceMode, setAppearanceMode } = useTheme();
  const settingsShortcut = isMacPlatform(navigator.platform) ? "⌘," : "Ctrl+,";
  return (
    <MenuPopup
      side={side}
      align={side === "right" ? "end" : "start"}
      surface="panel"
      className="w-[230px]"
    >
      <div className="flex items-center gap-1.5 px-1 py-1.5">
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-sidebar-foreground text-sidebar">
          <CadroMark aria-hidden className="size-3.5" />
        </span>
        <div className="min-w-0 leading-tight">
          <div className="text-sm font-medium">Cadro</div>
          <div className="truncate text-xs text-muted-foreground">
            {host?.label ?? connectionLabel}
          </div>
        </div>
      </div>
      <MenuSeparator />
      <MenuGroup>
        <MenuSub>
          <MenuSubTrigger>
            <PaletteIcon aria-hidden className={workspaceMenuIcon} />
            {gt("Appearance")}
          </MenuSubTrigger>
          <MenuSubPopup surface="panel" sideOffset={3}>
            <MenuRadioGroup
              aria-label={gt("Appearance")}
              value={appearanceMode}
              onValueChange={(mode) => {
                if (mode === "light" || mode === "dark" || mode === "system")
                  setAppearanceMode(mode);
              }}
            >
              {(
                [
                  ["system", gt("System")],
                  ["light", gt("Light")],
                  ["dark", gt("Dark")],
                ] as const
              ).map(([value, label]) => (
                <MenuRadioItem key={value} value={value}>
                  <span className="flex items-center justify-between">
                    {label}
                    <MenuRadioItemIndicator />
                  </span>
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </MenuSubPopup>
        </MenuSub>
        <MenuItem onClick={() => void navigate({ to: "/settings" })}>
          <SettingsIcon aria-hidden className={workspaceMenuIcon} />
          {gt("Settings")}
          <MenuShortcut>{settingsShortcut}</MenuShortcut>
        </MenuItem>
        <MenuItem onClick={() => void navigate({ to: "/settings/keybindings" })}>
          <KeyboardIcon aria-hidden className={workspaceMenuIcon} />
          {gt("Keyboard shortcuts")}
        </MenuItem>
      </MenuGroup>
      <MenuSeparator />
      <MenuGroup>
        <MenuItem onClick={() => void navigate({ to: "/settings/connections" })}>
          <NetworkIcon aria-hidden className={workspaceMenuIcon} />
          {gt("Connections & Self-Host")}
        </MenuItem>
        {issuesSupported ? (
          <MenuItem
            onClick={() => void navigate({ to: "/issues", search: readIssueListPreferences() })}
          >
            <CircleDotIcon aria-hidden className={workspaceMenuIcon} />
            {gt("Issues", { $context: "sidebar link to the list of issues" })}
          </MenuItem>
        ) : null}
        <MenuItem onClick={() => void navigate({ to: "/usage" })}>
          <ChartNoAxesColumnIcon aria-hidden className={workspaceMenuIcon} />
          {gt("Usage")}
        </MenuItem>
      </MenuGroup>
    </MenuPopup>
  );
}
