import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig = {
  distDir: process.env.KFONDO_TEST_DIST_DIR || ".next",
  transpilePackages: [
    "next-intl",
    "use-intl",
    "@my-ridings/elevation-profile",
    "@my-ridings/plan-geometry",
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
  skipTrailingSlashRedirect: true,
  async headers() {
    return ["/admin/:path*", "/api/admin/:path*", "/api/courses/gpx-upload"].map((source) => ({
      source,
      headers: [
        { key: "Cache-Control", value: "private, no-store" },
        { key: "CDN-Cache-Control", value: "no-store" },
      ],
    }));
  },
  async redirects() {
    return [
      {
        source: "/admin/:path*",
        missing: [{ type: "host", value: "(?:admin\\..*|localhost)" }],
        destination: "/",
        permanent: false,
      },
      {
        source: "/:path((?!admin(?:/|$)|api(?:/|$)|_next(?:/|$)|_vercel(?:/|$)|.*\\.).*)",
        has: [{ type: "host", value: "admin\\..*" }],
        destination: "/admin",
        permanent: false,
      },
      // 한국어의 외부 URL에는 접두사를 붙이지 않는다.
      { source: "/ko/:path*", destination: "/:path*", permanent: true },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        // 언어는 URL로만 결정한다. Accept-Language와 쿠키는 읽지 않는다.
        { source: "/", destination: "/ko" },
        {
          source: "/:path((?!en(?:/|$)|ko(?:/|$)|admin(?:/|$)|api(?:/|$)|_next(?:/|$)|_vercel(?:/|$)|.*\\.).+)",
          destination: "/ko/:path",
        },
      ],
    };
  },
};

export default withNextIntl(nextConfig);
