import { scopedThreadKey } from "@cadro/client-runtime/environment";
import { useMatches } from "@tanstack/react-router";
import { useState } from "react";

import { getPreviousThreadTarget, workspaceSubpage } from "../components/sidebar/mainAppLocation";
import type { ThreadRouteTarget } from "../threadRoutes";
import { useThreadRouteTarget } from "./useThreadRouteTarget";

function threadRouteTargetKey(target: ThreadRouteTarget | null) {
  if (!target) return null;
  return target.kind === "server" ? scopedThreadKey(target.threadRef) : target.draftId;
}

/** Keep the current thread mounted while visiting Settings or Usage. */
export function useShownThreadRouteTarget() {
  const routeTarget = useThreadRouteTarget();
  // Read matches, not location, so this agrees with the params useThreadRouteTarget reads.
  const subpage = useMatches({
    select: (matches) => workspaceSubpage(matches.at(-1)?.pathname ?? ""),
  });
  const [backgroundTarget, setBackgroundTarget] = useState(() =>
    subpage ? getPreviousThreadTarget() : routeTarget,
  );
  if (!subpage && threadRouteTargetKey(backgroundTarget) !== threadRouteTargetKey(routeTarget)) {
    setBackgroundTarget(routeTarget);
  }
  return { shownTarget: subpage ? backgroundTarget : routeTarget, subpage };
}
