export interface NafathStart {
  transId: string;
  random: string;
}

export async function requestNafath(
  input: {
    baseUrl: string;
    appId: string;
    appKey: string;
    service: string;
    fetchImpl?: typeof fetch;
  },
  nationalId: string,
): Promise<NafathStart> {
  const caller = input.fetchImpl || fetch;
  const response = await caller(`${input.baseUrl.replace(/\/$/, "")}/api/v1/mfa/request`, {
    method: "POST",
    headers: {
      "APP-ID": input.appId,
      "APP-KEY": input.appKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ nationalId, service: input.service }),
  });
  if (!response.ok) throw new Error("nafath request");
  const body = (await response.json()) as { transId?: string; random?: string };
  if (!body.transId || !body.random) throw new Error("nafath request");
  return { transId: body.transId, random: body.random };
}

export async function nafathStatus(
  input: { baseUrl: string; appId: string; appKey: string; fetchImpl?: typeof fetch },
  query: { nationalId: string; transId: string; random: string },
): Promise<string> {
  const caller = input.fetchImpl || fetch;
  const response = await caller(`${input.baseUrl.replace(/\/$/, "")}/api/v1/mfa/request/status`, {
    method: "POST",
    headers: {
      "APP-ID": input.appId,
      "APP-KEY": input.appKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(query),
  });
  if (!response.ok) throw new Error("nafath status");
  const body = (await response.json()) as { status?: string };
  return body.status || "WAITING";
}
