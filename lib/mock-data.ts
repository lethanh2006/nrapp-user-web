import type {
  Conversation,
  DirectoryPerson,
  MenuItem,
  UserTask,
} from "@/lib/types";

export const demoReference = {
  isoDate: "2026-09-03T09:42:00+07:00",
  scheduleIndex: 3,
} as const;

export const currentUser = {
  id: "user-minh-anh",
  name: "Lê Minh Anh",
  initials: "MA",
  email: "minhanh@hdg.vn",
  phone: "090 123 4567",
  role: "Nhân viên",
  department: "Game Design",
  employeeCode: "HDG-0248",
  joinedAt: "12/03/2024",
};

export const tasks: UserTask[] = [
  {
    id: "task-1",
    title: "Hoàn thiện luồng onboarding người chơi",
    description: "Rà soát tutorial, bổ sung microcopy và bàn giao prototype cho đội Unity.",
    status: "in_progress",
    priority: "high",
    dueLabel: "Hôm nay · 17:30",
    category: "RPG Thần Thoại",
  },
  {
    id: "task-2",
    title: "Tổng hợp phản hồi Alpha Test",
    description: "Nhóm các phản hồi theo gameplay, UI và hiệu năng để chuẩn bị buổi review.",
    status: "todo",
    priority: "medium",
    dueLabel: "04/09 · 10:00",
    category: "Research",
  },
  {
    id: "task-3",
    title: "Cập nhật design system bản 2.4",
    description: "Chuẩn hóa component trạng thái và tài liệu handoff cho hai sản phẩm mới.",
    status: "todo",
    priority: "low",
    dueLabel: "08/09 · 16:00",
    category: "Design System",
  },
  {
    id: "task-4",
    title: "Review nội dung sự kiện Trung thu",
    description: "Kiểm tra visual, phần thưởng và lịch mở sự kiện cùng Product Owner.",
    status: "done",
    priority: "medium",
    dueLabel: "Đã hoàn thành hôm qua",
    category: "LiveOps",
  },
  {
    id: "task-5",
    title: "Chuẩn bị tài liệu Sprint Planning",
    description: "Ước lượng đầu việc và phụ thuộc kỹ thuật cho sprint kế tiếp.",
    status: "done",
    priority: "high",
    dueLabel: "Đã hoàn thành 30/08",
    category: "Nội bộ",
  },
];

export const menuItems: MenuItem[] = [
  { id: "menu-1", name: "Cơm gà sốt tiêu đen", description: "Gà áp chảo, rau củ và sốt tiêu nhà làm", price: 45000, category: "Cơm", accent: "amber", icon: "🍗", popular: true },
  { id: "menu-2", name: "Bún bò Huế", description: "Nước dùng đậm vị, bò mềm và rau sống", price: 42000, category: "Món nước", accent: "rose", icon: "🍜", popular: true },
  { id: "menu-3", name: "Cơm cá kho tộ", description: "Cá basa kho tiêu, canh rau và cơm nóng", price: 40000, category: "Cơm", accent: "cyan", icon: "🐟" },
  { id: "menu-4", name: "Salad ức gà", description: "Ức gà nướng, rau xanh và sốt mè rang", price: 39000, category: "Eat clean", accent: "emerald", icon: "🥗" },
  { id: "menu-5", name: "Mì Ý bò bằm", description: "Sốt cà chua, bò bằm và parmesan", price: 48000, category: "Món Âu", accent: "violet", icon: "🍝" },
  { id: "menu-6", name: "Cà phê sữa đá", description: "Cà phê rang xay và sữa đặc", price: 22000, category: "Đồ uống", accent: "blue", icon: "☕" },
];

export const people: DirectoryPerson[] = [
  { id: "person-1", name: "Nguyễn Hoàng Nam", initials: "HN", role: "Unity Developer", department: "Game Development", email: "hoangnam@hdg.vn", phone: "090 231 4821", tone: "blue", online: true },
  { id: "person-2", name: "Trần Thu Hà", initials: "TH", role: "Product Owner", department: "Product", email: "thuha@hdg.vn", phone: "098 442 1930", tone: "violet", online: true },
  { id: "person-3", name: "Phạm Đức Long", initials: "DL", role: "2D Artist", department: "Game Art", email: "duclong@hdg.vn", phone: "093 712 0456", tone: "amber" },
  { id: "person-4", name: "Vũ Khánh Linh", initials: "KL", role: "HR Business Partner", department: "Nhân sự", email: "khanhlinh@hdg.vn", phone: "091 352 7890", tone: "rose", online: true },
  { id: "person-5", name: "Đặng Quang Minh", initials: "QM", role: "Backend Engineer", department: "Platform", email: "quangminh@hdg.vn", phone: "097 821 4302", tone: "cyan" },
  { id: "person-6", name: "Lê Ngọc Mai", initials: "NM", role: "QA Engineer", department: "Quality Assurance", email: "ngocmai@hdg.vn", phone: "096 240 1187", tone: "emerald", online: true },
];

