import { T, useGT } from "gt-react";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import {
  createContext,
  type ComponentProps,
  type ReactNode,
  type RefObject,
  useContext,
} from "react";

import { cn } from "~/lib/utils";
import { dispatchCommandPalette } from "../commandPaletteStore";
import { type CommandPaletteOverlayTab } from "./CommandPalette.logic";
import { Command, CommandFooter, CommandInput, CommandPanel } from "./ui/command";
import { Kbd, KbdGroup } from "./ui/kbd";

const COMMAND_PALETTE_OVERLAY_TABS = [
  "all",
  "actions",
  "threads",
  "projects",
  "files",
  "content",
] as const satisfies ReadonlyArray<CommandPaletteOverlayTab>;

// File and content search remount the footer. Carry the keyboard focus target across that mount.
export const CommandPaletteTabFocusContext =
  createContext<RefObject<CommandPaletteOverlayTab | null> | null>(null);

/**
 * A view replacing another inside an open dialog mounts with focus on the body,
 * left there by the removed input. Claim it so typing cannot reach the composer
 * behind the modal. On first open the dialog's own initial focus handles it.
 */
function claimFocusInOpenDialog(input: HTMLInputElement) {
  const active = input.ownerDocument.activeElement;
  if (active?.matches('[role="tab"]')) return;
  if (
    active === null ||
    active === input.ownerDocument.body ||
    input.closest('[role="dialog"]')?.contains(active)
  ) {
    input.focus();
  }
}

export interface PendingInputSelection {
  readonly value: string;
  readonly start: number | null;
  readonly end: number | null;
  readonly direction: "forward" | "backward" | "none" | null;
}

function restorePendingSelection(
  input: HTMLInputElement,
  pendingSelectionRef: RefObject<PendingInputSelection | null> | undefined,
) {
  const selection = pendingSelectionRef?.current;
  if (!pendingSelectionRef || !selection) return;
  pendingSelectionRef.current = null;
  if (input.value !== selection.value) return;
  input.setSelectionRange(selection.start, selection.end, selection.direction ?? undefined);
}

export function CommandPaletteSearchTabs({
  activeTab,
  query,
}: {
  readonly activeTab: CommandPaletteOverlayTab;
  readonly query: string;
}) {
  const gt = useGT();
  const pendingTabFocusRef = useContext(CommandPaletteTabFocusContext);
  const labels = {
    all: gt("All"),
    actions: gt("Actions"),
    threads: gt("Threads"),
    projects: gt("Projects"),
    files: gt("Files"),
    content: gt("Text"),
  };
  const tabs = COMMAND_PALETTE_OVERLAY_TABS;

  return (
    <div
      role="tablist"
      aria-label={gt("Search")}
      className="flex min-w-0 flex-wrap items-center gap-1"
    >
      {tabs.map((tab, index) => {
        const active = tab === activeTab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            ref={(button) => {
              if (!button || !active || pendingTabFocusRef?.current !== tab) return;
              pendingTabFocusRef.current = null;
              button.focus();
            }}
            className={cn(
              "cursor-pointer rounded-md px-2 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              active
                ? "bg-foreground/10 text-foreground"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
            )}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={() => {
              if (!active) dispatchCommandPalette({ _tag: "SelectTab", tab, query });
            }}
            onKeyDown={(event) => {
              let nextIndex: number;
              switch (event.key) {
                case "ArrowLeft":
                  nextIndex = (index + tabs.length - 1) % tabs.length;
                  break;
                case "ArrowRight":
                  nextIndex = (index + 1) % tabs.length;
                  break;
                case "Home":
                  nextIndex = 0;
                  break;
                case "End":
                  nextIndex = tabs.length - 1;
                  break;
                default:
                  return;
              }
              event.preventDefault();
              event.stopPropagation();
              const nextTab = tabs[nextIndex]!;
              if (nextTab === activeTab) return;
              if (pendingTabFocusRef) pendingTabFocusRef.current = nextTab;
              dispatchCommandPalette({ _tag: "SelectTab", tab: nextTab, query });
            }}
          >
            {labels[tab]}
          </button>
        );
      })}
    </div>
  );
}

type CommandPaletteContentProps = Omit<ComponentProps<typeof Command>, "children"> & {
  readonly children: ReactNode;
  readonly escapeLabel?: ReactNode;
  readonly footerActionLabel?: ReactNode;
  readonly footerLeading?: ReactNode;
  readonly footerTrailing?: ReactNode;
  readonly inputAccessory?: ReactNode;
  readonly inputProps: ComponentProps<typeof CommandInput>;
  readonly pendingSelectionRef?: RefObject<PendingInputSelection | null>;
  readonly panelSize?: "list" | "tall-list" | "fill";
  readonly showBackHint?: boolean;
  readonly testId?: string;
};

export function CommandPaletteContent({
  children,
  escapeLabel,
  footerActionLabel,
  footerLeading,
  footerTrailing,
  inputAccessory,
  inputProps,
  pendingSelectionRef,
  panelSize = "list",
  showBackHint,
  testId,
  ...commandProps
}: CommandPaletteContentProps) {
  const pendingTabFocusRef = useContext(CommandPaletteTabFocusContext);
  return (
    <div className="contents" data-testid={testId}>
      <Command {...commandProps}>
        <div className="relative">
          <CommandInput
            autoFocus={false}
            {...inputProps}
            ref={(input) => {
              if (!input) return;
              restorePendingSelection(input, pendingSelectionRef);
              if (pendingTabFocusRef?.current) {
                if (footerLeading !== undefined) return;
                pendingTabFocusRef.current = null;
              }
              claimFocusInOpenDialog(input);
            }}
          />
          {inputAccessory}
        </div>
        <CommandPanel
          className={
            panelSize === "fill"
              ? "flex min-h-0 flex-1 flex-col"
              : panelSize === "tall-list"
                ? "max-h-[min(34rem,76vh)]"
                : "flex max-h-[min(28rem,70vh)] min-h-0 flex-col"
          }
        >
          {children}
        </CommandPanel>
        <CommandFooter className="max-sm:flex-col max-sm:items-start">
          {footerLeading !== undefined ? (
            footerLeading
          ) : (
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
              <KbdGroup>
                <Kbd>
                  <ArrowUpIcon />
                </Kbd>
                <Kbd>
                  <ArrowDownIcon />
                </Kbd>
                <span>
                  <T>Navigate</T>
                </span>
              </KbdGroup>
              {footerActionLabel !== undefined ? (
                <KbdGroup>
                  <Kbd>Enter</Kbd>
                  <span>{footerActionLabel}</span>
                </KbdGroup>
              ) : null}
              {showBackHint ? (
                <KbdGroup>
                  <Kbd>Backspace</Kbd>
                  <span>
                    <T>Back</T>
                  </span>
                </KbdGroup>
              ) : null}
              <KbdGroup>
                <Kbd>Esc</Kbd>
                <span>{escapeLabel ?? <T>Close</T>}</span>
              </KbdGroup>
            </div>
          )}
          {footerTrailing}
        </CommandFooter>
      </Command>
    </div>
  );
}
