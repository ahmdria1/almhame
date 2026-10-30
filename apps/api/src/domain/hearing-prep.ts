import type { Locale, MemoType } from "@elawyer/types";
import { clientCopy } from "./client-copy";
import { MEMO_DISCLAIMER } from "./facts";

const COURT_QUESTIONS: Record<MemoType, [string, string, string]> = {
  lawsuit: [
    "ما موضوع طلبك، وما الذي تطلب الحكم به؟",
    "ما دليلك على الواقعة أو المبلغ؟",
    "هل سلكت الصلح قبل رفع الدعوى؟",
  ],
  defense: [
    "ما جوابك على ما نُسب إليك؟",
    "هل تسلمت المبلغ أو نفذت الالتزام؟",
    "ما المستند الذي تعتمد عليه؟",
  ],
  reply: [
    "ما الذي استجد بعد مذكرة الخصم؟",
    "أي نقطة في مذكرته تنكرها؟",
    "ما دليلك على ما أضفته؟",
  ],
  appeal: [
    "ما الحكم الذي تعترض عليه، ومتى تبلّغت به؟",
    "ما وجه الخطأ في الحكم؟",
    "ما طلبك أمام محكمة الاستئناف؟",
  ],
};

const COURT_ANSWERS: [string, string, string] = [
  "أقول للدائرة: أطلب الحكم وفق الوقائع، والمبلغ والتاريخ كما وردا.",
  "دليلي هو المستند الذي أبرزه، ولا أزيد على ما هو مكتوب.",
  "أذكر بصراحة إن كنت طلبت الصلح، ومتى كان ذلك.",
];

export interface HearingPrepItem {
  questionAr: string;
  questionClient: string;
  answerAr: string;
  answerClient: string;
}

export interface HearingPrepBody {
  items: HearingPrepItem[];
  interpreterTipAr: string;
  interpreterTipClient: string;
  disclaimer: string;
}

const TIP_AR = "لغة المرافعة أمام الدائرة هي العربية. إذا لم تكن العربية لغة أحد الأطراف، فله أن يطلب من الدائرة مترجمًا.";

export function buildHearingPrep(memoType: MemoType, locale: Locale): HearingPrepBody {
  const copy = clientCopy(locale);
  const questions = COURT_QUESTIONS[memoType];
  return {
    items: questions.map((questionAr, index) => ({
      questionAr,
      questionClient: copy.questions[index],
      answerAr: COURT_ANSWERS[index],
      answerClient: copy.answers[index],
    })),
    interpreterTipAr: TIP_AR,
    interpreterTipClient: copy.interpreter,
    disclaimer: MEMO_DISCLAIMER,
  };
}

export function plainSummary(locale: Locale, tokens: string[]): { locale: Locale; text: string; notice: string } {
  const copy = clientCopy(locale);
  const listed = tokens.length ? tokens.join("، ") : "—";
  return {
    locale,
    text: `${copy.summaryLead} ${listed}`,
    notice: copy.summaryNotice,
  };
}
