import { LOCALES, type Locale } from "@elawyer/types";

export const PUBLIC_LINE_KEYS = ["errors.busy", "common.back", "security.title"] as const;
export type PublicLineKey = (typeof PUBLIC_LINE_KEYS)[number];

const LINES: Record<Locale, Record<PublicLineKey, string>> = {
  ar: { "errors.busy": "الخدمة مشغولة الآن. أعد المحاولة بعد قليل.", "common.back": "رجوع", "security.title": "الأمان" },
  en: { "errors.busy": "The service is busy. Try again shortly.", "common.back": "Back", "security.title": "Security" },
  ur: { "errors.busy": "خدمت مصروف ہے۔ تھوڑی دیر بعد کوشش کریں۔", "common.back": "واپس", "security.title": "حفاظت" },
  hi: { "errors.busy": "सेवा व्यस्त है। थोड़ी देर बाद फिर कोशिश करें।", "common.back": "वापस", "security.title": "सुरक्षा" },
  pa: { "errors.busy": "خدمت مصروف اے۔ تھوڑی دیر بعد کوشش کرو۔", "common.back": "پِچھے", "security.title": "حفاظت" },
  si: { "errors.busy": "සේවාව කාර්යබහුලයි. ටිකකින් නැවත උත්සාහ කරන්න.", "common.back": "ආපසු", "security.title": "ආරක්ෂාව" },
  bn: { "errors.busy": "সেবাটি ব্যস্ত। একটু পরে আবার চেষ্টা করুন।", "common.back": "পিছনে", "security.title": "নিরাপত্তা" },
  ne: { "errors.busy": "सेवा व्यस्त छ। अलिकति पछि फेरि प्रयास गर्नुहोस्।", "common.back": "पछाडि", "security.title": "सुरक्षा" },
  fil: { "errors.busy": "Abala ang serbisyo. Subukan muli mamaya.", "common.back": "Bumalik", "security.title": "Seguridad" },
  tr: { "errors.busy": "Hizmet meşgul. Biraz sonra yeniden deneyin.", "common.back": "Geri", "security.title": "Güvenlik" },
  am: { "errors.busy": "አገልግሎቱ ሥራ በዝቶበታል። ትንሽ ቆይተው ይሞክሩ።", "common.back": "ተመለስ", "security.title": "ደህንነት" },
};

export function publicLine(locale: string, key: PublicLineKey): string {
  const pack = (LOCALES as readonly string[]).includes(locale) ? LINES[locale as Locale] : LINES.ar;
  return pack[key];
}
