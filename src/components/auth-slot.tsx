/**
 * AuthSlot — reserved space on the far right of the top bar for a future
 * avatar / sign-in affordance. Today renders nothing visible but maintains
 * fixed layout width so authentication can drop in without reflow.
 */
export function AuthSlot() {
  return (
    <div
      data-testid="auth-slot"
      aria-hidden="true"
      className="size-9 shrink-0"
    />
  );
}
