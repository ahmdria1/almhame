import { formatSar, textDirection } from "../src/format";

describe("mobile formatting", () => {
  it("formats halalas and direction", () => {
    expect(formatSar(9900)).toBe("99.00");
    expect(formatSar(2900)).toBe("29.00");
    expect(textDirection("ar")).toBe("rtl");
    expect(textDirection("pa")).toBe("rtl");
    expect(textDirection("en")).toBe("ltr");
    expect(textDirection("fil")).toBe("ltr");
  });
});
