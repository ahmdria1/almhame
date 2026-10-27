import { translate } from "@elawyer/i18n";
import { LOCALES, type CourtType, type Locale } from "@elawyer/types";
import { type DocId, type PageRef, pagePath, publicPages, type TopId } from "./catalog";

export type L10n = Record<Locale, string>;

function L(
  ar: string,
  en: string,
  ur: string,
  hi: string,
  pa: string,
  si: string,
  bn: string,
  ne: string,
  fil: string,
  tr: string,
  am: string,
): L10n {
  return { ar, en, ur, hi, pa, si, bn, ne, fil, tr, am };
}

function fill(template: string, vars: Record<string, string>): string {
  let text = template;
  for (const [key, value] of Object.entries(vars)) text = text.replaceAll(`{${key}}`, value);
  return text;
}

export const COPY = {
  skip: L("تخطي إلى المحتوى", "Skip to content", "مواد پر جائیں", "सामग्री पर जाएँ", "مواد تے جاؤ", "අන්තර්ගතයට යන්න", "বিষয়ে যান", "सामग्रीमा जानुहोस्", "Lumaktaw sa nilalaman", "İçeriğe geç", "ወደ ይዘቱ ይለፉ"),
  language: L("اللغة", "Language", "زبان", "भाषा", "زبان", "භාෂාව", "ভাষা", "भाषा", "Wika", "Dil", "ቋንቋ"),
  menu: L("القائمة", "Menu", "فہرست", "मेनू", "مینیو", "මෙනුව", "মেনু", "मेनु", "Menu", "Menü", "ምናሌ"),
  home: L("الرئيسية", "Home", "سرورق", "मुखपृष्ठ", "مکھ صفحہ", "මුල් පිටුව", "প্রথম পাতা", "गृहपृष्ठ", "Tahanan", "Ana sayfa", "መነሻ"),
  pricing: L("الأسعار", "Pricing", "قیمتیں", "मूल्य", "قیمتاں", "මිල ගණන්", "মূল্য", "मूल्य", "Presyo", "Fiyatlar", "ዋጋ"),
  faq: L("الأسئلة", "Questions", "سوالات", "प्रश्न", "سوال", "ප්‍රශ්න", "প্রশ্ন", "प्रश्नहरू", "Mga tanong", "Sorular", "ጥያቄዎች"),
  privacy: L("الخصوصية", "Privacy", "رازداری", "गोपनीयता", "نجی حیثیت", "පෞද්ගලිකත්වය", "গোপনীয়তা", "गोपनीयता", "Pribasidad", "Gizlilik", "ግላዊነት"),
  terms: L("الشروط", "Terms", "شرائط", "शर्तें", "شرطاں", "කොන්දේසි", "শর্তাবলি", "सर्तहरू", "Mga tuntunin", "Koşullar", "ውሎች"),
  about: L("عن المنصة", "About", "تعارف", "परिचय", "جان پچھان", "අප ගැන", "পরিচিতি", "बारेमा", "Tungkol", "Hakkında", "ስለ መድረኩ"),
  contact: L("تواصل", "Contact", "رابطہ", "संपर्क", "رابطہ", "සම්බන්ධතා", "যোগাযোগ", "सम्पर्क", "Ugnayan", "İletişim", "ግንኙነት"),
  search: L("بحث", "Search", "تلاش", "खोज", "کھوج", "සෙවීම", "অনুসন্ধান", "खोज", "Paghahanap", "Arama", "ፍለጋ"),
  documents: L("المذكرات", "Documents", "دستاویزات", "दस्तावेज़", "دستاویزاں", "ලේඛන", "নথি", "कागजात", "Mga dokumento", "Belgeler", "ሰነዶች"),
  courts: L("المحاكم", "Courts", "عدالتیں", "न्यायालय", "عدالتاں", "අධිකරණ", "আদালত", "अदालतहरू", "Mga hukuman", "Mahkemeler", "ፍርድ ቤቶች"),
  breadcrumbs: L("مسار الصفحة", "Breadcrumb", "راستہ", "पथ", "راہ", "මාර්ගය", "পথ", "बाटो", "Landas", "Yol", "መንገድ"),
  notFound: L("الصفحة غير موجودة", "This page is not available", "یہ صفحہ موجود نہیں", "यह पृष्ठ उपलब्ध नहीं है", "اے صفحہ نہیں", "පිටුව නැත", "পাতাটি নেই", "पृष्ठ उपलब्ध छैन", "Walang ganitong pahina", "Sayfa yok", "ገጹ የለም"),
  unlimited: L("محادثات بلا حد شهري", "No monthly chat cap", "ماہانہ چیٹ کی حد نہیں", "मासिक चैट की सीमा नहीं", "مہینے دی چیٹ حد نہیں", "මාසික සංවාද සීමාවක් නැත", "মাসিক আলাপের সীমা নেই", "मासिक कुराकानीको सीमा छैन", "Walang buwanang hangganan sa usapan", "Aylık sohbet sınırı yok", "ወርሃዊ የውይይት ጣሪያ የለም"),
  seats: L("{count} مقاعد", "{count} seats", "{count} نشستیں", "{count} सीटें", "{count} نشستاں", "ආසන {count}", "{count}টি আসন", "{count} सिट", "{count} upuan", "{count} koltuk", "{count} መቀመጫዎች"),
  alsoCourts: L("المحاكم التي تستخدم هذا القالب", "Courts that use this template", "اس سانچے والی عدالتیں", "यह प्रारूप जिन अदालतों में चलता है", "ایس سانچے والیاں عدالتاں", "මෙම ආකෘතිය භාවිතා කරන අධිකරණ", "যে আদালতে এই ছাঁচ চলে", "यो ढाँचा चल्ने अदालत", "Mga hukuman na gumagamit ng templetong ito", "Bu şablonu kullanan mahkemeler", "ይህን ቅርጸት የሚጠቀሙ ፍርድ ቤቶች"),
  alsoDocs: L("أنواع المذكرات في هذا المسار", "Document types on this track", "اس راستے کی دستاویزیں", "इस मार्ग के दस्तावेज़", "ایس رستے دیاں دستاویزاں", "මෙම මාර්ගයේ ලේඛන", "এই পথের নথি", "यो मार्गका कागजात", "Mga dokumento sa landas na ito", "Bu yoldaki belge türleri", "በዚህ መስመር ያሉ ሰነዶች"),
  searchLabel: L("كلمة البحث", "Search words", "تلاش کے الفاظ", "खोज के शब्द", "کھوج دے لفظ", "සෙවුම් වචන", "খোঁজার শব্দ", "खोजका शब्द", "Mga salitang hahanapin", "Aranacak sözcükler", "የፍለጋ ቃላት"),
  searchEmpty: L("اكتب كلمة من عنوان صفحة عامة. البحث لا يمر على القضايا ولا على المذكرات المحفوظة.", "Type a word from a public page title. This search does not open cases or saved memos.", "عوامی صفحے کے عنوان کا لفظ لکھیں۔ تلاش مقدمات یا محفوظ یادداشتیں نہیں کھولتی۔", "सार्वजनिक पृष्ठ के शीर्षक का शब्द लिखें। यह खोज मामले या सहेजे ज्ञापन नहीं खोलती।", "عوامی صفحے دے عنوان دا لفظ لکھو۔ کھوج مقدمیاں یا محفوظ یادداشتاں نہیں کھولدی۔", "පොදු පිටුවක ශීර්ෂයෙන් වචනයක් ලියන්න. මෙය නඩු හෝ සුරකින ලද සටහන් නොවිවෘත කරයි.", "একটি প্রকাশ্য পাতার শিরোনাম থেকে শব্দ লিখুন। এই খোঁজ মামলা বা সেভ করা স্মারক খোলে না।", "सार्वजनिक पृष्ठको शीर्षकबाट शब्द लेख्नुहोस्। यो खोज मुद्दा वा सुरक्षित ज्ञापन खोल्दैन।", "Mag-type ng salita mula sa pamagat ng pampublikong pahina. Hindi nito binubuksan ang mga kaso o naka-save na memo.", "Herkese açık bir sayfa başlığından sözcük yazın. Bu arama dava dosyalarını veya kayıtlı notları açmaz.", "ከይፋዊ ገጽ ርዕስ ቃል ይጻፉ። ይህ ፍለጋ ጉዳዮችን ወይም የተቀመጡ ማስታወሻዎችን አይከፍትም።"),
  searchNone: L("لا توجد صفحة عامة تطابق هذه الكلمة.", "No public page matches those words.", "کوئی عوامی صفحہ ان الفاظ سے نہیں ملا۔", "इन शब्दों से कोई सार्वजनिक पृष्ठ नहीं मिला।", "ایہناں لفظاں نال کوئی عوامی صفحہ نہیں۔", "එම වචනවලට ගැළපෙන පොදු පිටුවක් නැත.", "এই শব্দে কোনো প্রকাশ্য পাতা মেলেনি।", "ती शब्दसँग सार्वजनिक पृष्ठ मिलेन।", "Walang pampublikong pahinang tumugma.", "Bu sözcüklere uyan herkese açık sayfa yok.", "ከእነዚህ ቃላት ጋር የሚሄድ ይፋዊ ገጽ የለም።"),
  contactMissing: L("لم يُضبط عنوان للتواصل. يضع المشغّل العنوان في CONTACT_EMAIL عند التشغيل، ولا يُعرض عنوان بديل في هذه الصفحة.", "No contact address is configured. The operator sets CONTACT_EMAIL for this deployment, and this page does not substitute another address.", "رابطے کا پتہ مقرر نہیں۔ آپریٹر CONTACT_EMAIL میں پتہ رکھتا ہے، اور یہ صفحہ کوئی اور پتہ نہیں دکھاتا۔", "संपर्क पता सेट नहीं है। संचालक CONTACT_EMAIL में पता रखता है, और यह पृष्ठ कोई दूसरा पता नहीं दिखाता।", "رابطے دا پتہ سیٹ نہیں۔ آپریٹر CONTACT_EMAIL وچ پتہ رکھدا اے، تے اے صفحہ کوئی ہور پتہ نہیں دکھاؤندا۔", "සම්බන්ධතා ලිපිනයක් සකසා නැත. ක්‍රියාකරු CONTACT_EMAIL තුළ ලිපිනය තබයි. මෙම පිටුව වෙනත් ලිපිනයක් නොදක්වයි.", "যোগাযোগের ঠিকানা সেট নেই। পরিচালক CONTACT_EMAIL-এ ঠিকানা রাখেন। এই পাতা অন্য ঠিকানা বসায় না।", "सम्पर्क ठेगाना सेट छैन। सञ्चालकले CONTACT_EMAIL मा ठेगाना राख्छन्। यो पृष्ठले अर्को ठेगाना देखाउँदैन।", "Walang nakatakdang tirahan. Inilalagay ito ng operator sa CONTACT_EMAIL. Hindi naglalagay ang pahinang ito ng ibang tirahan.", "İletişim adresi ayarlı değil. İşleten adresini CONTACT_EMAIL içine yazar. Bu sayfa başka bir adres koymaz.", "የግንኙነት አድራሻ አልተቀናበረም። ኦፕሬተሩ በ CONTACT_EMAIL ያስቀምጣል። ይህ ገጽ ሌላ አድራሻ አይተካም።"),
  contactReady: L("راسل المشغّل على العنوان التالي.", "Write to the operator at the address below.", "آپریٹر کو نیچے دیے پتے پر لکھیں۔", "नीचे दिए पते पर संचालक को लिखें।", "آپریٹر نوں تھلے دتے پتے تے لکھو۔", "පහත ලිපිනයට ක්‍රියාකරුට ලියන්න.", "নিচের ঠিকানায় পরিচালককে লিখুন।", "तलको ठेगानामा सञ्चालकलाई लेख्नुहोस्।", "Sumulat sa operator sa tirahan sa ibaba.", "Aşağıdaki adresten işletene yazın.", "ከታች ባለው አድራሻ ለኦፕሬተሩ ይጻፉ።"),
  vat: L("الأسعار بالريال السعودي وتشمل ضريبة القيمة المضافة بنسبة 15٪.", "Prices are in Saudi riyals and include VAT at 15 percent.", "قیمتیں سعودی ریال میں ہیں اور 15 فیصد ویٹ شامل ہے۔", "मूल्य सऊदी रियाल में है और इसमें 15 प्रतिशत वैट शामिल है।", "قیمتاں سعودی ریال وچ نیں تے 15 فیصد ویٹ شامل اے۔", "මිල සෞදි රියාල් වලින් වන අතර සියයට 15ක වැට් බද්ද ඇතුළත්ය.", "মূল্য সৌদি রিয়ালে এবং ১৫ শতাংশ ভ্যাটসহ।", "मूल्य साउदी रियालमा छ र १५ प्रतिशत भ्याट समावेश छ।", "Ang presyo ay sa Saudi riyal at kasama ang 15 porsiyentong VAT.", "Fiyatlar Suudi riyali cinsindendir ve yüzde 15 KDV dahildir.", "ዋጋው በሳዑዲ ሪያል ሲሆን 15 በመቶ ቫትን ያካትታል።"),
  homeDescription: L(
    "صياغة صحف الدعاوى ومذكرات الدفاع والرد والاعتراض أمام الجهات القضائية السعودية، بأسانيد من المدونة المخزنة فقط.",
    "Draft lawsuits, defense memos, replies, and objections for Saudi courts, with citations taken only from the stored corpus.",
    "سعودی عدالتوں کے لیے دعوی، دفاع، جواب اور اعتراض کے مسودے، صرف محفوظ شدہ مدونہ سے حوالوں کے ساتھ۔",
    "सऊदी अदालतों के लिए दावा, बचाव, उत्तर और आपत्ति के मसौदे। उद्धरण केवल संग्रहीत संग्रह से लिए जाते हैं।",
    "سعودی عدالتاں لئی دعوی، دفاع، جواب تے اعتراض دے مسودے۔ حوالے صرف محفوظ مجموعے توں۔",
    "සෞදි අධිකරණ සඳහා නඩු, ආරක්ෂක, පිළිතුරු සහ විරෝධතා කෙටුම්පත්. උපුටා දැක්වීම් ගබඩා කළ සංග්‍රහයෙන් පමණි.",
    "সৌদি আদালতের জন্য মামলা, প্রতিরক্ষা, জবাব ও আপত্তির খসড়া। উদ্ধৃতি শুধু সংরক্ষিত সংকলন থেকে।",
    "साउदी अदालतका लागि मुद्दा, प्रतिरक्षा, जवाफ र आपत्तिको मस्यौदा। उद्धरण भण्डार गरिएको सङ्ग्रहबाट मात्र।",
    "Mga draft ng demanda, depensa, sagot, at tutol para sa mga hukuman ng Saudi. Ang mga sipi ay mula lamang sa nakaimbak na corpus.",
    "Suudi mahkemeleri için dava, savunma, cevap ve itiraz taslakları. Atıflar yalnızca kayıtlı külliyattan alınır.",
    "ለሳዑዲ ፍርድ ቤቶች ክስ፣ መከላከያ፣ ምላሽ እና ተቃውሞ ረቂቆች። ጥቅሶች ከተቀመጠው ስብስብ ብቻ ናቸው።",
  ),
  pricingDescription: L(
    "باقات الصياغة الشهرية: المجانية والأساسية والاحترافية والمكاتب، بالريال السعودي مع ضريبة 15٪.",
    "Monthly drafting plans: Free, Basic, Professional, and Chambers, in Saudi riyals with 15 percent VAT.",
    "ماہانہ مسودہ پلان: مفت، بنیادی، پیشہ ورانہ، اور دفاتر، سعودی ریال میں 15 فیصد ٹیکس کے ساتھ۔",
    "मासिक मसौदा योजनाएँ: निःशुल्क, आधार, व्यावसायिक और कार्यालय, सऊदी रियाल में 15 प्रतिशत कर सहित।",
    "مہینے دے مسودہ پلان: مفت، بنیادی، پیشہ ورانہ، تے دفاتر، سعودی ریال وچ 15 فیصد ٹیکس نال۔",
    "මාසික කෙටුම්පත් සැලසුම්: නොමිලේ, මූලික, වෘත්තීය සහ කාර්යාල, සෞදි රියාල් සහ සියයට 15 බද්ද.",
    "মাসিক খসড়া পরিকল্পনা: বিনামূল্যে, মৌলিক, পেশাদার ও অফিস, সৌদি রিয়ালে ১৫ শতাংশ করসহ।",
    "मासिक मस्यौदा योजना: निःशुल्क, आधारभूत, व्यावसायिक र कार्यालय, साउदी रियालमा १५ प्रतिशत करसहित।",
    "Buwanang plano: libre, basic, propesyonal, at opisina, sa Saudi riyal na may 15 porsiyentong buwis.",
    "Aylık taslak planları: ücretsiz, temel, profesyonel ve büro, Suudi riyali ve yüzde 15 vergi ile.",
    "ወርሃዊ የረቂቅ ዕቅዶች፦ ነፃ፣ መሠረታዊ፣ ሙያዊ እና ቢሮ፣ በሳዑዲ ሪያል ከ15 በመቶ ግብር ጋር።",
  ),
  faqDescription: L(
    "إجابات عن الأسانيد والخصوصية والباقة المجانية والمدفوعات في منصة الصياغة.",
    "Answers on citations, privacy, the free plan, and payments for the drafting platform.",
    "حوالہ، رازداری، مفت پلان، اور ادائیگی کے بارے میں جوابات۔",
    "उद्धरण, गोपनीयता, निःशुल्क योजना और भुगतान के उत्तर।",
    "حوالہ، نجی حیثیت، مفت پلان، تے ادائیگی دے جواب۔",
    "උපුටා දැක්වීම්, පෞද්ගලිකත්වය, නොමිලේ සැලැස්ම සහ ගෙවීම් ගැන පිළිතුරු.",
    "উদ্ধৃতি, গোপনীয়তা, বিনামূল্যের পরিকল্পনা ও পেমেন্টের উত্তর।",
    "उद्धरण, गोपनीयता, निःशुल्क योजना र भुक्तानीका उत्तर।",
    "Mga sagot tungkol sa sipi, pribasidad, libreng plano, at bayad.",
    "Atıf, gizlilik, ücretsiz plan ve ödemeler hakkında yanıtlar.",
    "ስለ ጥቅስ፣ ግላዊነት፣ ነፃ ዕቅድ እና ክፍያ መልሶች።",
  ),
  privacyDescription: L(
    "كيف تُشفّر ملفات القضية، ومن يراها، وكيف يُصدَّر الحساب أو يُحذف.",
    "How case files are encrypted, who can see them, and how an account is exported or deleted.",
    "کیس کی فائلیں کیسے خفیہ ہوتی ہیں، کون دیکھ سکتا ہے، اور اکاؤنٹ کیسے برآمد یا حذف ہوتا ہے۔",
    "केस फ़ाइलें कैसे एन्क्रिप्ट होती हैं, उन्हें कौन देख सकता है, और खाता कैसे निर्यात या हटाया जाता है।",
    "کیس فائلاں کویں خفیہ ہوندیاں نیں، کون ویکھ سکدا اے، تے اکاؤنٹ کویں برآمد یا مٹدا اے۔",
    "නඩු ගොනු සංකේතනය වන ආකාරය, බලන්නේ කවුරුන්ද, ගිණුම නිර්යාත හෝ මකා දමන ආකාරය.",
    "মামলার ফাইল কীভাবে এনক্রিপ্ট হয়, কে দেখতে পারে, এবং অ্যাকাউন্ট কীভাবে রপ্তানি বা মুছে ফেলা হয়।",
    "मुद्दाका फाइल कसरी गोप्य हुन्छन्, कसले हेर्न सक्छ, र खाता कसरी निर्यात वा मेटिन्छ।",
    "Paano naka-encrypt ang mga file ng kaso, sino ang makakakita, at paano iniluluwas o binubura ang account.",
    "Dava dosyaları nasıl şifrelenir, kim görebilir, hesap nasıl dışa aktarılır veya silinir.",
    "የጉዳይ ፋይሎች እንዴት እንደሚመሰጠሩ፣ ማን እንደሚያያቸው፣ እና አካውንት እንዴት እንደሚወጣ ወይም እንደሚሰረዝ።",
  ),
  termsDescription: L(
    "تفعيل الحساب بالبريد، وحدود الباقات، ومراجعة المسودة قبل إيداعها لدى المحكمة.",
    "Email activation, plan quotas, and review of a draft before it is filed with the court.",
    "ای میل سے اکاؤنٹ کی فعالیت، پلان کی حدیں، اور عدالت میں جمع کرنے سے پہلے مسودے کا جائزہ۔",
    "ईमेल से खाता सक्रिय करना, योजना की सीमाएँ, और अदालत में दाखिल करने से पहले मसौदे की समीक्षा।",
    "ای میل نال اکاؤنٹ فعال کرنا، پلان دیاں حداں، تے عدالت وچ جمع کرن توں پہلاں مسودے دا جائزہ۔",
    "ඊමේල් මගින් ගිණුම සක්‍රිය කිරීම, සැලසුම් සීමා, සහ අධිකරණයට බාර දීමට පෙර කෙටුම්පත පරීක්ෂා කිරීම.",
    "ইমেইলে অ্যাকাউন্ট সক্রিয় করা, পরিকল্পনার সীমা, এবং আদালতে জমা দেওয়ার আগে খসড়া দেখে নেওয়া।",
    "इमेलबाट खाता सक्रिय गर्ने, योजनाका सीमा, र अदालतमा बुझाउनुअघि मस्यौदा हेर्ने।",
    "Pag-activate sa email, mga quota ng plano, at pagrepaso ng draft bago ihain sa hukuman.",
    "E-posta ile etkinleştirme, plan kotaları ve mahkemeye sunmadan önce taslağı gözden geçirme.",
    "በኢሜይል ማግበር፣ የዕቅድ ኮታ፣ እና ወደ ፍርድ ቤት ከማቅረብ በፊት ረቂቁን መገምገም።",
  ),
  aboutDescription: L(
    "منصة صياغة للجهات القضائية السعودية بإحدى عشرة لغة، أنشأها أحمد العمراني.",
    "A Saudi court drafting platform in eleven languages, created by Ahmed Alamrani.",
    "سعودی عدالتوں کے لیے مسودہ پلیٹ فارم، گیارہ زبانوں میں، احمد العمرانی کا بنایا ہوا۔",
    "सऊदी अदालतों के लिए ग्यारह भाषाओं में मसौदा मंच, जिसे अहमद अल-उमरानी ने बनाया है।",
    "سعودی عدالتاں لئی مسودہ پلیٹ فارم، گیارہ زباناں وچ، احمد العمرانی دا بنایا ہویا۔",
    "සෞදි අධිකරණ සඳහා භාෂා එකොළහකින් කෙටුම්පත් වේදිකාව. නිර්මාණය අහමඩ් අලම්රානි.",
    "সৌদি আদালতের জন্য এগারো ভাষায় খসড়া মঞ্চ। তৈরি করেছেন আহমেদ আলামরানি।",
    "साउदी अदालतका लागि एघार भाषामा मस्यौदा मञ्च। अहमद अलअमरानीले बनाएका हुन्।",
    "Plataporma ng pagbalangkas para sa mga hukuman ng Saudi sa labing-isang wika. Ginawa ni Ahmed Alamrani.",
    "Suudi mahkemeleri için on bir dilde taslak platformu. Ahmed Alamrani tarafından kuruldu.",
    "ለሳዑዲ ፍርድ ቤቶች በአሥራ አንድ ቋንቋ የሚሠራ የረቂቅ መድረክ። በአህመድ አላምራኒ የተሠራ።",
  ),
  contactDescription: L(
    "طريقة الوصول إلى مشغّل هذا النشر. لا يُنشر في الصفحة عنوان بديل.",
    "How to reach the operator of this deployment. The page does not publish a substitute address.",
    "اس تنصیب کے آپریٹر تک پہنچنے کا طریقہ۔ صفحہ کوئی بدل پتہ شائع نہیں کرتا۔",
    "इस स्थापना के संचालक तक पहुँचने का तरीका। पृष्ठ कोई स्थानापन्न पता प्रकाशित नहीं करता।",
    "ایس تنصیب دے آپریٹر تک پہنچن دا طریقہ۔ صفحہ کوئی بدل پتہ شائع نہیں کردا۔",
    "මෙම ස්ථාපනයේ ක්‍රියාකරු වෙත ළඟා වන ආකාරය. පිටුව ආදේශ ලිපිනයක් පළ නොකරයි.",
    "এই স্থাপনার পরিচালকের কাছে পৌঁছানোর উপায়। পাতাটি বিকল্প ঠিকানা প্রকাশ করে না।",
    "यो स्थापनाको सञ्चालकसम्म पुग्ने तरिका। पृष्ठले बदली ठेगाना प्रकाशित गर्दैन।",
    "Paraan para makipag-ugnayan sa operator ng deployment na ito. Walang ipinapalit na tirahan ang pahina.",
    "Bu kurulumun işletenine ulaşma yolu. Sayfa yerine başka bir adres yayımlamaz.",
    "የዚህን ጭነት ኦፕሬተር የሚያገኙበት መንገድ። ገጹ ምትክ አድራሻ አያትም።",
  ),
  searchDescription: L(
    "بحث في الصفحات العامة: أنواع المذكرات والمحاكم والأسعار. لا يشمل القضايا ولا المذكرات المحفوظة.",
    "Search public pages on document types, courts, and pricing. Cases and saved memos are excluded.",
    "عوامی صفحات میں تلاش: دستاویز، عدالتیں، اور قیمتیں۔ مقدمات اور محفوظ یادداشتیں شامل نہیں۔",
    "दस्तावेज़, अदालत और मूल्य के सार्वजनिक पृष्ठों में खोज। मामले और सहेजे ज्ञापन शामिल नहीं।",
    "عوامی صفحیاں وچ کھوج: دستاویز، عدالتاں، تے قیمتاں۔ مقدمیاں تے محفوظ یادداشتاں شامل نہیں۔",
    "ලේඛන, අධිකරණ සහ මිල පිළිබඳ පොදු පිටු සොයන්න. නඩු සහ සුරකින ලද සටහන් ඇතුළත් නොවේ.",
    "নথি, আদালত ও মূল্যের প্রকাশ্য পাতায় খোঁজ। মামলা ও সেভ করা স্মারক ধরা হয় না।",
    "कागजात, अदालत र मूल्यका सार्वजनिक पृष्ठमा खोज। मुद्दा र सुरक्षित ज्ञापन पर्दैनन्।",
    "Hanapin ang mga pampublikong pahina tungkol sa dokumento, hukuman, at presyo. Hindi kasama ang mga kaso at naka-save na memo.",
    "Belge türleri, mahkemeler ve fiyatlarla ilgili herkese açık sayfalarda arama. Davalar ve kayıtlı notlar yoktur.",
    "በሰነድ፣ ፍርድ ቤት እና ዋጋ ይፋዊ ገጾች ላይ ፍለጋ። ጉዳዮች እና የተቀመጡ ማስታወሻዎች አይካተቱም።",
  ),
  docDescription: L(
    "صياغة {name} أمام جهة قضائية سعودية، مع حصر الأسانيد في المدونة المخزنة.",
    "How a {name} is drafted for a Saudi court, with citations limited to the stored corpus.",
    "{name} سعودی عدالت کے لیے کیسے بنتی ہے، حوالے صرف محفوظ مدونہ سے۔",
    "सऊदी अदालत के लिए {name} कैसे बनता है, उद्धरण केवल संग्रहीत संग्रह से।",
    "{name} سعودی عدالت لئی کویں بندا اے، حوالے صرف محفوظ مجموعے توں۔",
    "සෞදි අධිකරණයක් සඳහා {name} සකසන ආකාරය. උපුටා දැක්වීම් ගබඩා කළ සංග්‍රහයට සීමා වේ.",
    "সৌদি আদালতের জন্য {name} কীভাবে তৈরি হয়। উদ্ধৃতি শুধু সংরক্ষিত সংকলনে সীমাবদ্ধ।",
    "साउदी अदालतका लागि {name} कसरी बन्छ। उद्धरण भण्डार गरिएको सङ्ग्रहमा मात्र सीमित छ।",
    "Paano binabalangkas ang {name} para sa hukuman ng Saudi. Ang mga sipi ay sa nakaimbak na corpus lamang.",
    "Suudi mahkemesi için {name} nasıl hazırlanır. Atıflar kayıtlı külliyatla sınırlıdır.",
    "ለሳዑዲ ፍርድ ቤት {name} እንዴት እንደሚዘጋጅ። ጥቅሶች በተቀመጠው ስብስብ ብቻ የተገደቡ ናቸው።",
  ),
  courtDescription: L(
    "الصياغة أمام {name}: صحيفة الدعوى ومذكرة الدفاع والرد والاعتراض، والباقة تحدد الإتاحة.",
    "Drafting before the {name}: lawsuit, defense, reply, and objection. The plan controls access.",
    "{name} کے سامنے مسودہ: دعوی، دفاع، جواب، اور اعتراض۔ پلان رسائی طے کرتا ہے۔",
    "{name} के समक्ष मसौदा: दावा, बचाव, उत्तर और आपत्ति। योजना पहुँच तय करती है।",
    "{name} دے سامنے مسودہ: دعوی، دفاع، جواب، تے اعتراض۔ پلان رسائی طے کردا اے۔",
    "{name} ඉදිරියේ කෙටුම්පත: නඩුව, ආරක්ෂාව, පිළිතුර, විරෝධය. සැලැස්ම ප්‍රවේශය තීරණය කරයි.",
    "{name}-এর সামনে খসড়া: মামলা, প্রতিরক্ষা, জবাব ও আপত্তি। পরিকল্পনা প্রবেশাধিকার ঠিক করে।",
    "{name} अघि मस्यौदा: मुद्दा, प्रतिरक्षा, जवाफ र आपत्ति। योजनाले पहुँच तय गर्छ।",
    "Pagbalangkas sa harap ng {name}: demanda, depensa, sagot, at tutol. Ang plano ang nagtatakda ng access.",
    "{name} önünde taslak: dava, savunma, cevap ve itiraz. Erişimi plan belirler.",
    "በ{name} ፊት ረቂቅ፦ ክስ፣ መከላከያ፣ ምላሽ እና ተቃውሞ። ተደራሽነቱን ዕቅዱ ይወስናል።",
  ),
  docBody: L(
    "تُبنى {name} من أوراق القضية التي يرفعها صاحب الحساب. كل مادة تُذكر يجب أن تكون موجودة في المدونة، وإلا رُفض الاستشهاد ولم يُحفظ.\nراجع النص في المحرر قبل تصدير PDF أو Word.",
    "A {name} is built from the case papers the account holder uploads. An article is cited only when it is in the corpus; otherwise the citation is rejected and not saved.\nReview the text in the editor before exporting PDF or Word.",
    "{name} اکاؤنٹ ہولڈر کے اٹھائے ہوئے کاغذات سے بنتی ہے۔ حوالہ تب ہی لگتا ہے جب مادہ مدونہ میں ہو، ورنہ مسترد ہو کر محفوظ نہیں ہوتا۔\nPDF یا Word سے پہلے متن ایڈیٹر میں دیکھ لیں۔",
    "{name} खाताधारक के कागज़ों से बनता है। उद्धरण तभी लगता है जब धारा संग्रह में हो, नहीं तो वह अस्वीकार होकर सहेजा नहीं जाता।\nPDF या Word से पहले संपादक में पाठ देख लें।",
    "{name} اکاؤنٹ ہولڈر دے کاغذاں توں بندی اے۔ حوالہ تے ای لگدا اے جدوں مادہ مجموعے وچ ہووے، نئیں تے رد ہو کے محفوظ نہیں ہوندا۔\nPDF یا Word توں پہلاں ایڈیٹر وچ متن ویکھ لو۔",
    "{name} ගිණුම් හිමියා උඩුගත කළ ලේඛනවලින් සැදේ. සංග්‍රහයේ ඇති විට පමණක් උපුටා දැක්වේ. නැත්නම් එය ප්‍රතික්ෂේප වී නොසුරකිනු ඇත.\nPDF හෝ Word පෙර සංස්කාරකයේ පරීක්ෂා කරන්න.",
    "{name} অ্যাকাউন্টধারীর কাগজ থেকে তৈরি হয়। উদ্ধৃতি তখনই বসে যখন ধারা সংকলনে থাকে, না হলে তা বাতিল হয়ে সেভ হয় না।\nPDF বা Word-এর আগে সম্পাদকে পাঠ দেখে নিন।",
    "{name} खातावालाका कागजबाट बन्छ। उद्धरण तब मात्र लाग्छ जब धारा सङ्ग्रहमा हुन्छ, नत्र अस्वीकार भएर सुरक्षित हुँदैन।\nPDF वा Word अघि सम्पादकमा पाठ हेर्नुहोस्।",
    "Ang {name} ay galing sa mga papel na ina-upload ng may account. May sipi lamang kapag nasa corpus ang artikulo; kung wala, tinatanggihan at hindi sine-save.\nRepasuhin ang teksto bago i-export ang PDF o Word.",
    "{name}, hesap sahibinin yüklediği evraklardan kurulur. Madde yalnızca külliyatta varsa anılır; yoksa atıf reddedilir ve kaydedilmez.\nPDF veya Word öncesinde metni düzenleyicide gözden geçirin.",
    "{name} ከአካውንት ባለቤቱ ከሚጭናቸው ወረቀቶች ይሠራል። አንቀጽ በስብስቡ ውስጥ ሲኖር ብቻ ይጠቀሳል፤ ከሌለ ውድቅ ሆኖ አይቀመጥም።\nPDF ወይም Word ከመላክ በፊት ጽሑፉን በአርታዒው ይገምግሙ።",
  ),
  courtBody: L(
    "قالب {name} يضبط شكل الصحيفة والمذكرة لهذا المسار. الأسانيد لا تُضاف من خارج المدونة المخزنة.\nالباقة هي التي تفتح هذا المسار أو تتركه مقفلاً.",
    "The {name} template sets the shape of the filing for this track. Grounds are not added from outside the stored corpus.\nThe plan is what opens this track or leaves it closed.",
    "{name} کا سانچہ اس راستے کی درخواست کی شکل طے کرتا ہے۔ محفوظ مدونہ کے باہر سے استناد نہیں جوڑا جاتا۔\nپلان ہی اس راستے کو کھولتا یا بند چھوڑتا ہے۔",
    "{name} का प्रारूप इस मार्ग की अर्जी का रूप तय करता है। संग्रहीत संग्रह के बाहर से आधार नहीं जोड़ा जाता।\nयोजना ही इस मार्ग को खोलती है या बंद छोड़ती है।",
    "{name} دا سانچہ ایس رستے دی درخواست دی شکل طے کردا اے۔ محفوظ مجموعے توں باہر استناد نہیں جوڑیا جاندا۔\nپلان ای ایس رستے نوں کھولدا اے یا بند چھڈدا اے۔",
    "{name} ආකෘතිය මෙම මාර්ගයේ ගොනුවේ හැඩය සකසයි. ගබඩා කළ සංග්‍රහයෙන් පිටතින් පදනම් එකතු නොකෙරේ.\nසැලැස්ම මෙම මාර්ගය විවෘත කරයි හෝ වසා තබයි.",
    "{name} ছাঁচ এই পথের আবেদনের আকার ঠিক করে। সংরক্ষিত সংকলনের বাইরে থেকে ভিত্তি যোগ হয় না।\nপরিকল্পনাই এই পথ খোলে বা বন্ধ রাখে।",
    "{name} को ढाँचाले यो मार्गको निवेदनको रूप तय गर्छ। भण्डार गरिएको सङ्ग्रहबाहिरबाट आधार थपिँदैन।\nयोजनाले नै यो मार्ग खोल्छ वा बन्द छाड्छ।",
    "Itinatakda ng templetong {name} ang anyo ng paghahain sa landas na ito. Walang batayang idinaragdag mula sa labas ng corpus.\nAng plano ang nagbubukas o nagsasara ng landas.",
    "{name} şablonu bu yoldaki dilekçenin biçimini belirler. Kayıtlı külliyatın dışından dayanak eklenmez.\nYolu açan veya kapalı bırakan plandır.",
    "የ{name} ቅርጸት በዚህ መስመር ያለውን ማመልከቻ ቅርጽ ይወስናል። ከተቀመጠው ስብስብ ውጭ ምክንያት አይጨመርም።\nመስመሩን የሚከፍተው ወይም የሚዘጋው ዕቅዱ ነው።",
  ),
  pricingBody: L(
    "الخطة المجانية خمس محادثات مدى حياة الحساب، لا خمسًا كل شهر. عند الترقية أو التجديد يبدأ عدّ محادثات الفترة من جديد.\nالمذكرة المفردة تُحسب عند نفاد حصة المذكرات.",
    "The free plan is five chats for the life of the account, not five each month. An upgrade or a renewal starts the period chat count again.\nA single memo is charged when the memo quota is used up.",
    "مفت پلان اکاؤنٹ کی زندگی میں پانچ چیٹس ہیں، ہر مہینے پانچ نہیں۔ ترقیہ یا تجدید پر مدت کی گنتی نئے سرے سے شروع ہوتی ہے۔\nیادداشت کی حد ختم ہونے پر ایک یادداشت الگ سے شمار ہوتی ہے۔",
    "निःशुल्क योजना खाते के जीवन में पाँच चैट है, हर महीने पाँच नहीं। उन्नयन या नवीनीकरण पर अवधि की गिनती फिर से शुरू होती है।\nज्ञापन की सीमा समाप्त होने पर एक ज्ञापन अलग से गिना जाता है।",
    "مفت پلان اکاؤنٹ دی زندگی وچ پنج چیٹ نیں، ہر مہینے پنج نہیں۔ ترقیہ یا تجدید تے مدت دی گنتی نویں سرے توں شروع ہوندی اے۔\nیادداشت دی حد مکّن تے اک یادداشت وکھری گنی جاندی اے۔",
    "නොමිලේ සැලැස්ම ගිණුමේ ආයු කාලයට සංවාද පහකි, මසකට පහක් නොවේ. උසස් කිරීම හෝ අලුත් කිරීමේදී කාල ගණනය නැවත ආරම්භ වේ.\nසටහන් කෝටාව අවසන් වූ විට එක් සටහනක් වෙනම ගණන් වේ.",
    "বিনামূল্যের পরিকল্পনায় অ্যাকাউন্টের জীবনে পাঁচটি আলাপ, প্রতি মাসে পাঁচটি নয়। আপগ্রেড বা নবায়নে সময়ের গণনা আবার শুরু হয়।\nস্মারকের কোটা শেষ হলে একটি স্মারক আলাদা গোনা হয়।",
    "निःशुल्क योजना खाताको जीवनमा पाँच कुराकानी हो, हरेक महिना पाँच होइन। स्तरोन्नति वा नवीकरणमा अवधिको गन्ती फेरि सुरु हुन्छ।\nज्ञापनको कोटा सकिएपछि एउटा ज्ञापन छुट्टै गनिन्छ।",
    "Ang libreng plano ay limang usapan sa buhay ng account, hindi lima bawat buwan. Ang upgrade o renewal ay nagsisimula muli ng bilang ng panahon.\nIsang memo ang sisingilin kapag naubos ang quota ng memo.",
    "Ücretsiz plan, hesabın ömrü boyunca beş sohbettir, her ay beş değil. Yükseltme veya yenileme dönem sayacını yeniden başlatır.\nNot kotası bitince tek bir not ayrıca sayılır.",
    "ነፃ ዕቅዱ በአካውንቱ ዕድሜ አምስት ውይይቶች ነው፣ በየወሩ አምስት አይደለም። ማሻሻያ ወይም እድሳት የጊዜ ቆጠራውን እንደገና ይጀምራል።\nየማስታወሻ ኮታ ሲያልቅ አንድ ማስታወሻ ለየብቻ ይቆጠራል።",
  ),
  privacyBody: L(
    "محتوى المحادثات والمستندات والمذكرات يُشفّر بمفتاح خاص بالحساب. لوحة الإدارة تعرض الإجماليات ولا تعرض نص الملفات.\nيمكن لصاحب الحساب تصدير بياناته أو حذف الحساب من الإعدادات.",
    "Chats, documents, and memos are encrypted with a key that belongs to the account. The admin screen shows totals, not the text of the files.\nThe account holder can export the data or delete the account from settings.",
    "چیٹس، دستاویزیں، اور یادداشتیں اکاؤنٹ کی اپنی کلید سے خفیہ ہوتی ہیں۔ انتظامی سکرین کل تعداد دکھاتی ہے، فائلوں کا متن نہیں۔\nاکاؤنٹ ہولڈر ترتیبات سے ڈیٹا برآمد یا اکاؤنٹ حذف کر سکتا ہے۔",
    "चैट, दस्तावेज़ और ज्ञापन खाते की अपनी कुंजी से एन्क्रिप्ट होते हैं। प्रशासन स्क्रीन कुल संख्या दिखाती है, फ़ाइलों का पाठ नहीं।\nखाताधारक सेटिंग से डेटा निर्यात कर सकता है या खाता हटा सकता है।",
    "چیٹ، دستاویزاں، تے یادداشتاں اکاؤنٹ دی اپنی کنجی نال خفیہ ہوندیاں نیں۔ انتظامی سکرین کل گنتی دکھاندی اے، فائلاں دا متن نہیں۔\nاکاؤنٹ ہولڈر سیٹنگ توں ڈیٹا برآمد یا اکاؤنٹ مٹا سکدا اے۔",
    "සංවාද, ලේඛන සහ සටහන් ගිණුමට අයිති යතුරකින් සංකේතනය වේ. පරිපාලන තිරය එකතුව පෙන්වයි, ගොනුවල පෙළ නොවේ.\nගිණුම් හිමියාට සැකසුම් වලින් දත්ත නිර්යාත කිරීම හෝ ගිණුම මැකීම කළ හැක.",
    "আলাপ, নথি ও স্মারক অ্যাকাউন্টের নিজের চাবি দিয়ে এনক্রিপ্ট হয়। প্রশাসন স্ক্রিন মোট সংখ্যা দেখায়, ফাইলের পাঠ নয়।\nঅ্যাকাউন্টধারী সেটিংস থেকে ডেটা রপ্তানি বা অ্যাকাউন্ট মুছে ফেলতে পারেন।",
    "कुराकानी, कागजात र ज्ञापन खाताको आफ्नै साँचोले गोप्य हुन्छन्। प्रशासन स्क्रिनले जम्मा सङ्ख्या देखाउँछ, फाइलको पाठ होइन।\nखातावालाले सेटिङबाट डेटा निर्यात गर्न वा खाता मेटाउन सक्छन्।",
    "Naka-encrypt ang mga usapan, dokumento, at memo sa susi ng account. Ipinapakita ng admin ang kabuuan, hindi ang teksto ng mga file.\nMaaaring i-export ng may-ari ang data o burahin ang account sa mga setting.",
    "Sohbetler, belgeler ve notlar hesabın kendi anahtarıyla şifrelenir. Yönetim ekranı toplamları gösterir, dosyaların metnini değil.\nHesap sahibi ayarlardan veriyi dışa aktarabilir veya hesabı silebilir.",
    "ውይይቶች፣ ሰነዶች እና ማስታወሻዎች በአካውንቱ ቁልፍ ይመሰጠራሉ። የአስተዳደር ማያ ጠቅላላ ቁጥር ያሳያል፣ የፋይሉን ጽሑፍ አይደለም።\nባለቤቱ ከቅንብር ውሂቡን መላክ ወይም አካውንቱን መሰረዝ ይችላል።",
  ),
  termsBody: L(
    "يُفعَّل الحساب برمز يُرسل إلى البريد. الحساب يبقى غير فعّال حتى إدخال الرمز. حدود المذكرات والمحادثات هي أرقام الباقات المنشورة.\nالمسودة مساعدة للصياغة. راجعها قبل إيداعها، فالمنصة لا تقدمها على أنها حكم محكمة.",
    "The account is activated by a code sent to email. It stays inactive until the code is entered. Memo and chat limits are the figures on the published plans.\nThe draft is a drafting aid. Review it before filing. The platform does not present it as a court judgment.",
    "اکاؤنٹ ای میل پر بھیجے کوڈ سے فعال ہوتا ہے۔ کوڈ داخل ہونے تک غیر فعال رہتا ہے۔ یادداشت اور چیٹ کی حدیں شائع شدہ پلان کے اعداد ہیں۔\nمسودہ صیاغت میں مدد ہے۔ جمع کرنے سے پہلے دیکھ لیں۔ پلیٹ فارم اسے عدالتی فیصلہ نہیں بناتا۔",
    "खाता ईमेल पर भेजे कोड से सक्रिय होता है। कोड दर्ज होने तक वह निष्क्रिय रहता है। ज्ञापन और चैट की सीमाएँ प्रकाशित योजनाओं के अंक हैं।\nमसौदा लेखन में सहायता है। दाखिल करने से पहले उसे देखें। मंच उसे अदालती निर्णय नहीं बताता।",
    "اکاؤنٹ ای میل تے بھیجے کوڈ نال فعال ہوندا اے۔ کوڈ داخل ہون تک غیر فعال رہندا اے۔ یادداشت تے چیٹ دیاں حداں شائع شدہ پلان دے عدد نیں۔\nمسودہ صیاغت وچ مدد اے۔ جمع کرن توں پہلاں ویکھ لو۔ پلیٹ فارم اینوں عدالتی فیصلہ نہیں بناؤندا۔",
    "ගිණුම ඊමේල් කේතයකින් සක්‍රිය වේ. කේතය ඇතුළත් වන තුරු අක්‍රියයි. සටහන් සහ සංවාද සීමා ප්‍රකාශිත සැලසුම්වල සංඛ්‍යා වේ.\nකෙටුම්පත සහායකි. බාර දීමට පෙර පරීක්ෂා කරන්න. වේදිකාව එය අධිකරණ තීන්දුවක් ලෙස නොපෙන්වයි.",
    "অ্যাকাউন্ট ইমেইলে পাঠানো কোডে সক্রিয় হয়। কোড না দেওয়া পর্যন্ত নিষ্ক্রিয় থাকে। স্মারক ও আলাপের সীমা প্রকাশিত পরিকল্পনার সংখ্যা।\nখসড়া লেখার সহায়। জমা দেওয়ার আগে দেখে নিন। মঞ্চ এটিকে আদালতের রায় বলে না।",
    "खाता इमेलमा पठाइएको कोडले सक्रिय हुन्छ। कोड नहालुन्जेल निष्क्रिय रहन्छ। ज्ञापन र कुराकानीका सीमा प्रकाशित योजनाका अङ्क हुन्।\nमस्यौदा लेखन सहयोग हो। बुझाउनुअघि हेर्नुहोस्। मञ्चले यसलाई अदालतको फैसला भन्दैन।",
    "Ina-activate ang account sa code sa email. Mananatili itong hindi aktibo hanggang mailagay ang code. Ang mga limitasyon ay ang mga bilang sa nailathalang plano.\nAng draft ay tulong sa pagbalangkas. Repasuhin ito bago ihain. Hindi ito inihaharap bilang hatol ng hukuman.",
    "Hesap, e-postaya gönderilen kodla etkinleşir. Kod girilene kadar pasif kalır. Not ve sohbet sınırları yayımlanan planların rakamlarıdır.\nTaslak bir yazım yardımcısıdır. Sunmadan önce gözden geçirin. Platform bunu mahkeme kararı olarak sunmaz.",
    "አካውንቱ በኢሜይል በተላከ ኮድ ይነቃል። ኮዱ እስኪገባ ድረስ ንቁ አይደለም። የማስታወሻ እና የውይይት ገደቦች የታተሙት የዕቅድ ቁጥሮች ናቸው።\nረቂቁ የጽሑፍ እርዳታ ነው። ከማቅረብዎ በፊት ይገምግሙ። መድረኩ እንደ ፍርድ ቤት ውሳኔ አያቀርበውም።",
  ),
  aboutBody: L(
    "المحامي الإلكتروني المتقدم منصة لصياغة المذكرات أمام الجهات القضائية السعودية. أنشأها أحمد العمراني.\nالواجهة متاحة بالعربية والإنجليزية والأردية والهندية والبنجابية والسنهالية والبنغالية والنيبالية والفلبينية والتركية والأمهرية. النص العربي هو مخرج التصدير.",
    "Advanced E-Lawyer is a platform for drafting memos before Saudi courts. Ahmed Alamrani created it.\nThe interface is available in Arabic, English, Urdu, Hindi, Punjabi, Sinhala, Bengali, Nepali, Filipino, Turkish, and Amharic. The exported text is Arabic.",
    "ایڈوانسڈ ای-لائیئر سعودی عدالتوں کے سامنے یادداشتیں بنانے کا پلیٹ فارم ہے۔ اسے احمد العمرانی نے بنایا۔\nانٹرفیس عربی، انگریزی، اردو، ہندی، پنجابی، سنہالا، بنگالی، نیپالی، فلپائنی، ترکی، اور امہاری میں ہے۔ برآمد شدہ متن عربی ہے۔",
    "उन्नत ई-वकील सऊदी अदालतों के समक्ष ज्ञापन लिखने का मंच है। इसे अहमद अल-उमरानी ने बनाया।\nइंटरफ़ेस अरबी, अंग्रेज़ी, उर्दू, हिन्दी, पंजाबी, सिंहली, बांग्ला, नेपाली, फिलिपीनो, तुर्की और अम्हारिक में है। निर्यातित पाठ अरबी है।",
    "ایڈوانسڈ ای-لائیئر سعودی عدالتاں دے سامنے یادداشتاں بنان دا پلیٹ فارم اے۔ احمد العمرانی نے اینوں بنایا۔\nانٹرفیس عربی، انگریزی، اردو، ہندی، پنجابی، سنہالا، بنگالی، نیپالی، فلپائنی، ترکی، تے امہاری وچ اے۔ برآمد شدہ متن عربی اے۔",
    "උසස් විද්‍යුත් නීතිඥ යනු සෞදි අධිකරණ ඉදිරියේ සටහන් සකසන වේදිකාවකි. නිර්මාණය අහමඩ් අලම්රානි.\nඅතුරුමුහුණත අරාබි, ඉංග්‍රීසි, උර්දු, හින්දි, පන්ජාබි, සිංහල, බෙංගාලි, නේපාල, ෆිලිපිනෝ, තුර්කි සහ අම්හාරික් වලින් ලැබේ. නිර්යාත පෙළ අරාබිය.",
    "উন্নত ই-আইনজীবী সৌদি আদালতের সামনে স্মারক লেখার মঞ্চ। তৈরি করেছেন আহমেদ আলামরানি।\nইন্টারফেস আরবি, ইংরেজি, উর্দু, হিন্দি, পাঞ্জাবি, সিংহলি, বাংলা, নেপালি, ফিলিপিনো, তুর্কি ও আমহারিকে। রপ্তানি করা পাঠ আরবি।",
    "उन्नत इ-वकिल साउदी अदालतअघि ज्ञापन लेख्ने मञ्च हो। अहमद अलअमरानीले बनाएका हुन्।\nइन्टरफेस अरबी, अङ्ग्रेजी, उर्दू, हिन्दी, पन्जाबी, सिंहली, बङ्गाली, नेपाली, फिलिपिनो, टर्की र अम्हारिकमा छ। निर्यातित पाठ अरबी हो।",
    "Ang Advanced E-Lawyer ay plataporma para sa memo sa harap ng mga hukuman ng Saudi. Ginawa ito ni Ahmed Alamrani.\nAvailable ang interface sa Arabe, Ingles, Urdu, Hindi, Punjabi, Sinhala, Bengali, Nepali, Filipino, Turko, at Amharic. Arabe ang iniluluwas na teksto.",
    "Gelişmiş E-Avukat, Suudi mahkemeleri önünde not hazırlama platformudur. Ahmed Alamrani kurdu.\nArayüz Arapça, İngilizce, Urduca, Hintçe, Pencapça, Sinhala, Bengalce, Nepalce, Filipince, Türkçe ve Amharca kullanılabilir. Dışa aktarılan metin Arapçadır.",
    "የላቀ ኢ-ጠበቃ በሳዑዲ ፍርድ ቤቶች ፊት ማስታወሻ ለመጻፍ መድረክ ነው። አህመድ አላምራኒ ሠርተውታል።\nመገናኛው በአረብኛ፣ እንግሊዝኛ፣ ኡርዱ፣ ሂንዲ፣ ፑንጃቢ፣ ሲንሃላ፣ ቤንጋሊ፣ ኔፓሊ፣ ፊሊፒኖ፣ ቱርክኛ እና አማርኛ ነው። የሚላከው ጽሑፍ አረብኛ ነው።",
  ),
  contactBody: L(
    "هذه الصفحة للوصول إلى مشغّل النشرة فقط. لا ترسل هنا وقائع قضية، ولا تُحفظ رسالة من هذه الصفحة في حساب.",
    "This page is only for reaching the operator of the deployment. Do not send case facts here. This page does not store a message on an account.",
    "یہ صفحہ صرف تنصیب کے آپریٹر تک پہنچنے کے لیے ہے۔ یہاں مقدمے کے حقائق نہ بھیجیں۔ یہ صفحہ اکاؤنٹ پر پیغام محفوظ نہیں کرتا۔",
    "यह पृष्ठ केवल स्थापना के संचालक तक पहुँचने के लिए है। यहाँ मामले के तथ्य न भेजें। यह पृष्ठ खाते पर संदेश सहेजता नहीं।",
    "اے صفحہ صرف تنصیب دے آپریٹر تک پہنچن لئی اے۔ ایتھے مقدمے دے حقائق نہ بھیجو۔ اے صفحہ اکاؤنٹ تے سنیہا محفوظ نہیں کردا۔",
    "මෙම පිටුව ස්ථාපනයේ ක්‍රියාකරු වෙත ළඟා වීමට පමණි. නඩු කරුණු මෙහි නොයවන්න. මෙය ගිණුමක පණිවිඩයක් නොසුරකියි.",
    "এই পাতা শুধু স্থাপনার পরিচালকের কাছে পৌঁছানোর জন্য। এখানে মামলার তথ্য পাঠাবেন না। এই পাতা অ্যাকাউন্টে বার্তা সেভ করে না।",
    "यो पृष्ठ स्थापनाको सञ्चालकसम्म पुग्न मात्र हो। यहाँ मुद्दाका तथ्य नपठाउनुहोस्। यो पृष्ठले खातामा सन्देश सुरक्षित गर्दैन।",
    "Ang pahinang ito ay para lamang maabot ang operator. Huwag magpadala rito ng mga katotohanan ng kaso. Hindi ito nagse-save ng mensahe sa isang account.",
    "Bu sayfa yalnızca kurulumun işletenine ulaşmak içindir. Buraya dava olgularını göndermeyin. Sayfa bir hesapta ileti saklamaz.",
    "ይህ ገጽ የጭነቱን ኦፕሬተር ለማግኘት ብቻ ነው። የጉዳይ እውነታዎችን እዚህ አይላኩ። ገጹ በአካውንት ላይ መልእክት አያስቀምጥም።",
  ),
  faqIntro: L(
    "أربع إجابات ثابتة عن طريقة عمل الصياغة. لا تُسحب من حسابات المستخدمين.",
    "Four fixed answers about how drafting works. They are not pulled from user accounts.",
    "صیاغت کے طریقے کے بارے میں چار مقرر جواب۔ یہ صارف کے اکاؤنٹ سے نہیں نکلتے۔",
    "मसौदे के तरीके पर चार स्थिर उत्तर। वे उपयोगकर्ता खातों से नहीं निकाले जाते।",
    "صیاغت دے طریقے بارے چار مقرر جواب۔ ایہ ورتن والے دے اکاؤنٹ توں نہیں نکلدے۔",
    "කෙටුම්පත් ක්‍රමය ගැන ස්ථාවර පිළිතුරු හතරක්. පරිශීලක ගිණුම්වලින් නොගැනේ.",
    "খসড়ার পদ্ধতি নিয়ে চারটি স্থির উত্তর। ব্যবহারকারীর অ্যাকাউন্ট থেকে তোলা নয়।",
    "मस्यौदाको तरिकाबारे चार स्थिर उत्तर। प्रयोगकर्ताका खाताबाट झिकिँदैनन्।",
    "Apat na nakapirming sagot kung paano gumagana ang pagbalangkas. Hindi ito kinukuha sa mga account.",
    "Taslağın nasıl çalıştığına dair dört sabit yanıt. Kullanıcı hesaplarından çekilmez.",
    "ረቂቁ እንዴት እንደሚሠራ አራት ቋሚ መልሶች። ከተጠቃሚ አካውንቶች አይወሰዱም።",
  ),
} as const;

