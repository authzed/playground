/**
 * @authzed/consent core (read-only consumer)
 *
 * Copied from authzed/web src/consent/core/.
 * Portable consent utilities with zero external dependencies.
 *
 * This is a read-only consumer: it reads the `az-consent` cookie set by
 * the marketing site (authzed.com) but does not write it or show a banner.
 * Consent decisions are made on authzed.com and shared via the cookie.
 */
export {
  readConsentCookie,
  parseConsentCookie,
  consentedIdentify,
  shouldOptOutCapturing,
  CONSENT_COOKIE_NAME,
} from './storage';
export { isEUVisitor } from './eu-detection';
export type { ConsentPreferences } from './types';
