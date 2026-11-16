import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  basePath: "/app",
  output: "standalone",
  transpilePackages: ["@rigintel/classic-rig-runtime"],
};

export default withNextIntl(nextConfig);