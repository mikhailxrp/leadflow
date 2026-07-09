import type { NextConfig } from "next";

function getS3RemotePattern(): NonNullable<
  NextConfig["images"]
>["remotePatterns"] {
  const publicUrlBase = process.env.S3_PUBLIC_URL_BASE;
  if (!publicUrlBase) {
    return [];
  }

  const url = new URL(publicUrlBase);
  return [
    {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
    },
  ];
}

const nextConfig: NextConfig = {
  images: {
    // Marketer avatars are served from S3-compatible storage (Beget Cloud
    // Storage) — hostname is derived from S3_PUBLIC_URL_BASE so this stays
    // correct without a manual edit once the bucket is provisioned.
    remotePatterns: getS3RemotePattern(),
  },
};

export default nextConfig;
