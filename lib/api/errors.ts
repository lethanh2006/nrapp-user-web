type ErrorPayload = {
  code?: unknown;
  message?: unknown;
  details?: { fields?: unknown };
  errorId?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getMessage(payload: unknown, fallback: string) {
  if (!isRecord(payload)) return fallback;
  const message = payload.message;
  if (typeof message === "string" && message.trim()) return message.trim();
  if (Array.isArray(message)) {
    const messages = message.filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
    if (messages.length) return messages.join("\n");
  }
  return fallback;
}

export class GatewayApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fields: string[];
  readonly errorId?: string;

  constructor(status: number, payload: unknown) {
    super(getMessage(payload, `Gateway trả về lỗi ${status}.`));
    this.name = "GatewayApiError";
    this.status = status;

    const error = isRecord(payload) ? (payload as ErrorPayload) : undefined;
    this.code = typeof error?.code === "string" ? error.code : undefined;
    this.errorId = typeof error?.errorId === "string" ? error.errorId : undefined;
    this.fields = Array.isArray(error?.details?.fields)
      ? error.details.fields.filter((field): field is string => typeof field === "string")
      : [];
  }
}

export class GatewayUnavailableError extends Error {
  readonly status = 502;
  readonly code = "GATEWAY_UNAVAILABLE";

  constructor(message = "Không thể kết nối đến Gateway. Vui lòng thử lại sau.") {
    super(message);
    this.name = "GatewayUnavailableError";
  }
}
