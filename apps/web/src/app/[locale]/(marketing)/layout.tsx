import { translate } from "@elawyer/i18n";
import { AnalyticsBar } from "@/components/analytics-bar";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AnalyticsBar title={translate("ar", "security.title")} action={translate("ar", "common.back")} />
    </>
  );
}
