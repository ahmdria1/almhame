import { MemoService } from "./memo.service";

describe("memo list", () => {
  it("returns a page and hides the body", async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: "m1",
        titleEnc: "enc",
        court: "labor",
        memoType: "lawsuit",
        status: "draft",
        flagged: false,
        caseId: null,
        chatId: null,
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      },
    ]);
    const service = new MemoService({
      prisma: { memo: { count: jest.fn().mockResolvedValue(21), findMany } },
      dec: () => "عنوان",
    } as never);
    const page = await service.list("user", Buffer.alloc(32), "2", "10");
    expect(page.totalPages).toBe(3);
    expect(page.memos[0].body).toBe("");
    expect(page.memos[0].title).toBe("عنوان");
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
  });
});
