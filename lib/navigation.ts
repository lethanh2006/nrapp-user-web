import {
  CalendarDays,
  CheckSquare2,
  FileText,
  Home,
  MessageCircle,
  Soup,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  keywords: string[];
};

export const userNavigation: NavigationItem[] = [
  { href: "/trang-chu", label: "Trang chủ", shortLabel: "Trang chủ", icon: Home, keywords: ["home", "tổng quan"] },
  { href: "/lich-lam", label: "Lịch làm việc", shortLabel: "Lịch", icon: CalendarDays, keywords: ["chấm công", "ca làm", "đăng ký"] },
  { href: "/cong-viec", label: "Công việc của tôi", shortLabel: "Công việc", icon: CheckSquare2, keywords: ["nhiệm vụ", "todo", "task"] },
  { href: "/can-tin", label: "Căn tin", shortLabel: "Căn tin", icon: Soup, keywords: ["món ăn", "đặt món", "thực đơn"] },
  { href: "/tro-chuyen", label: "Trò chuyện", shortLabel: "Tin nhắn", icon: MessageCircle, keywords: ["chat", "tin nhắn", "đồng nghiệp"] },
  { href: "/tien-ich", label: "Đơn từ & nhân sự", shortLabel: "Nhân sự", icon: FileText, keywords: ["đơn từ", "chấm công", "thống kê", "nghỉ phép"] },
];

export const pageTitles: Record<string, string> = {
  "/trang-chu": "Không gian của tôi",
  "/lich-lam": "Lịch làm việc",
  "/cong-viec": "Công việc của tôi",
  "/can-tin": "Căn tin HDG",
  "/tro-chuyen": "Trò chuyện nội bộ",
  "/tien-ich": "Đơn từ & nhân sự",
  "/ho-so": "Hồ sơ cá nhân",
};
