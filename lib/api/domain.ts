export type ApiUser = {
  _id: string;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
};

export type ApiTaskStatus = "todo" | "in_progress" | "done" | "cancelled";
export type ApiTask = {
  _id: string;
  title: string;
  description?: string;
  status: ApiTaskStatus;
  priority: "low" | "medium" | "high";
  assignedTo?: string | ApiUser;
  createdBy?: string | ApiUser;
  deadline?: string;
  createdAt?: string;
  updatedAt?: string;
};
export type ApiTaskPage = {
  tasks: ApiTask[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
};

export type ScheduleEntryType = "office" | "remote" | "day_off" | "leave";
export type WorkPeriod = "full_day" | "morning" | "afternoon";
export type ApiScheduleEntry = {
  _id?: string;
  date: string;
  type: ScheduleEntryType;
  period?: WorkPeriod;
  note?: string;
};
export type ApiScheduleRequest = {
  _id: string;
  employee_id: string;
  month?: string;
  week_start?: string;
  status: "pending" | "approved" | "rejected";
  submitted_at?: string;
  reviewed_at?: string;
  reject_reason?: string;
  entries?: ApiScheduleEntry[];
};
export type ApiWorkPolicy = {
  schedule_month?: string | null;
  registration_start: string;
  registration_end: string;
  locked?: boolean;
};
export type ApiMonthlyOverview = {
  month: string;
  entries: Array<ApiScheduleEntry & {
    schedule_request_id: string;
    month?: string;
    week_start?: string;
    request_status: "pending" | "approved" | "rejected";
    reject_reason?: string;
  }>;
  stats: {
    registered_sessions: number;
    approved_sessions: number;
    office_sessions: number;
    remote_sessions: number;
    leave_sessions: number;
    day_off_sessions: number;
    approved_work_days: number;
    pending_requests: number;
    approved_requests: number;
    rejected_requests: number;
  };
};
export type ApiWorkRequest = {
  _id: string;
  employee_id: string;
  type: "leave" | "late" | "early" | "overtime" | "business_trip" | "remote";
  status: "pending" | "approved" | "rejected" | "cancelled";
  start_at: string;
  end_at?: string;
  period: "full_day" | "morning" | "afternoon";
  reason: string;
  createdAt?: string;
};
export type ApiAttendance = {
  _id: string;
  employee_id: string;
  date: string;
  schedule_type: "office" | "remote";
  check_in_at?: string;
  check_out_at?: string;
  source: "qr" | "schedule";
};

export type ApiMenuItem = {
  _id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  options?: Array<{ name: string; price: number }>;
};
export type ApiMenuGroup = {
  category: { _id: string; name: string; description?: string };
  items: ApiMenuItem[];
};
export type ApiOrder = {
  _id: string;
  orderNumber: string;
  items: Array<{ menuItemId: string; name: string; quantity: number; unitPrice: number }>;
  finalAmount: number;
  status: "CREATED" | "CONFIRMED" | "COOKING" | "READY" | "COMPLETED" | "PAID" | "CANCELLED";
  paymentStatus: "PENDING" | "PAID" | "REFUNDED";
  paymentMethod: "CASH" | "VIETQR" | "VNPAY" | "MOMO";
  createdAt: string;
};
export type ApiPayment = {
  paymentId: string;
  orderId: string;
  amount: number;
  status: "PENDING" | "SUCCESS" | "FAILED" | "EXPIRED" | "REVIEW_REQUIRED" | "REFUNDED";
  qrUrl: string;
  transferContent: string;
  expiresAt: string;
};

export type ApiChatUser = ApiUser;
export type ApiChatRecord = {
  _id: string;
  users: string[];
  latestMessage: { text: string; sender: string } | null;
  updatedAt: string;
  unseenCount: number;
};
export type ApiChatListItem = { user: { user?: ApiChatUser } | ApiChatUser; chat: ApiChatRecord };
export type ApiMessage = {
  _id: string;
  chatId: string;
  sender: string;
  text?: string;
  image?: { url: string };
  messageType: "text" | "image";
  seen: boolean;
  createdAt: string;
};

export function unwrapData<T>(value: T | { data: T }): T {
  return typeof value === "object" && value !== null && "data" in value
    ? (value as { data: T }).data
    : value as T;
}

export function apiUserName(user: ApiUser | undefined) {
  return user?.name?.trim() || user?.username?.trim() || user?.email?.split("@")[0] || "Người dùng";
}
