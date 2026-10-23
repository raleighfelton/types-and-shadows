import { ImageResponse } from "next/og";
import { FORMATS } from "@/lib/shareUrl";
import { Card, pairCard, typeCard } from "@/og/card";
import { loadCanonFrom, loadFonts, loadOgArcs } from "@/og/data";
import { parseStyle, parseTarget } from "@/og/share";
import { PALETTE_COLORS } from "@/lib/settingsConfig";

// GET /card?type=serpent&f=square&t=KJV&theme=dark&p=lapis → PNG
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams;
  const origin = url.origin;
  const [canon, arcs, fonts] = await Promise.all([loadCanonFrom(origin), loadOgArcs(origin), loadFonts()]);
  const target = parseTarget(canon, q);
  if (!target) return new Response("Unknown type or reference", { status: 404 });
  const { translation, format, light, palette } = parseStyle(q);
  const colors = PALETTE_COLORS[palette][light ? "light" : "dark"];
  const model =
    target.kind === "type"
      ? await typeCard(target.entry, canon, translation, format, origin)
      : await pairCard(canon, translation, format, target.a, target.b, target.bEnd, colors.link, origin);
  const { width, height } = FORMATS[format];
  return new ImageResponse(<Card model={model} format={format} colors={colors} light={light} arcs={arcs} />, {
    width,
    height,
    fonts,
    headers: { "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable" },
  });
}
