import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["tronweb", "xrpl"],
  turbopack: {},
};

export default nextConfig;
