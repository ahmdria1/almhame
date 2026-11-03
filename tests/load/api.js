import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import exec from "k6/execution";

// Thresholds are the SLOs in tests/load/slo.json.
// SMOKE=1 keeps one iteration of each path for CI.
// The production compose run points the API at tests/load/provider-stub.mjs.
// That stub is only for the load run. It returns no statute text and no judgment text.
// CI smoke uses the API test configuration, which does not call a remote model.

const smoke = __ENV.SMOKE === "1";
const api = __ENV.API_URL || "http://127.0.0.1:4710";
const web = __ENV.WEB_URL || "http://127.0.0.1:4720";
const users = new SharedArray("users", () => JSON.parse(open(__ENV.LOAD_USERS_FILE || "/tmp/elawyer-load-users.json")));
const pricingPath = encodeURI("/الأسعار");

export const options = {
  scenarios: {
    health: { executor: "shared-iterations", vus: 1, iterations: smoke ? 2 : 20, maxDuration: smoke ? "30s" : "60s", exec: "health" },
    pricing: { executor: "shared-iterations", vus: 1, iterations: smoke ? 2 : 20, maxDuration: smoke ? "30s" : "60s", exec: "pricing" },
    session: { executor: "shared-iterations", vus: 1, iterations: smoke ? 1 : 4, maxDuration: smoke ? "60s" : "180s", exec: "session" },
  },
  thresholds: {
    "http_req_failed{name:health}": ["rate<0.01"],
    "http_req_duration{name:health}": ["p(95)<800"],
    "http_req_failed{name:signup}": ["rate<0.01"],
    "http_req_duration{name:signup}": ["p(95)<3000"],
    "http_req_failed{name:login}": ["rate<0.01"],
    "http_req_duration{name:login}": ["p(95)<2000"],
    "http_req_failed{name:chat}": ["rate<0.01"],
    "http_req_duration{name:chat}": ["p(95)<2000"],
    "http_req_failed{name:draft}": ["rate<0.01"],
    "http_req_duration{name:draft}": ["p(95)<8000"],
    "http_req_failed{name:search}": ["rate<0.01"],
    "http_req_duration{name:search}": ["p(95)<2000"],
    "http_req_failed{name:pricing}": ["rate<0.01"],
    "http_req_duration{name:pricing}": ["p(95)<2000"],
  },
};

export function health() {
  const response = http.get(`${api}/api/health`, { tags: { name: "health" } });
  check(response, { "health ok": (row) => row.status === 200 });
  sleep(0.2);
}

export function pricing() {
  const page = http.get(`${web}${pricingPath}`, { tags: { name: "pricing" } });
  check(page, { "pricing page": (row) => row.status === 200 });
  const plans = http.get(`${api}/api/plans`, { tags: { name: "pricing" } });
  check(plans, { "plans ok": (row) => row.status === 200 });
  sleep(0.2);
}

export function session() {
  const user = users[exec.scenario.iterationInTest % users.length];
  const jar = http.cookieJar();
  jar.clear(api);
  const stamp = `${Date.now()}${exec.vu.idInTest}${exec.scenario.iterationInTest}`;
  const phone = `05${String((Number(String(Date.now()).slice(-6)) + exec.scenario.iterationInTest) % 100000000).padStart(8, "0")}`;
  const signup = http.post(
    `${api}/api/auth/signup`,
    JSON.stringify({
      name: "قياس الحمل",
      phone,
      email: `smoke${stamp}@example.sa`,
      password: "load-pass-123",
      consent: true,
    }),
    { headers: { "Content-Type": "application/json", "X-Forwarded-For": `192.0.2.${(exec.scenario.iterationInTest % 200) + 1}` }, tags: { name: "signup" } },
  );
  check(signup, { "signup accepted": (row) => row.status === 201 });
  jar.clear(api);
  const login = http.post(
    `${api}/api/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers: { "Content-Type": "application/json" }, tags: { name: "login" } },
  );
  const loggedIn = check(login, { "login ok": (row) => row.status === 200 || row.status === 201 });
  if (!loggedIn) return;
  const token = login.json("accessToken");
  const auth = { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } };
  const chat = http.post(`${api}/api/chats`, JSON.stringify({ court: "labor", memoType: "lawsuit" }), { ...auth, tags: { name: "chat" } });
  check(chat, { "chat started": (row) => row.status === 201 });
  const chatId = chat.json("chat.id");
  if (chatId) {
    http.post(
      `${api}/api/chats/${chatId}/messages`,
      JSON.stringify({
        text: "المدعي: قياس الحمل\nالمدعى عليه: شركة القياس\nالطلبات: أجر شهر أغسطس\nيطالب بأجر شهر أغسطس الذي لم يصرف بعد انتهاء الخدمة لدى الشركة.",
      }),
      { ...auth, tags: { name: "chat" } },
    );
    const draft = http.post(`${api}/api/chats/${chatId}/draft`, "{}", { ...auth, tags: { name: "draft" } });
    check(draft, { "draft accepted": (row) => row.status === 201 });
  }
  const search = http.get(`${api}/api/search?q=${encodeURIComponent("عمل")}`, { headers: auth.headers, tags: { name: "search" } });
  check(search, { "library search": (row) => row.status === 200 });
  const plansPage = http.get(`${web}/app/plans`, { headers: { Cookie: `elw_access=${token}` }, tags: { name: "pricing" }, redirects: 0 });
  check(plansPage, { "plans route": (row) => row.status === 200 || row.status === 307 || row.status === 302 });
  sleep(0.2);
}
