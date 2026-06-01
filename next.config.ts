import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pg", "pg-native", "bcrypt", "argon2"],
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/pg/**",
      "./node_modules/pg-types/**",
      "./node_modules/pg-protocol/**",
      "./node_modules/pgpass/**",
      "./node_modules/pg-connection-string/**",
      "./node_modules/split2/**",
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["1dentalai.com", "www.1dentalai.com", "app.1dentalai.com", "162.243.186.191", "localhost:3001", "127.0.0.1:3001"],
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
        ],
      },
      {
        source: "/:path(app|admin|api|login|logout|signup)/:slug*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/:path(login|logout|signup)",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
