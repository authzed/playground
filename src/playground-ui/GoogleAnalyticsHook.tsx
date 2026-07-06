import { useEffect } from "react";

import { isEUVisitor, readConsentCookie } from "@/lib/consent";

declare global {
  interface Window {
    gtag: (
      kind: string,
      subkind: object | string,
      data?: Record<string, object | string | boolean>,
    ) => object;
    dataLayer: object[];
  }
}

let tagInjected = false;
let userSet = false;

/**
 * hasMarketingConsent reports whether ad-related storage (e.g. Google Consent
 * Mode's ad_storage) may be used. EU-ish visitors are opt-in (denied until the
 * az-consent cookie says otherwise); everyone else is opt-out (granted unless
 * the cookie says otherwise).
 */
const hasMarketingConsent = (isEU: boolean): boolean => {
  const consent = readConsentCookie();
  if (consent !== null) return consent.marketing;
  return !isEU;
};

/**
 * useGoogleAnalytics is a hook which registers with Google Analytics and reports
 * all page URL changes via the specified measurementId.
 *
 * If the measurementId is not specified or empty, simply returns the handlers
 * for registering custom events.
 *
 * A call with the measurementId parameter can only be made *once*.
 *
 * @example
 *  // To initialize (should be at the root of the App)
 *  useGoogleAnalytics(measurementId);
 *
 *  // To set the user
 *  const { setUser } = useGoogleAnalytics();
 *  setUser({'id': ... , 'otherField': ... })
 *
 *  // To register an event
 *  const { pushEvent } = useGoogleAnalytics();
 *  pushEvent('the-event-kind', {'data': 'here'})
 */
export const useGoogleAnalytics = (measurementId?: string) => {
  useEffect(() => {
    if (measurementId && !tagInjected) {
      // Configure Tags Manager.
      window.dataLayer = window.dataLayer || [];
      // As of 2025-01 we're probably going to get rid of this file soon in favor
      // of GTM.
      window.gtag =
        window.gtag ||
        function () {
          // eslint-disable-next-line prefer-rest-params
          window.dataLayer.push(arguments);
        };
      // Consent Mode: ad-related storage defaults to denied, then is updated
      // from the az-consent cookie before the GTM container loads. EU-ish
      // visitors are opt-in (denied absent a cookie); everyone else is
      // opt-out (granted absent a cookie).
      window.gtag("consent", "default", {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
      const adConsent = hasMarketingConsent(isEUVisitor()) ? "granted" : "denied";
      window.gtag("consent", "update", {
        ad_storage: adConsent,
        ad_user_data: adConsent,
        ad_personalization: adConsent,
      });

      window.gtag("js", new Date());
      window.gtag("config", measurementId);

      // Install the Google Tags Manager.
      const script = document.createElement("script");
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      script.async = true;

      document.body.appendChild(script);
      tagInjected = true;

      return () => {
        document.body.removeChild(script);
      };
    }
  });

  const pushEvent = (eventName: string, eventParams: Record<string, object | string | boolean>) => {
    if (!tagInjected) {
      return;
    }
    window.gtag("event", eventName, eventParams);
  };

  const setValue = (valueKey: string, value: Record<string, object>) => {
    if (!tagInjected) {
      return;
    }
    window.gtag("set", valueKey, value);
  };

  const setUser = (userData: Record<string, object>) => {
    if (userSet) {
      return;
    }
    setValue("user", userData);
    userSet = true;
  };

  return {
    initialized: !!measurementId,
    setValue: setValue,
    pushEvent: pushEvent,
    setUser: setUser,
  };
};
