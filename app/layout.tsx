import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthSessionProvider } from "@/components/providers/auth-session-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "vietnamese"], display: "swap", variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "NRApp WorkSpace · Nhân viên",
    template: "%s · NRApp WorkSpace",
  },
  description: "Không gian làm việc số dành cho nhân viên HDG",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={inter.variable}>
      <body><AuthSessionProvider>{children}</AuthSessionProvider></body>
    </html>
  );
}
