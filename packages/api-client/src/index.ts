import type {
  ChatMessage,
  ChatSummary,
  CourtType,
  MemoType,
  MemoView,
  PlanCode,
  PlanOffer,
  SessionUser,
} from "@elawyer/types";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export interface ClientOptions {
  baseUrl: string;
  getToken?: () => string | null;
  credentials?: "include" | "omit" | "same-origin";
}

async function parse(res: Response) {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const code = data?.error?.code || `HTTP_${res.status}`;
    const message = data?.error?.message || res.statusText;
    throw new ApiError(res.status, code, message, data?.error?.details);
  }
  return data;
}

export class ElawyerClient {
  constructor(private readonly opts: ClientOptions) {}

  private async request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const token = this.opts.getToken?.();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(`${this.opts.baseUrl}${path}`, {
      ...init,
      headers,
      credentials: this.opts.credentials ?? "include",
    });
    return parse(res);
  }

  signup(input: { name: string; phone: string; email: string; consent: boolean }) {
    return this.request("/auth/signup", { method: "POST", body: JSON.stringify(input) }) as Promise<{
      challengeId: string;
      debugCode?: string;
    }>;
  }

  login(input: { identifier: string }) {
    return this.request("/auth/login", { method: "POST", body: JSON.stringify(input) }) as Promise<{
      challengeId: string;
      debugCode?: string;
    }>;
  }

  verify(input: { challengeId: string; code: string }) {
    return this.request("/auth/verify", { method: "POST", body: JSON.stringify(input) }) as Promise<{
      accessToken: string;
      user: SessionUser;
    }>;
  }

  refresh() {
    return this.request("/auth/refresh", { method: "POST" }) as Promise<{ accessToken: string; user: SessionUser }>;
  }

  logout() {
    return this.request("/auth/logout", { method: "POST" });
  }

  me() {
    return this.request("/me") as Promise<{ user: SessionUser }>;
  }

  updateMe(input: Record<string, unknown>) {
    return this.request("/me", { method: "PATCH", body: JSON.stringify(input) }) as Promise<{ user: SessionUser }>;
  }

  exportMe() {
    return this.request("/me/export") as Promise<unknown>;
  }

  deleteMe() {
    return this.request("/me", { method: "DELETE", body: JSON.stringify({ confirm: true }) });
  }

  plans() {
    return this.request("/plans") as Promise<{ plans: PlanOffer[]; payPerMemoHalalas: number }>;
  }

  chats() {
    return this.request("/chats") as Promise<{ chats: ChatSummary[] }>;
  }

  createChat(input: { court: CourtType; memoType: MemoType; title?: string }) {
    return this.request("/chats", { method: "POST", body: JSON.stringify(input) }) as Promise<{ chat: ChatSummary }>;
  }

  chat(id: string) {
    return this.request(`/chats/${id}`) as Promise<{
      chat: ChatSummary;
      messages: ChatMessage[];
      caseFile: { id: string; title: string; court: CourtType; plaintiff?: string; defendant?: string; documents: { id: string; filename: string; byteSize: number }[] } | null;
    }>;
  }

  sendMessage(id: string, text: string) {
    return this.request(`/chats/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }) as Promise<{ user: ChatMessage; counsel: ChatMessage; readyToDraft: boolean }>;
  }

  draft(id: string, payPerMemo = false) {
    return this.request(`/chats/${id}/draft`, {
      method: "POST",
      body: JSON.stringify({ payPerMemo }),
    }) as Promise<{ memo: MemoView }>;
  }

  memos() {
    return this.request("/memos") as Promise<{ memos: MemoView[] }>;
  }

  memo(id: string) {
    return this.request(`/memos/${id}`) as Promise<{ memo: MemoView }>;
  }

  updateMemo(id: string, input: { title?: string; body?: string }) {
    return this.request(`/memos/${id}`, { method: "PATCH", body: JSON.stringify(input) }) as Promise<{ memo: MemoView }>;
  }

  wallet() {
    return this.request("/wallet") as Promise<{
      balanceHalalas: number;
      transactions: { id: string; type: string; amountHalalas: number; description: string; createdAt: string }[];
      invoices: { id: string; number: string; totalHalalas: number; vatHalalas: number; issuedAt: string; lineDescription: string }[];
    }>;
  }

  checkout(input: { purpose: "topup" | "subscription"; amountHalalas?: number; planCode?: PlanCode; cycle?: "monthly" | "yearly" }) {
    return this.request("/billing/checkout", { method: "POST", body: JSON.stringify(input) }) as Promise<{
      intentId: string;
      redirectUrl: string;
    }>;
  }

  confirmPayment(input: { intentId: string; sig: string }) {
    return this.request("/payments/confirm", { method: "POST", body: JSON.stringify(input) }) as Promise<{ status: string }>;
  }

  saved() {
    return this.request("/saved") as Promise<{ items: { id: string; kind: string; title: string; refId: string }[] }>;
  }

  saveItem(input: { kind: "memo" | "article" | "sharia"; memoId?: string; articleId?: string; shariaId?: string }) {
    return this.request("/saved", { method: "POST", body: JSON.stringify(input) });
  }

  unsave(id: string) {
    return this.request(`/saved/${id}`, { method: "DELETE" });
  }

  integrations() {
    return this.request("/integrations") as Promise<{
      items: { provider: string; configured: boolean; connected: boolean; status: string }[];
    }>;
  }

  startIntegration(provider: string) {
    return this.request(`/integrations/${provider}/start`, { method: "POST" }) as Promise<{ url: string | null; configured: boolean }>;
  }

  exportDrive(memoId: string) {
    return this.request("/integrations/google_drive/export", {
      method: "POST",
      body: JSON.stringify({ memoId }),
    }) as Promise<{ status: string; externalId: string }>;
  }

  notifications() {
    return this.request("/me/notifications") as Promise<{
      items: { id: string; hearingId: string | null; title: string; readAt: string | null; createdAt: string }[];
    }>;
  }

  cases() {
    return this.request("/cases") as Promise<{
      cases: { id: string; title: string; court: CourtType; status: string; updatedAt: string }[];
    }>;
  }

  caseFile(id: string) {
    return this.request(`/cases/${id}`) as Promise<{
      caseFile: {
        id: string;
        title: string;
        court: CourtType;
        notes: string;
        documents: { id: string; filename: string; byteSize: number }[];
        memos: { id: string; title: string; memoType: MemoType; updatedAt: string }[];
        hearings: { id: string; kind: string; occursAt: string; title: string }[];
      };
    }>;
  }

  addHearing(caseId: string, input: { kind: "hearing" | "objection_deadline"; occursAt: string; title: string }) {
    return this.request(`/cases/${caseId}/hearings`, { method: "POST", body: JSON.stringify(input) });
  }

  uploadDocument(caseId: string, file: Blob, filename: string) {
    const body = new FormData();
    body.append("file", file, filename);
    return this.request(`/cases/${caseId}/documents`, { method: "POST", body });
  }

  search(q: string) {
    return this.request(`/search?q=${encodeURIComponent(q)}`) as Promise<{
      chats: ChatSummary[];
      memos: { id: string; title: string }[];
    }>;
  }

  org() {
    return this.request("/org") as Promise<{
      org: { id: string; name: string; seatLimit: number; seatsUsed: number; letterheadName: string } | null;
    }>;
  }

  updateOrg(input: { name?: string; letterheadName?: string }) {
    return this.request("/org", { method: "PATCH", body: JSON.stringify(input) });
  }

  addMember(input: { name: string; phone: string; email: string }) {
    return this.request("/org/members", { method: "POST", body: JSON.stringify(input) });
  }
}
