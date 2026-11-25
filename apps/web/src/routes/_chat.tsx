import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { ThreadRouteView } from "../components/ThreadRouteView";
import { GlobalVoiceInputIndicator } from "../components/chat/GlobalVoiceInputIndicator";
import { workspaceSubpage } from "../components/sidebar/mainAppLocation";
import { SidebarInset } from "../components/ui/sidebar";
import { resolveThreadRouteTarget } from "../threadRoutes";
import { retainThreadFindForRoute } from "../components/chat/threadFindStore";
import { ThreadLinkPrompt } from "../components/promptLinks/ThreadLinkPrompt";
import { useShownThreadRouteTarget } from "../hooks/useShownThreadRouteTarget";

function ChatRouteLayout() {
  // Render both routes here so draft promotion keeps the same ChatView mounted.
  const { shownTarget, subpage } = useShownThreadRouteTarget();
  return (
    <>
      {shownTarget?.kind === "server" && !subpage ? (
        <ThreadLinkPrompt threadRef={shownTarget.threadRef} />
      ) : null}
      {shownTarget ? (
        <ThreadRouteView
          target={shownTarget}
          presentation={
            subpage === "settings" ? "hidden" : subpage === "usage" ? "background" : "active"
          }
        />
      ) : subpage === "usage" ? (
        <SidebarInset className="h-dvh" />
      ) : null}
      {subpage || !shownTarget ? <Outlet /> : null}
      <GlobalVoiceInputIndicator hidden={subpage === "usage"} />
    </>
  );
}

export const Route = createFileRoute("/_chat")({
  beforeLoad: async ({ context, location }) => {
    if (
      context.authGateState.status !== "authenticated" &&
      context.authGateState.status !== "hosted-static"
    ) {
      throw redirect({ to: "/pair", replace: true });
    }
    return { retainThread: workspaceSubpage(location.pathname) !== null };
  },
  component: ChatRouteLayout,
  // Every match carries the whole location's params, so this layout sees the thread route's too.
  onEnter: ({ context, params }) => retainThreadFindForRouteMatch(context.retainThread, params),
  onStay: ({ context, params }) => retainThreadFindForRouteMatch(context.retainThread, params),
  onLeave: () => retainThreadFindForRoute({ modalPage: false, threadRef: null }),
});

function retainThreadFindForRouteMatch(
  modalPage: boolean,
  params: Partial<Record<"environmentId" | "threadId", string>>,
) {
  const target = resolveThreadRouteTarget(params);
  retainThreadFindForRoute({
    modalPage,
    threadRef: target?.kind === "server" ? target.threadRef : null,
  });
}
