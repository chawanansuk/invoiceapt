import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // payment slip uploads (base64 data URL) can exceed the 1MB default
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
