/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [],
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(task|tflite)$/,
      type: "asset/resource",
    });
    return config;
  },
};

module.exports = nextConfig;
