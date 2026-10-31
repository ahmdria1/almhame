export interface LawyerCheckInput {
  name: string;
  phone: string;
  email: string;
  nationalId?: string;
}

export interface LawyerCheckResult {
  practicingLawyer: boolean;
  source: "mock" | "najiz";
}

export interface LawyerLicenseChecker {
  readonly mode: "mock" | "najiz";
  check(input: LawyerCheckInput): Promise<LawyerCheckResult>;
}

export function normalizeNationalId(value: string | undefined): string {
  return (value || "").replace(/\D/g, "");
}

export function nationalIdShape(value: string): boolean {
  return /^[12]\d{9}$/.test(value);
}

export class MockLawyerChecker implements LawyerLicenseChecker {
  readonly mode = "mock" as const;

  constructor(private readonly blocked: ReadonlySet<string>) {}

  async check(input: LawyerCheckInput): Promise<LawyerCheckResult> {
    const id = normalizeNationalId(input.nationalId);
    return { practicingLawyer: id.length > 0 && this.blocked.has(id), source: "mock" };
  }
}

export class NajizLawyerChecker implements LawyerLicenseChecker {
  readonly mode = "najiz" as const;

  constructor(
    private readonly opts: {
      baseUrl: string;
      clientId: string;
      clientSecret: string;
      tokenPath: string;
      licensePath: string;
      fetchImpl?: typeof fetch;
    },
  ) {}

  async check(input: LawyerCheckInput): Promise<LawyerCheckResult> {
    const id = normalizeNationalId(input.nationalId);
    if (!nationalIdShape(id)) return { practicingLawyer: false, source: "najiz" };
    const caller = this.opts.fetchImpl || fetch;
    const tokenUrl = `${this.opts.baseUrl.replace(/\/$/, "")}${this.opts.tokenPath}`;
    const tokenResponse = await caller(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.opts.clientId,
        client_secret: this.opts.clientSecret,
      }),
    });
    if (!tokenResponse.ok) throw new Error("najiz token");
    const tokenBody = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenBody.access_token) throw new Error("najiz token");
    const licenseUrl = new URL(`${this.opts.baseUrl.replace(/\/$/, "")}${this.opts.licensePath}`);
    licenseUrl.searchParams.set("socialId", id);
    const licenseResponse = await caller(licenseUrl.toString(), {
      headers: { Authorization: `Bearer ${tokenBody.access_token}` },
    });
    if (!licenseResponse.ok) throw new Error("najiz license");
    const license = (await licenseResponse.json()) as {
      isLicensed?: boolean;
      practicing?: boolean;
      licenseStatus?: string;
      status?: string;
    };
    const status = `${license.licenseStatus || ""} ${license.status || ""}`.toLowerCase();
    const practicing = license.isLicensed === true || license.practicing === true || /active|valid|ساري|سارى/.test(status);
    return { practicingLawyer: practicing, source: "najiz" };
  }
}

export function lawyerCheckerFrom(input: {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  tokenPath: string;
  licensePath: string;
  mockBlockIds: string[];
  nodeEnv?: string;
  fetchImpl?: typeof fetch;
}): LawyerLicenseChecker {
  if (input.baseUrl && input.clientId && input.clientSecret) {
    return new NajizLawyerChecker({
      baseUrl: input.baseUrl,
      clientId: input.clientId,
      clientSecret: input.clientSecret,
      tokenPath: input.tokenPath || "/oauth/v1/token",
      licensePath: input.licensePath || "/lawyers/v1/licenses",
      fetchImpl: input.fetchImpl,
    });
  }
  if (input.nodeEnv === "production") {
    throw new Error("Refusing to boot with mock or missing providers: NAJIZ_CLIENT_ID");
  }
  return new MockLawyerChecker(new Set(input.mockBlockIds));
}
