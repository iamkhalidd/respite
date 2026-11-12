import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // photos are shrunk in the browser first, so each upload is well under this
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
  // the showcase is for the owners only: keep it out of search engines
  async headers() {
    return process.env.SHOWCASE ? [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }] : [];
  },
};

export default nextConfig;
