"use client";

import {
  ArrowLeft,
  CheckCheck,
  Info,
  MoreHorizontal,
  Paperclip,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Smile,
  Video,
  X,
} from "lucide-react";
import { FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { useAuthSession } from "@/components/providers/auth-session-provider";
import { gatewayApi } from "@/lib/api/gateway";
import { apiUserName, type ApiChatListItem, type ApiMessage, type ApiUser } from "@/lib/api/domain";
import { getUserInitials } from "@/lib/auth/session-user";
import { notifyNavigationMetricsChanged } from "@/lib/navigation-metrics";
import type { ChatMessage, Conversation } from "@/lib/types";
import type { DirectoryPerson } from "@/lib/types";
import styles from "./page.module.css";

const tones: DirectoryPerson["tone"][] = ["blue", "violet", "amber", "rose", "cyan", "emerald"];

function toPerson(raw: ApiUser, index: number): DirectoryPerson {
  const name = apiUserName(raw);
  return { id: raw._id, name, initials: getUserInitials(name), role: raw.role ?? "Thành viên", department: "NRApp", email: raw.email ?? "", phone: "", tone: tones[index % tones.length] };
}

function chatItemUser(item: ApiChatListItem) {
  const wrapper = item.user as { user?: ApiUser };
  return wrapper.user ?? item.user as ApiUser;
}

function unknownPerson(id: string): DirectoryPerson {
  return { id, name: "Đồng nghiệp", initials: "ĐN", role: "Thành viên", department: "NRApp", email: "", phone: "", tone: "slate" };
}

function requestErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function ConversationWorkspace() {
  const { user } = useAuthSession();
  const searchParams = useSearchParams();
  const requestedPersonId = searchParams.get("person");
  const [people, setPeople] = useState<DirectoryPerson[]>([]);
  const [conversationList, setConversationList] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, ChatMessage[]>>({});
  const [unreadByConversation, setUnreadByConversation] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [mobileThreadOpen, setMobileThreadOpen] = useState(Boolean(requestedPersonId));
  const [chatLoadState, setChatLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [chatError, setChatError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const creatingChatRef = useRef(false);
  const chatRetryAttemptRef = useRef(0);

  const loadChats = useCallback(async () => {
    setChatLoadState("loading");
    setChatError("");
    try {
      const result = await gatewayApi<{ chats: ApiChatListItem[] }>("chat/chat/all");
      const chatItems = Array.isArray(result.chats) ? result.chats : [];
      const chatPeople = chatItems
        .map(chatItemUser)
        .filter((item): item is ApiUser => Boolean(item?._id))
        .map(toPerson);
      const chats = chatItems.map(({ chat, user: wrapper }) => {
        const raw = (wrapper as { user?: ApiUser }).user ?? wrapper as ApiUser;
        const personId = raw?._id ?? chat.users.find((id) => id !== user?.id) ?? "";
        const updated = new Date(chat.updatedAt);
        return {
          id: chat._id,
          personId,
          preview: chat.latestMessage?.text || "Bắt đầu cuộc trò chuyện",
          time: Number.isNaN(updated.getTime()) ? "" : new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(updated),
          unread: chat.unseenCount,
          messages: [],
        } satisfies Conversation;
      });

      setPeople((current) => {
        const peopleById = new Map(current.map((person) => [person.id, person]));
        chatPeople.forEach((person) => peopleById.set(person.id, person));
        return Array.from(peopleById.values());
      });
      setConversationList(chats);
      setUnreadByConversation(Object.fromEntries(chats.map((item) => [item.id, item.unread ?? 0])));
      setSelectedId((current) => {
        const requested = chats.find((item) => item.personId === requestedPersonId)?.id;
        return requested || (chats.some((item) => item.id === current) ? current : chats[0]?.id ?? "");
      });
      setChatLoadState("ready");

      const requestedPersonExists = chatPeople.some((person) => person.id === requestedPersonId);
      if (requestedPersonId && !requestedPersonExists) {
        try {
          const profile = await gatewayApi<{ user: ApiUser }>(`user/${encodeURIComponent(requestedPersonId)}`);
          const requestedPerson = toPerson(profile.user, chatPeople.length);
          setPeople((current) => current.some((person) => person.id === requestedPerson.id)
            ? current
            : [...current, requestedPerson]);
        } catch (error) {
          setChatError(requestErrorMessage(error, "Không tải được thông tin người nhận."));
          setChatLoadState("error");
          return;
        }
      }
      chatRetryAttemptRef.current = 0;
    } catch (error) {
      // Không xóa danh sách đang hiển thị khi một lần đồng bộ tạm thời lỗi.
      setChatError(requestErrorMessage(error, "Dịch vụ trò chuyện chưa phản hồi. Vui lòng thử lại."));
      setChatLoadState("error");
    }
  }, [requestedPersonId, user?.id]);

  useEffect(() => { void Promise.resolve().then(loadChats); }, [loadChats]);

  useEffect(() => {
    if (chatLoadState !== "error" || chatRetryAttemptRef.current >= 3) return;
    const delayMs = Math.min(1_500 * (2 ** chatRetryAttemptRef.current), 6_000);
    const timeout = window.setTimeout(() => {
      chatRetryAttemptRef.current += 1;
      void loadChats();
    }, delayMs);
    return () => window.clearTimeout(timeout);
  }, [chatLoadState, loadChats]);

  useEffect(() => {
    if (!requestedPersonId || creatingChatRef.current || conversationList.some((item) => item.personId === requestedPersonId) || !people.some((person) => person.id === requestedPersonId)) return;
    creatingChatRef.current = true;
    void gatewayApi<{ chatId: string }>("chat/chat/new", { method: "POST", json: { otherUserId: requestedPersonId } })
      .then(() => loadChats())
      .catch((error: unknown) => {
        setChatError(requestErrorMessage(error, "Không thể tạo cuộc trò chuyện mới."));
        setChatLoadState("error");
      })
      .finally(() => { creatingChatRef.current = false; });
  }, [conversationList, loadChats, people, requestedPersonId]);

  useEffect(() => {
    if (!selectedId) return;
    void gatewayApi<{ messages: ApiMessage[] }>(`chat/message/${encodeURIComponent(selectedId)}`)
      .then((result) => {
        const messages = (Array.isArray(result.messages) ? result.messages : []).map((message) => ({
          id: message._id,
          body: message.text?.trim() || (message.messageType === "image" ? "[Hình ảnh]" : ""),
          time: new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.createdAt)),
          mine: message.sender === user?.id,
        }));
        setMessagesByConversation((current) => ({ ...current, [selectedId]: messages }));
        notifyNavigationMetricsChanged();
      })
      .catch(() => setMessagesByConversation((current) => ({ ...current, [selectedId]: [] })));
  }, [selectedId, user?.id]);

  const rows = useMemo(
    () => conversationList.map((conversation) => ({
      conversation,
      person: people.find((person) => person.id === conversation.personId) ?? unknownPerson(conversation.personId),
    })),
    [conversationList, people],
  );

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    if (!normalized) return rows;
    return rows.filter(({ person, conversation }) =>
      [person.name, person.role, conversation.preview]
        .join(" ")
        .toLocaleLowerCase("vi")
        .includes(normalized),
    );
  }, [query, rows]);

  const selectedConversation = conversationList.find((item) => item.id === selectedId) ?? conversationList[0] ?? { id: "", personId: "", preview: "", time: "", messages: [] };
  const selectedPerson = people.find((person) => person.id === selectedConversation.personId) ?? { id: "", name: "Chưa chọn cuộc trò chuyện", initials: "—", role: "", department: "", email: "", phone: "", tone: "slate" as const };
  const selectedMessages = messagesByConversation[selectedConversation.id] ?? selectedConversation.messages;

  function selectConversation(conversationId: string) {
    setSelectedId(conversationId);
    setDraft("");
    setUnreadByConversation((value) => ({ ...value, [conversationId]: 0 }));
    setMobileThreadOpen(true);
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !selectedConversation.id) return;
    try {
      const result = await gatewayApi<{ message: ApiMessage }>("chat/message", { method: "POST", json: { chatId: selectedConversation.id, text: body } });
      const message: ChatMessage = { id: result.message._id, body: result.message.text ?? body, time: new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(result.message.createdAt)), mine: true };
      setMessagesByConversation((value) => ({ ...value, [selectedConversation.id]: [...(value[selectedConversation.id] ?? []), message] }));
      setConversationList((current) => current.map((item) => item.id === selectedConversation.id ? { ...item, preview: body, time: message.time } : item));
      setDraft("");
    } catch (error) {
      setChatError(requestErrorMessage(error, "Không thể gửi tin nhắn. Vui lòng thử lại."));
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Kết nối nội bộ"
        title="Trò chuyện"
        description="Trao đổi nhanh, giữ công việc liền mạch cùng đồng nghiệp trong HDG."
        actions={<Badge tone={chatLoadState === "error" ? "rose" : "slate"}>{chatLoadState === "loading" ? "Đang đồng bộ..." : chatLoadState === "error" ? "Không đồng bộ được" : `${conversationList.length} cuộc trò chuyện`}</Badge>}
      />

      <section className={`${styles.chatShell} ${mobileThreadOpen ? styles.mobileThreadOpen : ""}`}>
        <aside className={styles.conversationPanel} aria-label="Danh sách cuộc trò chuyện">
          <div className={styles.panelHeading}>
            <div>
              <span>Tin nhắn</span>
              <strong>Gần đây</strong>
            </div>
            <button type="button" aria-label="Tùy chọn tin nhắn" title="Backend chưa có API tùy chọn hội thoại" disabled><MoreHorizontal size={19} /></button>
          </div>

          <label className={styles.chatSearch}>
            <Search size={16} />
            <span className="sr-only">Tìm cuộc trò chuyện</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm cuộc trò chuyện..." />
            {query ? <button type="button" onClick={() => setQuery("")} aria-label="Xóa tìm kiếm"><X size={15} /></button> : null}
          </label>

          <div className={styles.quickStatus}>
            <span><Avatar initials={getUserInitials(user?.name ?? "Người dùng")} size="sm" /></span>
            <div><strong>{user?.name ?? "Người dùng"}</strong><p>Tài khoản của bạn</p></div>
            <Badge tone="slate">Phiên hiện tại</Badge>
          </div>

          <div className={styles.conversationList}>
            {filteredRows.map(({ conversation, person }) => {
              const messageList = messagesByConversation[conversation.id] ?? conversation.messages;
              const lastMessage = messageList[messageList.length - 1];
              const unread = unreadByConversation[conversation.id] ?? 0;
              return (
                <button
                  type="button"
                  key={conversation.id}
                  onClick={() => selectConversation(conversation.id)}
                  className={`${styles.conversationItem} ${selectedId === conversation.id ? styles.conversationActive : ""}`}
                >
                  <Avatar initials={person.initials} tone={person.tone} size="md" online={person.online} />
                  <span className={styles.conversationCopy}>
                    <span><strong>{person.name}</strong><time>{lastMessage?.time ?? conversation.time}</time></span>
                    <span><p>{lastMessage?.mine ? "Bạn: " : ""}{lastMessage?.body ?? conversation.preview}</p>{unread ? <b>{unread}</b> : null}</span>
                  </span>
                </button>
              );
            })}
            {!filteredRows.length ? (
              <div className={styles.noConversation}>
                <Search size={22} />
                <p>{chatLoadState === "loading" ? "Đang tải cuộc trò chuyện..." : chatLoadState === "error" ? chatError || "Không tải được cuộc trò chuyện" : "Không tìm thấy cuộc trò chuyện"}</p>
                {chatLoadState === "error" ? (
                  <button type="button" onClick={() => {
                    chatRetryAttemptRef.current = 0;
                    void loadChats();
                  }}>Thử lại</button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className={styles.privateNote}><ShieldCheck size={14} /><span>Tin nhắn chỉ hiển thị với thành viên trong tổ chức.</span></div>
        </aside>

        <div className={styles.threadPanel}>
          <header className={styles.threadHeader}>
            <button type="button" className={styles.backButton} onClick={() => setMobileThreadOpen(false)} aria-label="Quay lại danh sách"><ArrowLeft size={19} /></button>
            <Avatar initials={selectedPerson.initials} tone={selectedPerson.tone} size="md" online={selectedPerson.online} />
            <div className={styles.threadIdentity}>
              <strong>{selectedPerson.name}</strong>
              <span>{selectedPerson.role}</span>
            </div>
            <div className={styles.threadActions}>
              <button type="button" aria-label={`Gọi cho ${selectedPerson.name}`} title="Backend chưa hỗ trợ cuộc gọi thoại" disabled><Phone size={17} /></button>
              <button type="button" aria-label={`Gọi video cho ${selectedPerson.name}`} title="Backend chưa hỗ trợ cuộc gọi video" disabled><Video size={18} /></button>
              <button type="button" aria-label="Thông tin cuộc trò chuyện" title="Backend chưa có API thông tin hội thoại" disabled><Info size={18} /></button>
            </div>
          </header>

          <div className={styles.messageArea} aria-live="polite">
            <div className={styles.dayDivider}><span>Hôm nay</span></div>
            <div className={styles.threadIntro}>
              <Avatar initials={selectedPerson.initials} tone={selectedPerson.tone} size="lg" online={selectedPerson.online} />
              <strong>{selectedPerson.name}</strong>
              <span>{selectedPerson.role} · {selectedPerson.department}</span>
            </div>

            <div className={styles.messages}>
              {selectedMessages.map((message) => (
                <div className={`${styles.messageRow} ${message.mine ? styles.myMessageRow : ""}`} key={message.id}>
                  {!message.mine ? <Avatar initials={selectedPerson.initials} tone={selectedPerson.tone} size="sm" /> : null}
                  <div className={styles.messageGroup}>
                    <p>{message.body}</p>
                    <span>{message.time}{message.mine ? <CheckCheck size={13} /> : null}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form className={styles.composer} onSubmit={(event) => void sendMessage(event)}>
            <input ref={fileInputRef} className={styles.hiddenFile} type="file" aria-label="Đính kèm tệp" />
            <button type="button" className={styles.composerIcon} disabled title="Web hiện chỉ gửi tin nhắn văn bản" aria-label="Đính kèm tệp"><Paperclip size={18} /></button>
            <label className={styles.messageInput}>
              <span className="sr-only">Soạn tin nhắn</span>
              <textarea rows={1} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Nhắn tin cho ${selectedPerson.name}...`} />
              <button type="button" onClick={() => setDraft((value) => `${value}${value ? " " : ""}🙂`)} aria-label="Thêm biểu tượng cảm xúc"><Smile size={18} /></button>
            </label>
            <button type="submit" className={styles.sendButton} disabled={!draft.trim()} aria-label="Gửi tin nhắn"><Send size={18} /></button>
          </form>
        </div>
      </section>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="route-loading"><span /><p>Đang mở cuộc trò chuyện...</p></div>}>
      <ConversationWorkspace />
    </Suspense>
  );
}
