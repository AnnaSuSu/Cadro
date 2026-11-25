import { useAtomValue } from "@effect/atom-react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { T, useGT } from "gt-react";
import {
  ArrowLeftIcon,
  ChartNoAxesColumnIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SettingsIcon,
} from "lucide-react";
import { memo, type ReactNode } from "react";

import { shortcutLabelForCommand } from "../../keybindings";
import { cn } from "../../lib/utils";
import {
  navigateHistory,
  useCanNavigateHistory,
  type HistoryDirection,
} from "../../navigationHistory";
import { useIssuesSupported, usePullRequestsSupported } from "../../state/environments";
import { primaryServerKeybindingsAtom } from "../../state/server";
import { CadroWordmark } from "../CadroBrand";
import { readIssueListPreferences } from "../issue/issueListPreferences";
import { IssueGlyph } from "../issue/issuePresentation";
import { PullRequestGlyph } from "../pullRequest/pullRequestIcons";
import { readPullRequestListPreferences } from "../pullRequest/pullRequestListPreferences";
import { Button } from "../ui/button";
import { Menu, MenuTrigger } from "../ui/menu";
import { WorkspaceMenuPopup } from "./CadroActivityRail";
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
        "relative shrink-0 pt-2",
        showHistory && "md:pt-10",
        isElectron && "drag-region",
      )}
    >
      {showHistory ? (
        <div className="absolute inset-e-0 top-0 hidden h-7 items-center gap-1 md:flex">
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
              <CadroWordmark className="text-[19px] leading-none font-[650]" />
            </Link>
            <Menu>
              <MenuTrigger
                aria-label={gt("Workspace menu")}
                className="grid h-8 w-6 cursor-pointer place-items-center rounded-md text-sidebar-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <ChevronDownIcon aria-hidden className="size-3.5 stroke-[1.6]" />
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
            className="size-8 text-sidebar-muted-foreground [-webkit-app-region:no-drag]"
            disabled={!enabled}
            onClick={() => navigateHistory(direction)}
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        <Icon className="size-4 stroke-[1.5]" />
      </TooltipTrigger>
      <TooltipPopup side="bottom">
        {label}
        {shortcutLabel ? ` (${shortcutLabel})` : ""}
      </TooltipPopup>
    </Tooltip>
  );
}

function SidebarUtilityItem({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <SidebarMenuItem className="shrink-0">
      <Tooltip>
        <TooltipTrigger
          render={
            <SidebarMenuButton aria-label={label} onClick={onClick} size="icon">
              {icon}
            </SidebarMenuButton>
          }
        />
        <TooltipPopup side="top">{label}</TooltipPopup>
      </Tooltip>
    </SidebarMenuItem>
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
  const pullRequestsSupported = usePullRequestsSupported();
  const issuesSupported = useIssuesSupported();
  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  const handlePullRequestsClick = () => {
    closeMobileSidebar();
    void navigate({
      to: "/pull-requests",
      search: readPullRequestListPreferences(),
    });
  };
  const handleIssuesClick = () => {
    closeMobileSidebar();
    void navigate({ to: "/issues", search: readIssueListPreferences() });
  };
  const handleSettingsClick = () => {
    closeMobileSidebar();
    void navigate({ to: "/settings" });
  };

  const handleUsageClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
    void navigate({ to: "/usage" });
  };

  const handleBackClick = () => {
    closeMobileSidebar();
    void navigateToMainApp();
  };

  return (
    <SidebarMenu className="flex-row items-center">
      {isOnUtilityPage ? (
        <SidebarMenuItem className="min-w-0 flex-1">
          <SidebarMenuButton onClick={handleBackClick}>
            <ArrowLeftIcon />
            <span>
              <T>Back</T>
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ) : (
        <>
          <SidebarUtilityItem
            icon={<SettingsIcon />}
            label={gt("Settings")}
            onClick={handleSettingsClick}
          />
          {pullRequestsSupported ? (
            <SidebarUtilityItem
              icon={<PullRequestGlyph.pullRequest />}
              label={gt("Pull requests")}
              onClick={handlePullRequestsClick}
            />
          ) : null}
          {issuesSupported ? (
            <SidebarUtilityItem
              icon={<IssueGlyph.issue />}
              label={gt("Issues", { $context: "sidebar link to the list of issues" })}
              onClick={handleIssuesClick}
            />
          ) : null}
          <SidebarUtilityItem
            icon={<ChartNoAxesColumnIcon />}
            label={gt("Usage")}
            onClick={handleUsageClick}
          />
        </>
      )}
    </SidebarMenu>
  );
});

export const SidebarChromeFooter = memo(function SidebarChromeFooter() {
  return (
    <SidebarFooter>
      <SidebarThreadUndoNotice />
      <div className="md:hidden">
        <SidebarUtilityMenu />
      </div>
    </SidebarFooter>
  );
});
