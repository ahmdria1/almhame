import { composerBox, composerKeyAction } from "@elawyer/types";

describe("chat composer", () => {
  it("sends on Enter and keeps Shift+Enter as a newline", () => {
    expect(composerKeyAction("Enter", false, false)).toBe("send");
    expect(composerKeyAction("Enter", true, false)).toBe("newline");
    expect(composerKeyAction("Enter", false, true)).toBe("none");
    expect(composerKeyAction("a", false, false)).toBe("none");
  });

  it("starts at the requested lines and scrolls after six", () => {
    const web = composerBox(0, 3, 6, 24, 16);
    expect(web.height).toBe(3 * 24 + 16);
    expect(web.scroll).toBe(false);
    const grown = composerBox(200, 3, 6, 24, 16);
    expect(grown.height).toBe(6 * 24 + 16);
    expect(grown.scroll).toBe(true);
    const mobile = composerBox(40, 2, 6, 22, 16);
    expect(mobile.height).toBe(2 * 22 + 16);
    expect(mobile.scroll).toBe(false);
  });
});
