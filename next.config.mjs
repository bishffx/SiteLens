/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverComponentsExternalPackages: ["lighthouse", "chrome-launcher", "playwright", "axe-core"],
  },
};

export default nextConfig;
