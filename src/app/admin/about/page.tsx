import { getAbout } from "@/lib/content";
import AboutForm from "./AboutForm";

export const dynamic = "force-dynamic";

export default async function AboutAdminPage() {
  const about = await getAbout();
  return <AboutForm initial={about} />;
}
