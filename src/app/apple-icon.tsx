import { ImageResponse } from "next/og";
import { IconArt } from "@/og/icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<IconArt size={180} />, size);
}
