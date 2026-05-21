import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      allowedOrigins: ["162.243.186.191", "localhost:3001", "127.0.0.1:3001"],
    },
  },
};

export default nextConfig;
