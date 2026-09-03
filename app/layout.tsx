import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HDG WorkSpace · Nhân viên",
    template: "%s · HDG WorkSpace",
  },
  description: "Không gian làm việc dành cho nhân viên HDG",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
