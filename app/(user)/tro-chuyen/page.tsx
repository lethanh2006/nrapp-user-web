"use client";

import {
  ArrowLeft,
  CheckCheck,
  Circle,
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
import { FormEvent, Suspense, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { conversations, currentUser, people } from "@/lib/mock-data";
import type { ChatMessage, Conversation } from "@/lib/types";
import styles from "./page.module.css";

const initialMessages: Record<string, ChatMessage[]> = Object.fromEntries(
  conversations.map((conversation) => [conversation.id, conversation.messages]),
);

function ConversationWorkspace() {
  const searchParams = useSearchParams();
  const requestedPersonId = searchParams.get("person");
  const requestedPerson = people.find((person) => person.id === requestedPersonId);
  const existingRequestedConversation = conversations.find((item) => item.personId === requestedPersonId);
  const [conversationList] = useState<Conversation[]>(() => {
    if (existingRequestedConversation || !requestedPerson) return conversations;
    return [{
      id: `new-${requestedPerson.id}`,
      personId: requestedPerson.id,
      preview: "Bắt đầu cuộc trò chuyện",
      time: "Mới",
      messages: [],
    }, ...conversations];
  });
  const initialSelectedId = existingRequestedConversation?.id
    ?? (requestedPerson ? `new-${requestedPerson.id}` : conversations[0].id);
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [messagesByConversation, setMessagesByConversation] = useState(initialMessages);
  const [unreadByConversation, setUnreadByConversation] = useState<Record<string, number>>(
    Object.fromEntries(conversations.map((item) => [item.id, item.unread ?? 0])),
  );
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [mobileThreadOpen, setMobileThreadOpen] = useState(Boolean(requestedPerson));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(
    () => conversationList.map((conversation) => ({
      conversation,
      person: people.find((person) => person.id === conversation.personId) ?? people[0],
    })),
    [conversationList],
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

  const selectedConversation = conversationList.find((item) => item.id === selectedId) ?? conversationList[0];
  const selectedPerson = people.find((person) => person.id === selectedConversation.personId) ?? people[0];
  const selectedMessages = messagesByConversation[selectedConversation.id] ?? selectedConversation.messages;

  function selectConversation(conversationId: string) {
    setSelectedId(conversationId);
    setDraft("");
    setUnreadByConversation((value) => ({ ...value, [conversationId]: 0 }));
    setMobileThreadOpen(true);
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;

    const sentAt = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date());
    const message: ChatMessage = {
      id: `local-${selectedConversation.id}-${Date.now()}`,
      body,
      time: sentAt,
      mine: true,
    };
    setMessagesByConversation((value) => ({
      ...value,
      [selectedConversation.id]: [...(value[selectedConversation.id] ?? []), message],
    }));
    setDraft("");
  }

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Kết nối nội bộ"
        title="Trò chuyện"
        description="Trao đổi nhanh, giữ công việc liền mạch cùng đồng nghiệp trong HDG."
        actions={<Badge tone="emerald" dot>Hệ thống đang hoạt động</Badge>}
      />

      <section className={`${styles.chatShell} ${mobileThreadOpen ? styles.mobileThreadOpen : ""}`}>
        <aside className={styles.conversationPanel} aria-label="Danh sách cuộc trò chuyện">
          <div className={styles.panelHeading}>
            <div>
              <span>Tin nhắn</span>
              <strong>Gần đây</strong>
            </div>
            <button type="button" aria-label="Tùy chọn tin nhắn"><MoreHorizontal size={19} /></button>
          </div>

          <label className={styles.chatSearch}>
            <Search size={16} />
            <span className="sr-only">Tìm cuộc trò chuyện</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm cuộc trò chuyện..." />
            {query ? <button type="button" onClick={() => setQuery("")} aria-label="Xóa tìm kiếm"><X size={15} /></button> : null}
          </label>

          <div className={styles.quickStatus}>
            <span><Avatar initials={currentUser.initials} size="sm" online /></span>
            <div><strong>{currentUser.name}</strong><p>Bạn đang hoạt động</p></div>
            <Badge tone="emerald">Online</Badge>
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
              <div className={styles.noConversation}><Search size={22} /><p>Không tìm thấy cuộc trò chuyện</p></div>
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
              <span>{selectedPerson.online ? <><Circle size={7} fill="currentColor" />Đang hoạt động</> : selectedPerson.role}</span>
            </div>
            <div className={styles.threadActions}>
              <button type="button" aria-label={`Gọi cho ${selectedPerson.name}`} title="Gọi thoại"><Phone size={17} /></button>
              <button type="button" aria-label={`Gọi video cho ${selectedPerson.name}`} title="Gọi video"><Video size={18} /></button>
              <button type="button" aria-label="Thông tin cuộc trò chuyện" title="Thông tin"><Info size={18} /></button>
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

          <form className={styles.composer} onSubmit={sendMessage}>
            <input ref={fileInputRef} className={styles.hiddenFile} type="file" aria-label="Đính kèm tệp" />
            <button type="button" className={styles.composerIcon} onClick={() => fileInputRef.current?.click()} aria-label="Đính kèm tệp"><Paperclip size={18} /></button>
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
