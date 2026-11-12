// Site identity, shared by metadata, share images and links.
export const SITE_NAME = "Types & Shadows";
export const SITE_URL = "https://typesandshadows.app";
export const SITE_HOST = new URL(SITE_URL).host;
export const TAGLINE = "The Bible is the original hypertext";
/** The title lockup: the "&" is set upright in the accent color. */
export const TITLE_PARTS = ["Types ", "&", " Shadows"] as const;
/** Tagline in small caps: tracking as a fraction of its font size. */
export const TAGLINE_TRACKING = 0.18;
export const AUTHOR_URL = "https://raleighfelton.com";
export const SOURCE_URL = "https://github.com/raleighfelton/types-and-shadows";
/** The iPhone and iPad app on the App Store. */
export const APP_STORE_URL = "https://apps.apple.com/app/id6831792356";
/**
 * Whether the app is on the App Store yet. Until it is, the site says
 * "coming soon" and shows no link to the store. Turn on by setting
 * NEXT_PUBLIC_APP_LIVE=1 (in Vercel, then redeploy).
 */
export const APP_LIVE = process.env.NEXT_PUBLIC_APP_LIVE === "1";
