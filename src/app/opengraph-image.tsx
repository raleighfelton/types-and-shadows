import { ImageResponse } from "next/og";
import { SiteCard } from "@/og/card";
import { loadFonts, loadOgArcs } from "@/og/data";
import { PALETTE_COLORS } from "@/lib/settingsConfig";
import { FORMATS } from "@/lib/shareUrl";
import { SITE_NAME, TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME}: a rainbow of the Bible's cross-references. ${TAGLINE}.`;
export const size = { width: FORMATS.wide.width, height: FORMATS.wide.height };
export const contentType = "image/png";

// Built once at deploy time from the generated data on disk.
export default async function Image() {
  const [arcs, fonts] = await Promise.all([loadOgArcs(), loadFonts()]);
  return new ImageResponse(<SiteCard colors={PALETTE_COLORS.lapis.dark} arcs={arcs} />, { ...size, fonts });
}