export const conversations: Conversation[] = [
  {
    id: "conversation-1",
    personId: "person-2",
    preview: "Mình vừa gửi lại roadmap sprint nhé",
    time: "09:42",
    unread: 2,
    messages: [
      { id: "message-1", body: "Chào Minh Anh, phần onboarding hôm nay ổn chứ?", time: "09:31" },
      { id: "message-2", body: "Ổn chị ạ. Em đang chốt microcopy và sẽ gửi prototype trước 15h.", time: "09:34", mine: true },
      { id: "message-3", body: "Tốt quá. Mình vừa gửi lại roadmap sprint nhé", time: "09:42" },
    ],
  },
  {
    id: "conversation-2",
    personId: "person-1",
    preview: "Build mới đã lên staging rồi",
    time: "Hôm qua",
    messages: [
      { id: "message-4", body: "Build mới đã lên staging rồi, bạn test giúp mình tutorial nhé.", time: "16:20" },
      { id: "message-5", body: "Mình nhận được rồi, sáng mai mình test đầu tiên.", time: "16:25", mine: true },
    ],
  },
  {
    id: "conversation-3",
    personId: "person-4",
    preview: "Nhớ cập nhật lịch tuần tới nha em",
    time: "Thứ hai",
    messages: [
      { id: "message-6", body: "Nhớ cập nhật lịch tuần tới nha em, cổng đăng ký đóng vào thứ Sáu.", time: "14:10" },
      { id: "message-7", body: "Dạ vâng, chiều nay em gửi lịch ạ.", time: "14:13", mine: true },
    ],
  },
  {
    id: "conversation-4",
    personId: "person-6",
    preview: "Cảm ơn bạn nhiều nhé!",
    time: "28/08",
    messages: [
      { id: "message-8", body: "Mình đã bổ sung case UI lỗi mạng vào checklist.", time: "11:02", mine: true },
      { id: "message-9", body: "Cảm ơn bạn nhiều nhé!", time: "11:08" },
    ],
  },
];

export const weekSchedule = [
  { day: "Thứ hai", date: "31/08", type: "office", label: "Tại văn phòng", time: "08:30 – 17:30", note: "Studio 1" },
  { day: "Thứ ba", date: "01/09", type: "office", label: "Tại văn phòng", time: "08:30 – 17:30", note: "Studio 1" },
  { day: "Thứ tư", date: "02/09", type: "remote", label: "Làm từ xa", time: "08:30 – 17:30", note: "Daily lúc 09:00" },
  { day: "Thứ năm", date: "03/09", type: "office", label: "Tại văn phòng", time: "08:30 – 17:30", note: "Sprint review 15:00" },
  { day: "Thứ sáu", date: "04/09", type: "office", label: "Tại văn phòng", time: "08:30 – 17:30", note: "Studio 1" },
  { day: "Thứ bảy", date: "05/09", type: "off", label: "Ngày nghỉ", time: "Cả ngày", note: "" },
  { day: "Chủ nhật", date: "06/09", type: "off", label: "Ngày nghỉ", time: "Cả ngày", note: "" },
] as const;

export const announcements = [
  {
    id: "news-1",
    category: "Sản phẩm",
    title: "Alpha Test dự án RPG Thần Thoại chính thức mở cho nhân viên",
    description: "Trải nghiệm build đầu tiên, ghi lại cảm nhận và cùng đội ngũ hoàn thiện thế giới game mới.",
    date: "Hôm nay",
    icon: "Gamepad2",
    tone: "blue",
  },
  {
    id: "news-2",
    category: "Văn hóa",
    title: "Đăng ký HDG Run 2026 – Cùng nhau chinh phục đường chạy",
    description: "Ba cự ly linh hoạt, huy chương riêng và quà tặng dành cho toàn thể thành viên HDG.",
    date: "01/09/2026",
    icon: "Footprints",
    tone: "amber",
  },
  {
    id: "news-3",
    category: "Nội bộ",
    title: "Lịch nghỉ lễ và hướng dẫn trực vận hành tháng 9",
    description: "Theo dõi lịch phân ca, đầu mối hỗ trợ và các lưu ý khi làm việc từ xa trong kỳ nghỉ.",
    date: "29/08/2026",
    icon: "CalendarHeart",
    tone: "violet",
  },
] as const;

export const workRequests = [
  { id: "request-1", type: "Làm việc từ xa", range: "02/09/2026 · Cả ngày", status: "Đã duyệt", tone: "emerald" },
  { id: "request-2", type: "Đi muộn", range: "26/08/2026 · 09:30", status: "Đã duyệt", tone: "emerald" },
  { id: "request-3", type: "Nghỉ phép", range: "08/09/2026 · Buổi chiều", status: "Chờ duyệt", tone: "amber" },
] as const;
