import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Cho phép tải tài nguyên dev và kết nối HMR khi mở web qua IP LAN.
  allowedDevOrigins: ["192.168.0.108"],
};

export default nextConfig;
