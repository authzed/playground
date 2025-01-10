import { useEffect } from 'react';

declare global {
    interface Window {
        gtag: (kind: string, subkind: any, data?: Record<string, any>) => any
        dataLayer: any[];
    }
}

let tagInjected = false;
let userSet = false;

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
            window.gtag = window.gtag || function () { window.dataLayer.push(arguments) };
            window.gtag('js', new Date());
            window.gtag('config', measurementId);

            // Install the Google Tags Manager.
            let script = document.createElement('script');
            script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
            script.async = true;

            document.body.appendChild(script);
            tagInjected = true;

            return () => {
                document.body.removeChild(script);
            };
        }
    });

    const pushEvent = (eventName: string, eventParams: Record<string, any>) => {
        if (!tagInjected) {
            return
        }
        window.gtag('event', eventName, eventParams);
    };

    const setValue = (valueKey: string, value: Record<string, any>) => {
        if (!tagInjected) {
            return
        }
        window.gtag('set', valueKey, value);
    };

    const setUser = (userData: Record<string, any>) => {
        if (userSet) { return; }
        setValue('user', userData);
        userSet = true;
    };

    return { initialized: !!measurementId, setValue: setValue, pushEvent: pushEvent, setUser: setUser };
};