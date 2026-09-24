import type { Metadata } from "next";
import { AuthSessionProvider } from "@/components/providers/auth-session-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NRApp WorkSpace · Nhân viên",
    template: "%s · NRApp WorkSpace",
  },
  description: "Không gian làm việc số dành cho nhân viên HDG",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body><AuthSessionProvider>{children}</AuthSessionProvider></body>
    </html>
  );
}
