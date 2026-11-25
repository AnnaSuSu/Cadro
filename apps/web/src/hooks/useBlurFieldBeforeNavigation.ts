import { useRouter } from "@tanstack/react-router";
import { useEffect, type RefObject } from "react";

/** Commit blur-saved edits before navigation unmounts the focused field. */
export function useBlurFieldBeforeNavigation(container: RefObject<HTMLElement | null>) {
  const router = useRouter();
  // oxlint-disable-next-line cadro/no-unreasoned-state-sync -- the router notifies before a field is removed
  useEffect(
    () =>
      router.subscribe("onBeforeLoad", ({ pathChanged }) => {
        const field = document.activeElement;
        if (
          pathChanged &&
          field instanceof HTMLElement &&
          container.current?.contains(field) &&
          field.matches("input, textarea, [contenteditable]")
        )
          field.blur();
      }),
    [router, container],
  );
}
