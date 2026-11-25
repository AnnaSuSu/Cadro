import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useGT } from "gt-react";
import {
  ChartNoAxesColumnIcon,
  ClockIcon,
  FolderIcon,
  GitForkIcon,
  HomeIcon,
  KeyboardIcon,
  SettingsIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { useTheme } from "../../hooks/useTheme";
import { cn, isMacPlatform } from "../../lib/utils";
import {
  useIssuesSupported,
  usePullRequestsSupported,
  usePrimaryEnvironment,
  useEnvironments,
} from "../../state/environments";
import { CadroMark } from "../CadroBrand";
import { readIssueListPreferences } from "../issue/issueListPreferences";
import { PullRequestGlyph } from "../pullRequest/pullRequestIcons";
import { Button } from "../ui/button";
import { readPullRequestListPreferences } from "../pullRequest/pullRequestListPreferences";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "../ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

const railButtonClass =
  "flex size-9 shrink-0 items-center justify-center rounded-lg text-sidebar-muted-foreground outline-none motion-safe:transition-colors motion-safe:duration-150 hover:bg-sidebar-row-hover active:bg-sidebar-row-active hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

export function CadroActivityRail({
  sidebarControl,
  clearTrafficLights = false,
  className,
}: {
  sidebarControl?: ReactNode;
  clearTrafficLights?: boolean;
  className?: string;
}) {
  const gt = useGT();
  const pathname = useLocation({ select: (location) => location.pathname });
  const pullRequestsSupported = usePullRequestsSupported();
  const { connected, connecting, connectionLabel } = useWorkspaceHost();
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
      {sidebarControl}
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
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                to="/settings/connections"
                aria-label={connectionLabel}
                className={cn(
                  railButtonClass,
                  pathname === "/settings/connections" && "bg-sidebar-row-active",
                )}
              />
            }
          >
            <span
              aria-hidden
              className="grid size-5 place-items-center rounded-full border border-sidebar-border"
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  connected ? "bg-success" : connecting ? "bg-warning" : "bg-error",
                )}
              />
            </span>
          </TooltipTrigger>
          <TooltipPopup side="right">{connectionLabel}</TooltipPopup>
        </Tooltip>
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
  return { host, connected, connecting, connectionLabel };
}

export function WorkspaceMenuPopup({ side }: { side: "right" | "bottom" }) {
  const gt = useGT();
  const navigate = useNavigate();
  const issuesSupported = useIssuesSupported();
  const { host, connectionLabel } = useWorkspaceHost();
  const { appearanceMode, setAppearanceMode } = useTheme();
  const settingsShortcut = isMacPlatform(navigator.platform) ? "⌘," : "Ctrl+,";
  return (
    <MenuPopup side={side} align={side === "right" ? "end" : "start"} className="min-w-56">
      <div className="px-2.5 py-1.5">
        <div className="text-sm font-semibold">Cadro</div>
        <div className="truncate text-xs text-muted-foreground">
          {host?.label ?? connectionLabel}
        </div>
      </div>
      <MenuSeparator />
      <MenuGroup>
        <MenuGroupLabel>{gt("Appearance")}</MenuGroupLabel>
        <MenuRadioGroup
          value={appearanceMode}
          onValueChange={(mode) => {
            if (mode === "light" || mode === "dark" || mode === "system") setAppearanceMode(mode);
          }}
        >
          <MenuRadioItem value="system">{gt("System")}</MenuRadioItem>
          <MenuRadioItem value="light">{gt("Light")}</MenuRadioItem>
          <MenuRadioItem value="dark">{gt("Dark")}</MenuRadioItem>
        </MenuRadioGroup>
      </MenuGroup>
      <MenuSeparator />
      <MenuItem onClick={() => void navigate({ to: "/settings/connections" })}>
        {gt("Connections & Self-Host")}
      </MenuItem>
      <MenuItem onClick={() => void navigate({ to: "/settings" })}>
        <SettingsIcon />
        {gt("Settings")}
        <kbd className="ml-auto text-xs text-muted-foreground">{settingsShortcut}</kbd>
      </MenuItem>
      <MenuItem onClick={() => void navigate({ to: "/settings/keybindings" })}>
        <KeyboardIcon />
        {gt("Keyboard shortcuts")}
      </MenuItem>
      {issuesSupported ? (
        <MenuItem
          onClick={() => void navigate({ to: "/issues", search: readIssueListPreferences() })}
        >
          {gt("Issues", { $context: "sidebar link to the list of issues" })}
        </MenuItem>
      ) : null}
      <MenuItem onClick={() => void navigate({ to: "/usage" })}>
        <ChartNoAxesColumnIcon />
        {gt("Usage")}
      </MenuItem>
    </MenuPopup>
  );
}
