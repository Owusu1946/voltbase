import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@voltbase/constants", "@voltbase/types"],
};

export default nextConfig;
