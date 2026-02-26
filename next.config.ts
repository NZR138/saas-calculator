import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "(?<subdomain>.*)\\.vercel\\.app",
          },
        ],
        destination: "https://www.ukprofit.co.uk/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "ukprofit.co.uk",
          },
        ],
        destination: "https://www.ukprofit.co.uk/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
