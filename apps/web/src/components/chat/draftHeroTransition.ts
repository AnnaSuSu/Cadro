export const DRAFT_HERO_TRANSITION_ANIMATION_ID = "cadro-draft-hero-transition";
export const DRAFT_HERO_TRANSITION_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";
export async function waitForDraftHeroTransition(): Promise<void> {
  if (typeof document === "undefined" || typeof document.getAnimations !== "function") {
    return;
  }

  const activeTransitions = document
    .getAnimations()
    .filter((animation) => animation.id === DRAFT_HERO_TRANSITION_ANIMATION_ID);

  await Promise.all(
    activeTransitions.map(async (animation) => {
      try {
        await animation.finished;
      } catch {}
    }),
  );
}

