import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Privacy · ${SITE_NAME}`,
  description: "What Types & Shadows does and doesn't collect, on the web and in the iOS app.",
};

// Plain statement for the website and the App Store listing.
export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-parchment">
      <p className="smallcaps text-meta text-muted">Types &amp; Shadows</p>
      <h1 className="mt-2 font-display text-[2.6rem] leading-tight">Privacy</h1>
      <div className="mt-8 space-y-5 text-[17px] leading-relaxed text-soft">
        <p>Types &amp; Shadows is a free study tool. It has no accounts, no ads and no tracking.</p>
        <h2 className="pt-4 font-display text-2xl text-parchment">The iOS app</h2>
        <p>
          The app collects nothing. Everything it needs (the Bible text, the cross-references and the curated types) is
          included in the app, so it works offline and sends no requests about what you read. Your reading settings stay
          on your device. When you share an image or a link, it goes only where you send it through your device&apos;s
          share sheet.
        </p>
        <h2 className="pt-4 font-display text-2xl text-parchment">The website</h2>
        <p>
          typesandshadows.app uses Vercel Web Analytics to count visits. It is anonymous, uses no cookies, and stores no
          personal information. Your reading settings are kept in your browser.
        </p>
        <h2 className="pt-4 font-display text-2xl text-parchment">Questions</h2>
        <p>
          Email{" "}
          <a href="mailto:raleighfelton@gmail.com" className="text-[var(--color-link)] underline">
            raleighfelton@gmail.com
          </a>
          .
        </p>
      </div>
    </main>
  );
}
