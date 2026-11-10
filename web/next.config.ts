import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  // the showcase is for the owners only: keep it out of search engines
  async headers() {
    return process.env.SHOWCASE ? [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }] : [];
  },
};

export default nextConfig;
