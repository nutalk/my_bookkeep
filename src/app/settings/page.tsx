import { redirect } from "next/navigation";

const VALID_TABS = ["data", "ai", "theme"];

export default async function SettingsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  // 兼容旧的 /settings?tab=ai 深链接
  if (tab && VALID_TABS.includes(tab)) {
    redirect(`/settings/${tab}`);
  }
  redirect("/settings/data");
}