const TOP_LABEL: Record<TopId, L10n> = {
  pricing: COPY.pricing,
  faq: COPY.faq,
  privacy: COPY.privacy,
  terms: COPY.terms,
  about: COPY.about,
  contact: COPY.contact,
  search: COPY.search,
};

const TOP_DESCRIPTION: Record<TopId, L10n> = {
  pricing: COPY.pricingDescription,
  faq: COPY.faqDescription,
  privacy: COPY.privacyDescription,
  terms: COPY.termsDescription,
  about: COPY.aboutDescription,
  contact: COPY.contactDescription,
  search: COPY.searchDescription,
};

const TOP_BODY: Record<Exclude<TopId, "search" | "faq" | "pricing">, L10n> = {
  privacy: COPY.privacyBody,
  terms: COPY.termsBody,
  about: COPY.aboutBody,
  contact: COPY.contactBody,
};

const MEMO_KEY: Record<DocId, string> = {
  lawsuit: "memos.lawsuit",
  defense: "memos.defense",
  reply: "memos.reply",
  objection: "memos.appeal",
};

export function brandName(locale: Locale): string {
  return translate(locale, "app.name");
}

export function docName(locale: Locale, id: DocId): string {
  return translate(locale, MEMO_KEY[id]);
}

export function courtName(locale: Locale, id: CourtType): string {
  return translate(locale, `courts.${id}`);
}

