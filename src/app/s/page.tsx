import type { Metadata } from "next";
import { headers } from "next/headers";
import { cache } from "react";
import { formatRange } from "@/lib/bible";
import { SITE_NAME } from "@/lib/site";
import { clip, loadCanonFrom } from "@/og/data";
import { appHash, parseTarget } from "@/og/share";
import type { Format } from "@/lib/shareUrl";
import Redirect from "./Redirect";

// Share links: /s?type=serpent or /s?a=John.3.14&b=Num.21.8. Social sites read
// this page's metadata (title, description, image); people get sent on to the
// matching view in the app.

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Shared by generateMetadata and the page within one request.
const requestOrigin = cache(async () => {
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
});

async function resolve(searchParams: Props["searchParams"]) {
  const raw = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") q.set(k, v);
  const canon = await loadCanonFrom(await requestOrigin());
  return { q, canon, target: parseTarget(canon, q) };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q, canon, target } = await resolve(searchParams);
  if (!target) return {};
  const title =
    target.kind === "type"
      ? `${target.entry.title} · ${SITE_NAME}`
      : `${formatRange(canon, target.a, target.a)} and ${formatRange(canon, target.b, target.bEnd)} · ${SITE_NAME}`;
  const description =
    target.kind === "type"
      ? clip(`${target.entry.note} (${target.entry.shadow[0].label} → ${target.entry.anchor.label})`, 200)
      : "A cross-reference between two passages, on the map of the Bible's connections.";
  const image = new URLSearchParams(q);
  image.set("f", "wide" satisfies Format);
  const images = [{ url: `/card?${image}`, width: 1200, height: 630, alt: title }];
  return {
    title,
    description,
    openGraph: { title, description, images, type: "article", siteName: SITE_NAME },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function SharePage({ searchParams }: Props) {
  const { canon, target } = await resolve(searchParams);
  return <Redirect to={`/${target ? appHash(canon, target) : ""}`} />;
}
