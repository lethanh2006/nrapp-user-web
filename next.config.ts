import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Cho phép tải tài nguyên dev và kết nối HMR khi mở web qua IP LAN.
  allowedDevOrigins: ["192.168.0.108"],
  async redirects() {
    return [
      { source: "/danh-ba", destination: "/tro-chuyen", permanent: true },
      { source: "/nhan-su", destination: "/tro-chuyen", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Google Identity Services yêu cầu policy này khi chạy HTTP localhost.
          { key: "Referrer-Policy", value: "no-referrer-when-downgrade" },
          // Giữ liên lạc giữa cửa sổ chính và popup Google khi FedCM bị tắt.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
};

export default nextConfig;
