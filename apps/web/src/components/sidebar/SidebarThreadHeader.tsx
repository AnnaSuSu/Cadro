import { useGT } from "gt-react";
import { ChevronDownIcon, PlusIcon, SearchIcon, SquarePenIcon, XIcon } from "lucide-react";
import {
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
  useState,
} from "react";

import { cn } from "~/lib/utils";
import { openCommandPalette } from "../../commandPaletteBus";
import { Button } from "../ui/button";
import { SidebarInput, SidebarMenuButton } from "../ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

import { SidebarChromeHeader } from "./SidebarChrome";

export interface SidebarThreadHeaderProps {
  isElectron: boolean;
  treeMode: boolean;
  projectsExpanded: boolean;
  onToggleProjects: () => void;
  onAddProject: () => void;
  hasProjects: boolean;
  projectScope: ReactNode;
  onNewThread: (event: ReactMouseEvent) => void;
  newThreadDisabled: boolean;
  newThreadShortcutLabel: string | null | undefined;
  newThreadInProjectShortcutLabel: string | null | undefined;
  showNewThreadInProjectHint: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  isSearching: boolean;
  searchResultCount: number;
  activeSearchResultIndex: number;
  onClearSearch: () => void;
}

export function SidebarThreadHeader({
  isElectron,
  treeMode,
  projectsExpanded,
  onToggleProjects,
  onAddProject,
  hasProjects,
  projectScope,
  onNewThread,
  newThreadDisabled,
  newThreadShortcutLabel,
  newThreadInProjectShortcutLabel,
  showNewThreadInProjectHint,
  searchInputRef,
  searchQuery,
  onSearchQueryChange,
  onSearchKeyDown,
  isSearching,
  searchResultCount,
  activeSearchResultIndex,
  onClearSearch,
}: SidebarThreadHeaderProps) {
  const gt = useGT();
  const [searchOpen, setSearchOpen] = useState(false);
  const resultsVisible = isSearching && searchResultCount > 0;
  // Shrinking results can remove the active option; never leave aria-activedescendant pointing at it.
  const activeResultExists = resultsVisible && activeSearchResultIndex < searchResultCount;
  const newThreadLabel = newThreadShortcutLabel
    ? gt("New thread ({shortcut})", { shortcut: newThreadShortcutLabel })
    : gt("New thread");

  const searchField = (
    <div
      className={cn(
        "flex h-8 min-w-0 flex-1 items-center gap-2 rounded-full border border-sidebar-border bg-sidebar-control-surface px-2 py-1.5 text-sm text-sidebar-muted-foreground focus-within:ring-1 focus-within:ring-inset focus-within:ring-ring/70",
        treeMode && !searchOpen && !isSearching && "sr-only",
      )}
      onFocus={() => setSearchOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget) && !searchQuery)
          setSearchOpen(false);
      }}
    >
      <SearchIcon className="size-4 shrink-0 text-(--sidebar-icon-color)" />
      <SidebarInput
        ref={searchInputRef}
        nativeInput
        type="search"
        value={searchQuery}
        onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
        onKeyDown={onSearchKeyDown}
        placeholder={gt("Search", { $context: "search field placeholder" })}
        aria-label={gt("Search threads")}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={resultsVisible}
        aria-controls={resultsVisible ? "sidebar-thread-search-results" : undefined}
        aria-activedescendant={
          activeResultExists ? `sidebar-thread-search-result-${activeSearchResultIndex}` : undefined
        }
        className="min-w-0 flex-1"
      />
      {isSearching ? (
        <Button
          type="button"
          size="icon-micro"
          variant="ghost-muted"
          className="shrink-0"
          aria-label={gt("Clear thread search")}
          onClick={() => {
            onClearSearch();
            searchInputRef.current?.focus();
          }}
        >
          <XIcon className="size-3" />
        </Button>
      ) : null}
    </div>
  );

  if (treeMode) {
    return (
      <div className="flex flex-col">
        <SidebarChromeHeader isElectron={isElectron}>
          {hasProjects ? projectScope : null}
          <SidebarHeaderIconButton
            label={gt("Search threads")}
            onClick={() => openCommandPalette()}
          >
            <SearchIcon aria-hidden className="size-4 stroke-(length:--sidebar-icon-stroke)" />
          </SidebarHeaderIconButton>
        </SidebarChromeHeader>
        <div className="mt-1.5 flex items-center">
          <SidebarMenuButton
            type="button"
            variant="primary"
            disabled={newThreadDisabled}
            onClick={onNewThread}
            title={
              newThreadShortcutLabel
                ? gt("New chat ({shortcut})", { shortcut: newThreadShortcutLabel })
                : gt("New chat")
            }
            size="row"
            className="min-w-0 flex-1"
          >
            <SquarePenIcon aria-hidden className="size-4 stroke-(length:--sidebar-icon-stroke)" />
            <span>{gt("New chat")}</span>
          </SidebarMenuButton>
        </div>
        {!isSearching ? (
          <div className="group/projects flex items-center mt-3.5 h-8 gap-0.5">
            <button
              type="button"
              aria-expanded={projectsExpanded}
              onClick={onToggleProjects}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-(--sidebar-section-label) hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              {gt("Projects")}
              <ChevronDownIcon
                aria-hidden
                className={cn(
                  "size-3 motion-safe:transition-[opacity,rotate] motion-safe:duration-150",
                  projectsExpanded
                    ? "opacity-0 group-hover/projects:opacity-100 group-focus-within/projects:opacity-100 pointer-coarse:opacity-100"
                    : "-rotate-90",
                )}
              />
            </button>
            <div className="flex items-center opacity-0 group-hover/projects:opacity-100 group-focus-within/projects:opacity-100 has-aria-expanded:opacity-100 pointer-coarse:opacity-100">
              <SidebarHeaderIconButton label={gt("Add project")} onClick={onAddProject}>
                <PlusIcon aria-hidden />
              </SidebarHeaderIconButton>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <SidebarChromeHeader isElectron={isElectron} />
      <div className="mt-1 flex items-center gap-1">
        {searchField}
        <div className="flex shrink-0 items-center">
          {hasProjects ? projectScope : null}
          <SidebarHeaderIconButton
            label={gt("New thread")}
            tooltip={
              showNewThreadInProjectHint ? (
                <span className="flex flex-col gap-0.5">
                  <span>{newThreadLabel}</span>
                  <span className="text-muted-foreground">
                    {newThreadInProjectShortcutLabel
                      ? gt("New thread in current project: Shift+click ({shortcut})", {
                          shortcut: newThreadInProjectShortcutLabel,
                        })
                      : gt("New thread in current project: Shift+click")}
                  </span>
                </span>
              ) : (
                newThreadLabel
              )
            }
            disabled={newThreadDisabled}
            onClick={onNewThread}
          >
            <SquarePenIcon />
          </SidebarHeaderIconButton>
        </div>
      </div>
    </>
  );
}

export function SidebarHeaderIconButton({
  label,
  tooltip = label,
  className,
  children,
  ...rest
}: {
  label: string;
  tooltip?: ReactNode;
  className?: string | undefined;
  children?: ReactNode;
} & Omit<
  ComponentProps<typeof SidebarMenuButton>,
  "children" | "className" | "tooltip" | "isActive" | "aria-label"
>) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <SidebarMenuButton
            size="icon"
            type="button"
            aria-label={label}
            {...rest}
            className={cn("relative size-7 shrink-0", className)}
          />
        }
      >
        {children}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
        />
      </TooltipTrigger>
      <TooltipPopup side="top">{tooltip}</TooltipPopup>
    </Tooltip>
  );
}
