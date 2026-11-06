import type {
  ChatMessage,
  ChatSummary,
  CourtType,
  MemoType,
  MemoView,
  PlanCode,
  PlanOffer,
  ServiceCode,
  SessionUser,
} from "@elawyer/types";

type UploadXhr = {
  open(method: string, url: string): void;
  withCredentials: boolean;
  setRequestHeader(name: string, value: string): void;
  upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null };
  onload: (() => void) | null;
  onerror: (() => void) | null;
  responseText: string;
  status: number;
  statusText: string;
  send(body: FormData): void;
};

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
  private csrf = "";

  constructor(private readonly opts: ClientOptions) {}

  private async ensureCsrf() {
    if (this.csrf) return;
    const res = await fetch(`${this.opts.baseUrl}/auth/csrf`, { credentials: this.opts.credentials ?? "include" });
    const data = (await res.json().catch(() => null)) as { csrfToken?: string } | null;
    if (data?.csrfToken) this.csrf = data.csrfToken;
  }

  private async request(path: string, init: RequestInit = {}) {
    const method = (init.method || "GET").toUpperCase();
    if (method !== "GET" && method !== "HEAD") await this.ensureCsrf();
    const headers = new Headers(init.headers);
    if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const token = this.opts.getToken?.();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (this.csrf && method !== "GET" && method !== "HEAD") headers.set("X-CSRF-Token", this.csrf);
    const res = await fetch(`${this.opts.baseUrl}${path}`, {
      ...init,
      headers,
      credentials: this.opts.credentials ?? "include",
    });
    const data = (await parse(res)) as { csrfToken?: string } | null;
    if (data?.csrfToken) this.csrf = data.csrfToken;
    return data;
  }

  signup(input: { name: string; phone: string; email: string; password: string; consent: boolean }) {
    return this.request("/auth/signup", { method: "POST", body: JSON.stringify(input) }) as Promise<{
      challengeId: string;
      debugCode?: string;
    }>;
  }

  login(input: { email: string; password: string }) {
    return this.request("/auth/login", { method: "POST", body: JSON.stringify(input) }) as Promise<{
      accessToken: string;
      user: SessionUser;
    }>;
  }

  resend(input: { email: string }) {
    return this.request("/auth/resend", { method: "POST", body: JSON.stringify(input) }) as Promise<{
      challengeId: string;
      debugCode?: string;
    }>;
  }

  forgot(input: { email: string }) {
    return this.request("/auth/forgot", { method: "POST", body: JSON.stringify(input) }) as Promise<{
      ok: boolean;
      challengeId?: string;
      debugCode?: string;
    }>;
  }

  resetPassword(input: { challengeId: string; code: string; password: string }) {
    return this.request("/auth/reset", { method: "POST", body: JSON.stringify(input) }) as Promise<{ ok: boolean }>;
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
    return this.request("/plans") as Promise<{
      plans: PlanOffer[];
      services: { code: ServiceCode; priceHalalas: number; questions: number | null }[];
    }>;
  }

  chats(page = 1) {
    return this.request(`/chats?page=${page}`) as Promise<{ chats: ChatSummary[]; total: number; page: number; totalPages: number }>;
  }

  createChat(input: { court: CourtType; memoType: MemoType; title?: string }) {
    return this.request("/chats", { method: "POST", body: JSON.stringify(input) }) as Promise<{ chat: ChatSummary }>;
  }

  updateChat(id: string, input: { court?: CourtType; memoType?: MemoType }) {
    return this.request(`/chats/${id}`, { method: "PATCH", body: JSON.stringify(input) }) as Promise<{ chat: ChatSummary }>;
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

  memos(page = 1) {
    return this.request(`/memos?page=${page}`) as Promise<{ memos: MemoView[]; total: number; page: number; totalPages: number }>;
  }

  documents() {
    return this.request("/documents") as Promise<{ documents: { id: string; filename: string; byteSize: number; mime: string; caseId: string; createdAt: string }[] }>;
  }

  caseHealth(id: string) {
    return this.request(`/cases/${id}/health`) as Promise<{ score: number; hearings: number }>;
  }

  referral() {
    return this.request("/referrals") as Promise<{ code: string }>;
  }

  claimReferral(code: string) {
    return this.request("/referrals", { method: "POST", body: JSON.stringify({ code }) }) as Promise<{ ok: boolean }>;
  }

  reportProblem(message: string) {
    return this.request("/reports", { method: "POST", body: JSON.stringify({ message }) }) as Promise<{ ok: boolean }>;
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

  checkout(input: {
    purpose: "topup" | "subscription" | "service";
    amountHalalas?: number;
    planCode?: PlanCode;
    serviceCode?: ServiceCode;
    cycle?: "monthly" | "yearly";
  }) {
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

  markNotification(id: string) {
    return this.request(`/me/notifications/${id}/read`, { method: "POST" }) as Promise<{ ok: boolean }>;
  }

  cases(page = 1) {
    return this.request(`/cases?page=${page}`) as Promise<{
      cases: { id: string; title: string; court: CourtType; status: string; updatedAt: string }[];
      total: number;
      page: number;
      totalPages: number;
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

  uploadDocument(
    caseId: string,
    file: Blob | { uri: string; name: string; type: string },
    filename: string,
    onProgress?: (ratio: number) => void,
  ) {
    const body = new FormData();
    if (typeof Blob !== "undefined" && file instanceof Blob) body.append("file", file, filename);
    else body.append("file", file as Blob);
    const xhrCtor = (globalThis as { XMLHttpRequest?: new () => UploadXhr }).XMLHttpRequest;
    if (!onProgress || !xhrCtor) {
      return this.request(`/cases/${caseId}/documents`, { method: "POST", body });
    }
    return this.uploadWithProgress(xhrCtor, `/cases/${caseId}/documents`, body, onProgress);
  }

  private uploadWithProgress(xhrCtor: new () => UploadXhr, path: string, body: FormData, onProgress: (ratio: number) => void) {
    return this.ensureCsrf().then(
      () =>
        new Promise((resolve, reject) => {
          const xhr = new xhrCtor();
          xhr.open("POST", `${this.opts.baseUrl}${path}`);
          xhr.withCredentials = (this.opts.credentials ?? "include") !== "omit";
          const token = this.opts.getToken?.();
          if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          if (this.csrf) xhr.setRequestHeader("X-CSRF-Token", this.csrf);
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total);
          };
          xhr.onload = () => {
            const text = xhr.responseText;
            const data = text ? (JSON.parse(text) as { csrfToken?: string; error?: { code?: string; message?: string } }) : null;
            if (data?.csrfToken) this.csrf = data.csrfToken;
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(data);
              return;
            }
            reject(new ApiError(xhr.status, data?.error?.code || `HTTP_${xhr.status}`, data?.error?.message || xhr.statusText));
          };
          xhr.onerror = () => reject(new ApiError(0, "NETWORK", "network"));
          xhr.send(body);
        }),
    );
  }

  search(q: string, signal?: AbortSignal) {
    return this.request(`/search?q=${encodeURIComponent(q)}`, { signal }) as Promise<{
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
