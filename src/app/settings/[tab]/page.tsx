import { redirect } from "next/navigation";
import SettingsClient from "../SettingsClient";

const VALID_TABS = ["data", "ai", "theme"] as const;
type Section = (typeof VALID_TABS)[number];

export default async function SettingsTabPage({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  if (!VALID_TABS.includes(tab as Section)) {
    redirect("/settings/data");
  }
  return <SettingsClient section={tab as Section} />;
}
