import { scopeThreadRef } from "@cadro/client-runtime/environment";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@cadro/client-runtime/state/runtime";
import { deriveThreadQueueWorkflowState } from "@cadro/client-runtime/state/thread-workflows";
import { assistantCitationsToPlainText } from "@cadro/shared/assistantCitations";
import { isSlashCommand } from "@cadro/shared/composerTrigger";
import {
  isAttachmentOnlyBootstrapPrompt,
  replaceComposerContextReferences,
} from "@cadro/shared/composerContextReferences";
import { composerFileLinksToPlainText } from "@cadro/shared/composerInlineTokens";
import {
  parseGoalCommand,
  type ChatAttachment as ContractChatAttachment,
  type EnvironmentId,
  type MessageId,
  type RunId,
  type ThreadId,
} from "@cadro/contracts";
import { resolveUserMessagePresentation } from "@cadro/client-runtime/user-message";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpIcon,
  CornerDownRightIcon,
  ListEndIcon,
  EllipsisIcon,
  FileIcon,
  CalendarClockIcon,
  ChevronDownIcon,
  Clock3Icon,
  MessagesSquareIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import * as DateTime from "effect/DateTime";
import { msg, T, useGT, useMessages } from "gt-react";
import { thrownErrorMessage } from "@cadro/client-runtime/errors";
import { useId, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";

import { useAssetUrls } from "../../assets/assetUrls";
import { threadEnvironment } from "../../state/threads";
import { useQuietThreadProjection, useQuietThreadShell } from "../../state/entities";
import { useEnvironment } from "../../state/environments";
import { useAtomCommand } from "../../state/use-atom-command";
import { isImageAttachment, type ChatImageAttachment, type ChatMessage } from "../../types";
import { cn } from "~/lib/utils";
import { Button, InlineButton } from "../ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "../ui/menu";
import { toastManager } from "../ui/toast";
import { m } from "../../i18n/messages";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import type { TimestampFormat } from "@cadro/contracts/settings";
import { GuestMessageName } from "./guestMessageStyle";
import { TimelineRowTimestamp } from "./TimelineRowParts";
import { FoldedMessageHeader, useScheduledTaskTitle } from "./TimelineUserMessageRow";
import { buildExpandedImagePreview, type ExpandedImagePreview } from "./ExpandedImagePreview";

export interface EditQueuedRunRequest {
  readonly runId: RunId;
  readonly messageId: MessageId;
  readonly text: string;
  readonly attachments: ReadonlyArray<ContractChatAttachment>;
}

// A longer queue shows its first messages and a button that shows the rest.
const QUEUE_VISIBLE_ROWS = 3;

export interface QueuedRunsControlHandle {
  steerNext: (repeat: boolean) => boolean;
  editLatest: (repeat: boolean) => boolean;
}

type ThreadQueueProjection = Parameters<typeof deriveThreadQueueWorkflowState>[0];

function queuedImageResources(projection: ThreadQueueProjection | undefined) {
  if (!projection) return [];
  return deriveThreadQueueWorkflowState(projection).queuedRuns.flatMap(({ attachments }) =>
    attachments.flatMap((attachment) =>
      isImageAttachment(attachment)
        ? [{ _tag: "attachment" as const, attachmentId: attachment.id }]
        : [],
    ),
  );
}

export function QueuedRunsControl({
  ref,
  ...props
}: {
  readonly ref?: Ref<QueuedRunsControlHandle>;
  readonly steerShortcutLabel?: string | null;
  readonly editShortcutLabel?: string | null;
  readonly environmentId: EnvironmentId;
  readonly threadId: ThreadId;
  readonly optimisticMessages: ReadonlyArray<
    Pick<ChatMessage, "id" | "inputIntent" | "text" | "attachments">
  >;
  readonly editingRunId: RunId | null;
  /** Set while something else holds the composer, such as an open question. */
  readonly editBlockedReason: string | null;
  readonly onEditQueuedRun: (request: EditQueuedRunRequest) => void;
  readonly onCancelEdit: () => void;
  readonly timestampFormat: TimestampFormat;
  readonly onOpenThread: (threadId: ThreadId, environmentId?: EnvironmentId) => void;
  readonly onImageExpand: (preview: ExpandedImagePreview) => void;
}) {
  const gt = useGT();
  const messages = useMessages();
  const projection = useQuietThreadProjection(
    scopeThreadRef(props.environmentId, props.threadId),
  )?.projection;
  const promote = useAtomCommand(threadEnvironment.promoteQueuedRun);
  const resume = useAtomCommand(threadEnvironment.resumeThreadQueue);
  const cancel = useAtomCommand(threadEnvironment.cancelQueuedRun);
  const [showAll, setShowAll] = useState(false);
  const queueListId = useId();
  const [busyRunId, setBusyRunId] = useState<RunId | null>(null);
  const steerInFlightRef = useRef(false);
  // Run-only acknowledgements can resurrect pending rows after cancellation or startup.
  const acknowledgedMessageIds = new Set((projection?.messages ?? []).map((message) => message.id));
  const queuedImageAttachmentResources = queuedImageResources(projection);
  const queuedImageAttachmentUrls = useAssetUrls(
    props.environmentId,
    queuedImageAttachmentResources,
  );
  const workflow = projection ? deriveThreadQueueWorkflowState(projection, messages) : null;
  const queued = workflow?.queuedRuns ?? [];
  const activeRun = workflow?.activeRun ?? null;
  // A fresh message starts its own turn: it may skip compaction, but not steer into a turn.
  const canSendRun = (freshContext: boolean) =>
    workflow?.canSendNow === true ||
    (workflow?.canPromoteToSteer === true &&
      (!freshContext || workflow.promoteSkipsCompaction === true));
  const queuedImageUrlById = new Map(
    queuedImageAttachmentUrls.flatMap((url, index) => {
      const resource = queuedImageAttachmentResources[index];
      return url && resource ? [[resource.attachmentId, url] as const] : [];
    }),
  );
  const optimisticQueued = props.optimisticMessages.filter(
    (message) => message.inputIntent === "queued_turn" && !acknowledgedMessageIds.has(message.id),
  );
  const items = [
    ...queued.map(({ run, text, attachments, context, message }, serverIndex) => ({
      key: run.id,
      message,
      runId: run.id,
      messageId: run.userMessageId,
      freshContext: run.freshContext === true,
      serverIndex,
      text,
      // A guest's message keeps the guest's words; the owner can cancel it, not rewrite it.
      editable: context?.guest === undefined,
      attachments,
      thumbnails: attachments.filter(isImageAttachment).map<ChatImageAttachment>((attachment) => {
        const previewUrl = queuedImageUrlById.get(attachment.id);
        return {
          ...attachment,
          type: "image",
          ...(previewUrl ? { previewUrl } : {}),
        };
      }),
      files: attachments
        .filter((entry) => !isImageAttachment(entry))
        .map(({ id, name }) => ({ id, name })),
      pending: false,
    })),
    ...optimisticQueued.map((message) => ({
      key: message.id,
      message: undefined,
      runId: null,
      messageId: null,
      freshContext: false,
      serverIndex: null,
      text: message.text,
      editable: true,
      attachments: [] as ReadonlyArray<ContractChatAttachment>,
      thumbnails: (message.attachments ?? []).filter(isImageAttachment),
      files: (message.attachments ?? [])
        .filter((entry) => !isImageAttachment(entry))
        .map(({ id, name }) => ({ id, name })),
      pending: true,
    })),
  ];

  const sendQueuedMessage = async (queuedRunId: RunId) => {
    const freshContext = queued.some(
      ({ run }) => run.id === queuedRunId && run.freshContext === true,
    );
    if (!canSendRun(freshContext) || steerInFlightRef.current) return;
    steerInFlightRef.current = true;
    setBusyRunId(queuedRunId);
    const result = workflow?.canSendNow
      ? await resume({
          environmentId: props.environmentId,
          input: { threadId: props.threadId, runId: queuedRunId },
        })
      : activeRun !== null
        ? await promote({
            environmentId: props.environmentId,
            input: { threadId: props.threadId, queuedRunId, targetRunId: activeRun.id },
          })
        : null;
    steerInFlightRef.current = false;
    setBusyRunId(null);
    if (result?._tag === "Failure" && !isAtomCommandInterrupted(result)) {
      const error = squashAtomCommandFailure(result);
      toastManager.add({
        type: "error",
        title: m(msg("Could not send queued message")),
        description:
          error instanceof Error
            ? (thrownErrorMessage(error, m) ?? error.message)
            : m(msg("An error occurred.")),
      });
    }
  };

  useImperativeHandle(ref, () => ({
    steerNext(repeat) {
      const next = queued[0];
      if (!next || !canSendRun(next.run.freshContext === true)) return false;
      if (!repeat && busyRunId === null) void sendQueuedMessage(next.run.id);
      return true;
    },
    // Leave the key to caret navigation while editing.
    editLatest(repeat) {
      const latest = queued.at(-1);
      if (
        !latest ||
        latest.context?.guest !== undefined ||
        props.editingRunId !== null ||
        props.editBlockedReason !== null ||
        busyRunId !== null
      ) {
        return false;
      }
      if (!repeat) {
        setShowAll(true);
        props.onEditQueuedRun({
          runId: latest.run.id,
          messageId: latest.run.userMessageId,
          text: latest.text,
          attachments: latest.attachments,
        });
      }
      return true;
    },
  }));

  if (items.length === 0) return null;

  const remove = async (runId: RunId) => {
    setBusyRunId(runId);
    const result = await cancel({
      environmentId: props.environmentId,
      input: { threadId: props.threadId, runId },
    });
    setBusyRunId(null);
    if (result._tag === "Failure" && !isAtomCommandInterrupted(result)) {
      const error = squashAtomCommandFailure(result);
      toastManager.add({
        type: "error",
        title: m(msg("An error occurred.")),
        description: thrownErrorMessage(error, m) ?? String(error),
      });
    }
  };

  const collapsible = items.length > QUEUE_VISIBLE_ROWS;
  const visibleItems = collapsible && !showAll ? items.slice(0, QUEUE_VISIBLE_ROWS - 1) : items;

  return (
    <section
      aria-label={gt(
        "{count, plural, one {{count} queued message} other {{count} queued messages}}",
        { count: items.length },
      )}
      data-thread-queue="true"
      className="relative mx-2 -mb-3 max-h-[30dvh] sm:mx-3 overflow-y-auto overscroll-contain rounded-t-2xl border border-b-0 border-border/70 bg-background pb-3 text-foreground"
    >
      <span className="sr-only" aria-live="polite">
        {gt("{count, plural, one {{count} queued} other {{count} queued}}", {
          count: items.length,
        })}
      </span>
      <ol className="flex min-w-0 flex-col divide-y divide-border/45" id={queueListId}>
        {visibleItems.map((item, position) => {
          const previewText = isAttachmentOnlyBootstrapPrompt(item.text)
            ? ""
            : assistantCitationsToPlainText(
                composerFileLinksToPlainText(
                  replaceComposerContextReferences(item.text, (reference) => reference.label),
                ),
              ).trim();
          const isEditing = item.runId !== null && item.runId === props.editingRunId;
          // The server decides on the agent's text, and a goal command can stop the turn.
          const sentText = { text: item.message?.text ?? item.text, attachments: item.attachments };
          const movesCommandFirst = isSlashCommand(sentText) && parseGoalCommand(sentText) === null;
          const steersCurrentTurn =
            workflow?.canPromoteToSteer === true &&
            !workflow.canSendNow &&
            !workflow.promoteSkipsCompaction &&
            !movesCommandFirst;
          return (
            <li
              key={item.key}
              aria-label={gt("Queued message {position} of {total}, not sent", {
                position: position + 1,
                total: items.length,
              })}
              aria-posinset={position + 1}
              aria-setsize={items.length}
              aria-current={isEditing ? "true" : undefined}
              className="group/queued min-w-0 px-2 sm:px-2.5"
            >
              <QueuedMessage
                environmentId={props.environmentId}
                message={item.message}
                previewText={previewText}
                thumbnails={item.thumbnails}
                files={item.files}
                isEditing={isEditing}
                editDisabled={
                  item.runId === null ||
                  !item.editable ||
                  busyRunId !== null ||
                  props.editBlockedReason !== null
                }
                editHint={
                  props.editBlockedReason ??
                  (item.serverIndex === queued.length - 1 && props.editShortcutLabel
                    ? gt("Edit in the composer ({shortcut})", { shortcut: props.editShortcutLabel })
                    : gt("Edit in the composer"))
                }
                onEdit={() => {
                  if (item.runId !== null && item.messageId !== null)
                    props.onEditQueuedRun({
                      runId: item.runId,
                      messageId: item.messageId,
                      text: item.text,
                      attachments: item.attachments,
                    });
                }}
                timestampFormat={props.timestampFormat}
                onOpenThread={props.onOpenThread}
                onImageExpand={props.onImageExpand}
              >
                {canSendRun(item.freshContext) && !isEditing ? (
                  <>
                    <Tooltip>
                      <TooltipTrigger render={<span className="flex shrink-0" />}>
                        <Button
                          size="xs"
                          variant="ghost-muted"
                          disabled={item.runId === null || busyRunId !== null}
                          onClick={() => {
                            if (item.runId !== null) {
                              void sendQueuedMessage(item.runId);
                            }
                          }}
                        >
                          {steersCurrentTurn ? <CornerDownRightIcon /> : <ArrowUpIcon />}
                          {steersCurrentTurn ? gt("Steer") : <T>Send now</T>}
                        </Button>
                      </TooltipTrigger>
                      <TooltipPopup>
                        {item.serverIndex === 0 && props.steerShortcutLabel
                          ? workflow?.canSendNow
                            ? gt("Start a turn with this message ({shortcut})", {
                                shortcut: props.steerShortcutLabel,
                              })
                            : workflow?.promoteSkipsCompaction
                              ? gt("Skip compaction and send this message ({shortcut})", {
                                  shortcut: props.steerShortcutLabel,
                                })
                              : movesCommandFirst
                                ? gt("Move this command to the front of the queue ({shortcut})", {
                                    shortcut: props.steerShortcutLabel,
                                  })
                                : gt("Send into the current turn ({shortcut})", {
                                    shortcut: props.steerShortcutLabel,
                                  })
                          : workflow?.canSendNow
                            ? gt("Start a turn with this message")
                            : workflow?.promoteSkipsCompaction
                              ? gt("Skip compaction and send this message")
                              : movesCommandFirst
                                ? gt("Move this command to the front of the queue")
                                : gt("Send into the current turn")}
                      </TooltipPopup>
                    </Tooltip>
                  </>
                ) : null}
                {item.pending ? (
                  <span className="flex items-center gap-1 px-1">
                    <Clock3Icon aria-hidden className="size-3" />
                    <T>Saving</T>
                  </span>
                ) : null}
                {isEditing ? (
                  <>
                    <span className="px-1 text-foreground">
                      <T>Editing in the composer</T>
                    </span>
                    <Button
                      size="xs"
                      variant="ghost"
                      aria-label={gt("Cancel editing queued message")}
                      onClick={props.onCancelEdit}
                    >
                      <T>Cancel</T>
                    </Button>
                  </>
                ) : (
                  <>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            size="icon-xs"
                            variant="ghost-muted"
                            aria-label={gt("Remove queued message")}
                            disabled={item.runId === null || busyRunId !== null}
                            onClick={() => {
                              if (item.runId !== null) void remove(item.runId);
                            }}
                          />
                        }
                      >
                        <Trash2Icon />
                      </TooltipTrigger>
                      <TooltipPopup>
                        <T>Remove from queue</T>
                      </TooltipPopup>
                    </Tooltip>
                  </>
                )}
              </QueuedMessage>
            </li>
          );
        })}
      </ol>
      {collapsible ? (
        <div className="self-end pe-1 text-xs pointer-coarse:[&_[data-slot=inline-button]]:relative pointer-coarse:[&_[data-slot=inline-button]]:after:absolute pointer-coarse:[&_[data-slot=inline-button]]:after:-inset-x-1.5 pointer-coarse:[&_[data-slot=inline-button]]:after:-inset-y-3.5">
          <InlineButton
            tone="muted"
            aria-expanded={showAll}
            aria-controls={queueListId}
            // Keep the composer focused; keyboard activation still works.
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => setShowAll((value) => !value)}
          >
            {showAll
              ? gt("Show fewer")
              : gt(
                  "{count, plural, one {Show all {count} queued} other {Show all {count} queued}}",
                  { count: items.length },
                )}
            <ChevronDownIcon
              aria-hidden
              className={cn(
                "size-3.5 transition-transform duration-150 motion-reduce:transition-none",
                showAll && "rotate-180",
              )}
            />
          </InlineButton>
        </div>
      ) : null}
    </section>
  );
}

