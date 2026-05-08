import { Joyride, ACTIONS, EVENTS, type Step } from "react-joyride";

export const TourElementClass = {
  schema: "tec-schema",
  browse: "tec-browse",
  testrel: "tec-testrel",
  assert: "tec-assert",
  run: "tec-run",
  problems: "tec-problems",
  checkwatch: "tec-checkwatch",
  share: "tec-share",
};

const steps: Step[] = [
  {
    target: `.${TourElementClass.schema}`,
    title: "Welcome!",
    content: "Begin by editing permission system's schema here...",
  },
  {
    target: `.${TourElementClass.browse}`,
    title: "Browse",
    content: "...or start with a pre-built example",
  },
  {
    target: `.${TourElementClass.testrel}`,
    title: "Test Relationships",
    content: "Add test relationships into your database...",
  },
  {
    target: `.${TourElementClass.assert}`,
    title: "Assertions",
    content: "...and then define assertions to validate your schema and relationships",
  },
  {
    target: `.${TourElementClass.run}`,
    title: "Validate",
    content: "Click Run to test your assertions against your permissions system",
  },
  {
    target: `.${TourElementClass.problems}`,
    title: "Problems",
    content: "Any problems in your schema or assertions will appear here",
  },
  {
    target: `.${TourElementClass.checkwatch}`,
    title: "Check Watches",
    content: "Permission checks can also be evaluated live by adding them here",
  },
  {
    target: `.${TourElementClass.share}`,
    title: "Share",
    content:
      "Click Share to get a shareable link. Contact us with any questions as your build out your system!",
  },
  {
    target: `.${TourElementClass.schema}`,
    title: "Start editing!",
    content: "You are all ready to start editing your permission schema!",
  },
];

// Joyride passes these values directly through to inline element styles, so CSS
// custom properties (var(--color-...)) won't resolve. Read the actual computed
// values from the document at render time so the tooltip matches the active
// theme tokens.
const resolveTokens = () => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      primaryColor: "#7c3aed",
      backgroundColor: "#ffffff",
      textColor: "#000000",
      arrowColor: "#ffffff",
    };
  }
  const cs = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) => {
    const v = cs.getPropertyValue(name).trim();
    return v.length > 0 ? v : fallback;
  };
  const popoverBg = get("--color-popover", get("--popover", "#ffffff"));
  const popoverFg = get("--color-popover-foreground", get("--popover-foreground", "#000000"));
  const primary = get("--color-primary", get("--primary", "#7c3aed"));
  return {
    primaryColor: primary,
    backgroundColor: popoverBg,
    textColor: popoverFg,
    arrowColor: popoverBg,
  };
};

const handleEvents = (
  onSkip: () => void,
  onTourEnd: () => void,
  onEnterStep: (className: string) => void,
) => {
  return (data: { action: string; index: number; size: number; type: string; step: Step }) => {
    const { action, type, step } = data;

    // Tour start
    if (ACTIONS.START === action && EVENTS.TOUR_START === type) {
      // No-op
    }
    // Tour finish
    if (ACTIONS.NEXT === action && EVENTS.TOUR_END === type) {
      onTourEnd();
    }
    // Tour before step
    if (ACTIONS.NEXT === action && EVENTS.STEP_BEFORE === type) {
      if (typeof step.target === "string") {
        onEnterStep(step.target);
      }
    }
    // Tour step
    if (ACTIONS.UPDATE === action && EVENTS.TOOLTIP === type) {
      // No-op
    }
    // Tour skip
    if ((ACTIONS.SKIP === action && EVENTS.TOUR_END === type) || ACTIONS.CLOSE === action) {
      onSkip();
    }
  };
};

export function GuidedTour(props: {
  show: boolean;
  onSkip: () => void;
  onTourEnd: () => void;
  onEnterStep: (className: string) => void;
}) {
  const { show, onSkip, onTourEnd, onEnterStep } = props;
  const tokens = resolveTokens();

  return (
    <>
      {show && (
        <Joyride
          run={show}
          continuous
          onEvent={handleEvents(onSkip, onTourEnd, onEnterStep)}
            options={{
              showProgress: true,
              buttons: ['back', 'close', 'primary', 'skip'],
              arrowColor: tokens.arrowColor,
              backgroundColor: tokens.backgroundColor,
              primaryColor: tokens.primaryColor,
              textColor: tokens.textColor,
              zIndex: 999,
            }}
          steps={steps}
        />
      )}
    </>
  );
}