export interface PageCopy {
  title: string;
  description: string;
  h1: string;
  crumbs: Array<{ name: string; path: string }>;
}

export function pageCopy(locale: Locale, page: PageRef): PageCopy {
  const brand = brandName(locale);
  const home = { name: COPY.home[locale], path: pagePath(locale, { kind: "home" }) };
  if (page.kind === "home") {
    return {
      title: brand,
      description: COPY.homeDescription[locale],
      h1: translate(locale, "landing.heroTitle"),
      crumbs: [home],
    };
  }
  if (page.kind === "top") {
    const name = TOP_LABEL[page.id][locale];
    return {
      title: `${name} | ${brand}`,
      description: TOP_DESCRIPTION[page.id][locale],
      h1: name,
      crumbs: [home, { name, path: pagePath(locale, page) }],
    };
  }
  if (page.kind === "doc") {
    const name = docName(locale, page.id);
    const section = COPY.documents[locale];
    return {
      title: `${name} | ${section} | ${brand}`,
      description: fill(COPY.docDescription[locale], { name }),
      h1: name,
      crumbs: [
        home,
        { name: section, path: `${pagePath(locale, { kind: "home" })}#features` },
        { name, path: pagePath(locale, page) },
      ],
    };
  }
  const name = courtName(locale, page.id);
  const section = COPY.courts[locale];
  return {
    title: `${name} | ${section} | ${brand}`,
    description: fill(COPY.courtDescription[locale], { name }),
    h1: name,
    crumbs: [
      home,
      { name: section, path: `${pagePath(locale, { kind: "home" })}#courts` },
      { name, path: pagePath(locale, page) },
    ],
  };
}