type QueuedRunMessage = NonNullable<ThreadQueueProjection["messages"][number]>;

/** Compact preview and actions live together above the composer. */
function QueuedMessage(props: {
  readonly environmentId: EnvironmentId;
  readonly message: QueuedRunMessage | undefined;
  readonly previewText: string;
  readonly files: readonly { readonly id: string; readonly name: string }[];
  readonly editDisabled: boolean;
  readonly editHint: string;
  readonly onEdit: () => void;
  readonly thumbnails: ReadonlyArray<ChatImageAttachment>;
  readonly isEditing: boolean;
  readonly timestampFormat: TimestampFormat;
  readonly onOpenThread: (threadId: ThreadId, environmentId?: EnvironmentId) => void;
  readonly children: ReactNode;
  readonly onImageExpand: (preview: ExpandedImagePreview) => void;
}) {
  const gt = useGT();
  const presentation = props.message ? resolveUserMessagePresentation(props.message) : null;
  const attribution = presentation?.attribution ?? null;
  const scheduledTaskId = presentation?.scheduledTaskId;
  const senderThreadId = props.message?.senderThreadId;
  // A linked environment's agent sent it from a thread there.
  const senderRef =
    props.message?.linkedSender ??
    (senderThreadId === undefined ? null : scopeThreadRef(props.environmentId, senderThreadId));
  const [expanded, setExpanded] = useState(false);
  const taskTitle = useScheduledTaskTitle(props.environmentId, scheduledTaskId);
  const senderShell = useQuietThreadShell(attribution === "agent" ? senderRef : null);
  const linkedSenderEnvironment = useEnvironment(
    props.message?.linkedSender?.environmentId ?? null,
  );
  const senderTitle = senderShell?.title.trim() || props.message?.linkedSender?.title.trim();
  const fold =
    attribution === "automation"
      ? {
          icon: CalendarClockIcon,
          label: gt("Automation"),
          fitLabel: true,
          summary: taskTitle ?? props.previewText.split(/\r?\n/, 1)[0] ?? "",
        }
      : attribution === "agent"
        ? {
            icon: MessagesSquareIcon,
            label:
              senderTitle ||
              gt("Agent", { $context: "fallback name of the agent that sent a message" }),
            fitLabel: !senderTitle,
            summary: props.previewText.split(/\r?\n/).find((line) => line.trim()) ?? "",
          }
        : null;
  const thumbnails = props.thumbnails.slice(0, 2);
  const firstFile = props.files[0]?.name;
  const hiddenCount =
    props.thumbnails.length - thumbnails.length + Math.max(0, props.files.length - 1);
  const renderThumbnail = (thumbnail: ChatImageAttachment) => (
    <button
      key={thumbnail.id}
      type="button"
      className="size-6 shrink-0 overflow-hidden rounded border border-border bg-background enabled:cursor-zoom-in"
      aria-label={gt("Preview {name}", { name: thumbnail.name })}
      disabled={!thumbnail.previewUrl}
      onPointerDown={(event) => event.preventDefault()}
      onClick={() => {
        const preview = buildExpandedImagePreview(props.thumbnails, thumbnail.id);
        if (preview) props.onImageExpand(preview);
      }}
    >
      {thumbnail.previewUrl ? (
        <img src={thumbnail.previewUrl} alt={thumbnail.name} className="size-full object-cover" />
      ) : (
        <span aria-label={thumbnail.name} />
      )}
    </button>
  );
  return (
    <>
      <div
        className={cn(
          "flex min-h-9 min-w-0 items-center gap-1.5 py-1 text-sm",
          props.isEditing && "text-primary",
        )}
      >
        <ListEndIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground/65" />
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {(!fold || expanded) && thumbnails.map(renderThumbnail)}
          {!fold && firstFile && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="flex min-w-0 max-w-[40%] items-center gap-1 text-muted-foreground" />
                }
              >
                <FileIcon aria-hidden className="size-3.5 shrink-0" />
                <span className="truncate">{firstFile}</span>
              </TooltipTrigger>
              <TooltipPopup>{firstFile}</TooltipPopup>
            </Tooltip>
          )}
          {hiddenCount > 0 && !fold && (
            <span className="shrink-0 text-xs text-muted-foreground">+{hiddenCount}</span>
          )}
          {fold ? (
            <FoldedMessageHeader
              icon={fold.icon}
              label={fold.label}
              fitLabel={fold.fitLabel}
              summary={fold.summary}
              expanded={expanded}
              onToggle={() => setExpanded(!expanded)}
            />
          ) : (
            <Tooltip>
              <TooltipTrigger render={<span className="min-w-0 truncate" />}>
                {props.previewText}
              </TooltipTrigger>
              <TooltipPopup>{props.previewText}</TooltipPopup>
            </Tooltip>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
          {props.children}
          <Menu>
            <MenuTrigger
              render={
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost-muted"
                  aria-label={gt("More")}
                />
              }
            >
              <EllipsisIcon />
            </MenuTrigger>
            <MenuPopup align="end" side="top">
              {!props.isEditing && (
                <MenuItem
                  disabled={props.editDisabled}
                  title={props.editHint}
                  onClick={props.onEdit}
                >
                  <PencilIcon />
                  {gt("Edit queued message")}
                </MenuItem>
              )}
              <MenuItem onClick={() => setExpanded(!expanded)}>
                {expanded ? gt("Show less") : gt("Show more")}
              </MenuItem>
            </MenuPopup>
          </Menu>
        </div>
      </div>
      {expanded && (
        <div className="max-h-36 overflow-auto px-5 pb-2 text-sm">
          {props.thumbnails.length > 2 && (
            <div className="flex flex-wrap gap-1 py-1">
              {props.thumbnails.slice(2).map(renderThumbnail)}
            </div>
          )}
          {props.previewText && (
            <p className="whitespace-pre-wrap wrap-anywhere">{props.previewText}</p>
          )}
          {props.files.map(({ id, name }) => (
            <div key={id} className="break-all text-xs text-muted-foreground">
              {name}
            </div>
          ))}
        </div>
      )}
      {(attribution !== null || expanded) && props.message ? (
        <div className="flex flex-wrap items-center gap-2 px-5 pb-1 text-xs text-muted-foreground">
          {attribution === "t3code" && (
            <span>
              <T>Sent by Cadro</T>
            </span>
          )}
          {presentation?.guestName !== undefined && (
            <GuestMessageName name={presentation.guestName} />
          )}
          {attribution === "agent" &&
          senderRef &&
          // Only an environment this client is connected to can open the sender's thread there.
          (props.message?.linkedSender === undefined || linkedSenderEnvironment !== null) ? (
            <InlineButton
              tone="muted"
              onClick={() => props.onOpenThread(senderRef.threadId, senderRef.environmentId)}
            >
              <T>Open thread</T>
            </InlineButton>
          ) : null}
          {scheduledTaskId ? (
            <InlineButton
              tone="muted"
              render={
                <Link
                  to="/settings/scheduled-tasks"
                  search={{ environmentId: props.environmentId, taskId: scheduledTaskId }}
                />
              }
            >
              <T>Open automation</T>
            </InlineButton>
          ) : null}
          <TimelineRowTimestamp
            createdAt={DateTime.formatIso(props.message.createdAt)}
            timestampFormat={props.timestampFormat}
            alwaysVisible
          />
        </div>
      ) : null}
    </>
  );
}
