import { parseTranslation, placeholdersKept, translationPrompt } from "./translate";

describe("translation prompt", () => {
  it("keeps placeholders and rejects a translation that drops them", () => {
    const source = "تنتهي الباقة خلال {days} يوماً، والسعر {price} ريال.";
    const prompt = translationPrompt("bn", source);
    expect(prompt).toContain("{days}");
    expect(prompt).toContain("{price}");
    expect(prompt).toContain("bn");
    expect(placeholdersKept(source, "মেয়াদ {days} দিন, দাম {price}.")).toBe(true);
    expect(placeholdersKept(source, "মেয়াদ শেষ, দাম {price}.")).toBe(false);
    expect(parseTranslation('{"text":"মেয়াদ {days}"}')).toBe("মেয়াদ {days}");
    expect(parseTranslation("not json")).toBeNull();
  });
});
