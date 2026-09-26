import type { Metadata } from "next";
import { CanteenExperience } from "./canteen-experience";

export const metadata: Metadata = {
  title: "Căn tin",
  description: "Chọn bàn, gọi món và thanh toán tiền mặt tại căn tin HDG.",
};

export default function CanteenPage() {
  return <CanteenExperience />;
}
