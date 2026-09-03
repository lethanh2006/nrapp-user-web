export type BadgeTone =
  | "blue"
  | "emerald"
  | "amber"
  | "violet"
  | "cyan"
  | "rose"
  | "slate";

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type UserTask = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueLabel: string;
  category: string;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  accent: BadgeTone;
  icon: string;
  popular?: boolean;
};

export type DirectoryPerson = {
  id: string;
  name: string;
  initials: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  tone: BadgeTone;
  online?: boolean;
};

export type ChatMessage = {
  id: string;
  body: string;
  time: string;
  mine?: boolean;
};

export type Conversation = {
  id: string;
  personId: string;
  preview: string;
  time: string;
  unread?: number;
  messages: ChatMessage[];
};