export function pageBody(locale: Locale, page: PageRef): string[] {
  if (page.kind === "doc") return fill(COPY.docBody[locale], { name: docName(locale, page.id) }).split("\n");
  if (page.kind === "court") return fill(COPY.courtBody[locale], { name: courtName(locale, page.id) }).split("\n");
  if (page.kind === "top" && page.id === "pricing") return COPY.pricingBody[locale].split("\n");
  if (page.kind === "top" && page.id === "faq") return [COPY.faqIntro[locale]];
  if (page.kind === "top" && (page.id === "privacy" || page.id === "terms" || page.id === "about" || page.id === "contact")) {
    return TOP_BODY[page.id][locale].split("\n");
  }
  return [];
}

export function searchCatalog(locale: Locale, query: string): PageRef[] {
  const needle = query.toLocaleLowerCase(locale);
  return publicPages().filter((page) => {
    if (page.kind === "top" && page.id === "search") return false;
    if (!needle) return true;
    const copy = pageCopy(locale, page);
    return `${copy.title}\n${copy.description}\n${copy.h1}`.toLocaleLowerCase(locale).includes(needle);
  });
}

export function cleanQuery(value: string | undefined): string {
  return (value || "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 80);
}

export function localeCoverage(): string[] {
  const problems: string[] = [];
  for (const [group, table] of Object.entries(COPY)) {
    for (const locale of LOCALES) {
      const value = (table as L10n)[locale];
      if (!value || !value.trim() || /^TODO/i.test(value)) problems.push(`${group} ${locale}`);
    }
  }
  return problems;
}
