/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: "50mb" } },
  images: { unoptimized: true },
  devIndicators: false,
};
export default nextConfig;
