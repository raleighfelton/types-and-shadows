import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Lets phones on the same Wi-Fi load the dev server.
  allowedDevOrigins: ["10.0.0.*", "192.168.*.*"],
  // Share images read these fonts from disk at request time.
  outputFileTracingIncludes: { "/**": ["./src/og/fonts/**"] },
  // iOS reads this file to open typesandshadows.app links in the app.
  headers: async () => [
    {
      source: "/.well-known/apple-app-site-association",
      headers: [{ key: "Content-Type", value: "application/json" }],
    },
  ],
};

export default nextConfig;
