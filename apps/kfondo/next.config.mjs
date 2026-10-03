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
};

export default withNextIntl(nextConfig);
