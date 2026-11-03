import { BillingService } from "./billing.service";
import { PLAN_DEFS } from "./domain/plans";

describe("billing catalog", () => {
  it("serves the published plan prices", async () => {
    const service = new BillingService({
      plan: async (code: keyof typeof PLAN_DEFS) => PLAN_DEFS[code],
    } as never);
    const result = await service.plans();
    expect(result.plans.map((plan) => plan.priceHalalas)).toEqual([0, 9900, 24900]);
    expect(result.services.map((item) => item.priceHalalas)).toEqual([2900, 4900, 5900, 6900, 1900]);
    expect(result.plans).toHaveLength(3);
  });
});
