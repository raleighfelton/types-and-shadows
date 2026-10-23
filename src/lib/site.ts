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
