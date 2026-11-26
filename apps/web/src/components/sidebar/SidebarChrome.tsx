import { useAtomValue } from "@effect/atom-react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { T, useGT } from "gt-react";
import {
  ArrowLeftIcon,
  ChartNoAxesColumnIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleDotIcon,
  KeyboardIcon,
  NetworkIcon,
  PaletteIcon,
  SettingsIcon,
} from "lucide-react";
import { memo, type ReactNode } from "react";

import { useTheme } from "../../hooks/useTheme";
import { shortcutLabelForCommand } from "../../keybindings";
import { cn, isMacPlatform } from "../../lib/utils";
import {
  navigateHistory,
  useCanNavigateHistory,
  type HistoryDirection,
} from "../../navigationHistory";
import {
  useEnvironments,
  useIssuesSupported,
  usePrimaryEnvironment,
  usePullRequestsSupported,
} from "../../state/environments";
import { primaryServerKeybindingsAtom } from "../../state/server";
import { CadroMark, CadroWordmark } from "../CadroBrand";
import { readIssueListPreferences } from "../issue/issueListPreferences";
import { PullRequestGlyph } from "../pullRequest/pullRequestIcons";
import { readPullRequestListPreferences } from "../pullRequest/pullRequestListPreferences";
import { Button } from "../ui/button";
import {
  Menu,
  MenuGroup,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRadioItemIndicator,
  MenuSeparator,
  MenuShortcut,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger,
} from "../ui/menu";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "../ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { isSidebarUtilityPage, useNavigateToMainApp } from "./mainAppLocation";
import { SidebarThreadUndoNotice } from "./SidebarThreadUndoNotice";
import { SidebarUsageButton } from "./SidebarUsageButton";

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

function WorkspaceMenuPopup({ side }: { side: "right" | "bottom" }) {
  const gt = useGT();
  const navigate = useNavigate();
  const pullRequestsSupported = usePullRequestsSupported();
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
        {pullRequestsSupported ? (
          <MenuItem
            onClick={() =>
              void navigate({ to: "/pull-requests", search: readPullRequestListPreferences() })
            }
          >
            <PullRequestGlyph.pullRequest aria-hidden className={workspaceMenuIcon} />
            {gt("Pull requests")}
          </MenuItem>
        ) : null}
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

export const SidebarChromeHeader = memo(function SidebarChromeHeader({
  isElectron,
  children,
}: {
  isElectron: boolean;
  children?: ReactNode;
}) {
  const gt = useGT();
  const showHistory = isElectron || typeof window.navigation !== "undefined";
  return (
    <div
      className={cn(
        "relative shrink-0 pt-2 md:pt-(--workspace-topbar-height)",
        isElectron && "drag-region",
      )}
    >
      {showHistory ? (
        <div className="absolute inset-e-0 top-0 hidden h-(--workspace-topbar-height) items-center gap-1 md:flex">
          <HistoryNavigationButton direction="back" />
          <HistoryNavigationButton direction="forward" />
        </div>
      ) : null}
      <div className="flex h-8 min-w-0 items-center justify-between">
        <div className="flex min-w-0 items-center">
          <div className="md:hidden">
            <SidebarTrigger
              className="relative top-auto translate-y-0"
              aria-label={gt("Toggle main sidebar")}
            />
          </div>
          <div className="flex items-center rounded-lg text-foreground hover:bg-sidebar-row-hover has-aria-expanded:bg-sidebar-row-active">
            <Link
              to="/"
              aria-label={gt("Cadro home")}
              className="inline-flex h-8 items-center rounded-lg ps-2 pe-0.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <CadroWordmark className="text-(length:--sidebar-wordmark-size) leading-none font-(--sidebar-wordmark-weight)" />
            </Link>
            <Menu>
              <MenuTrigger
                aria-label={gt("Workspace menu")}
                render={<Button variant="ghost-muted" size="icon-sm" className="h-8 w-6" />}
              >
                <ChevronDownIcon
                  aria-hidden
                  className="size-3.5 stroke-(length:--sidebar-icon-stroke)"
                />
              </MenuTrigger>
              <WorkspaceMenuPopup side="bottom" />
            </Menu>
          </div>
        </div>
        {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
      </div>
    </div>
  );
});

function HistoryNavigationButton({ direction }: { direction: HistoryDirection }) {
  const keybindings = useAtomValue(primaryServerKeybindingsAtom);
  const enabled = useCanNavigateHistory(direction);
  const gt = useGT();
  const label = direction === "back" ? gt("Go back") : gt("Go forward");
  const shortcutLabel = shortcutLabelForCommand(
    keybindings,
    direction === "back" ? "navigation.back" : "navigation.forward",
  );
  const Icon = direction === "back" ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            className="size-8 [-webkit-app-region:no-drag]"
            disabled={!enabled}
            onClick={() => navigateHistory(direction)}
            size="icon-sm"
            variant="ghost-muted"
          />
        }
      >
        <Icon className="size-4 stroke-(length:--sidebar-icon-stroke)" />
      </TooltipTrigger>
      <TooltipPopup side="bottom">
        {label}
        {shortcutLabel ? ` (${shortcutLabel})` : ""}
      </TooltipPopup>
    </Tooltip>
  );
}

const SidebarUtilityMenu = memo(function SidebarUtilityMenu() {
  const navigate = useNavigate();
  const navigateToMainApp = useNavigateToMainApp();
  const gt = useGT();
  const { isMobile, setOpenMobile } = useSidebar();
  const isOnUtilityPage = useLocation({
    select: (location) => isSidebarUtilityPage(location.pathname),
  });
  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  const handleSettingsClick = () => {
    closeMobileSidebar();
    void navigate({ to: "/settings" });
  };
  const handleBackClick = () => {
    closeMobileSidebar();
    void navigateToMainApp();
  };

  return (
    <SidebarMenu>
      {isOnUtilityPage ? (
        <SidebarMenuItem>
          <SidebarMenuButton size="row" variant="primary" onClick={handleBackClick}>
            <ArrowLeftIcon aria-hidden className="size-4 stroke-(length:--sidebar-icon-stroke)" />
            <span>
              <T>Back</T>
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ) : (
        <>
          <SidebarUsageButton onNavigate={closeMobileSidebar} />
          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              size="row"
              variant="primary"
              onClick={handleSettingsClick}
            >
              <SettingsIcon aria-hidden className="size-4 stroke-(length:--sidebar-icon-stroke)" />
              <span>{gt("Settings")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </>
      )}
    </SidebarMenu>
  );
});

export const SidebarChromeFooter = memo(function SidebarChromeFooter() {
  return (
    <SidebarFooter>
      <SidebarThreadUndoNotice />
      <div className="border-t border-sidebar-border/60 pt-1.5">
        <SidebarUtilityMenu />
      </div>
    </SidebarFooter>
  );
});
