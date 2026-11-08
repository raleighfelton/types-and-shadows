// Anonymous usage analytics (PostHog): which views, chapters, types and
// features get used. No accounts, no cookies, nothing linked to a person.
// Off when no key is configured (local development).
import posthog from "posthog-js";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

export function initAnalytics() {
  if (!KEY || typeof window === "undefined") return;
  posthog.init(KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    person_profiles: "identified_only",
    persistence: "localStorage",
    autocapture: false,
    capture_pageview: true,
    disable_session_recording: true,
  });
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!KEY || typeof window === "undefined") return;
  posthog.capture(event, properties);
}
