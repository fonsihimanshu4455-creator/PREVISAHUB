import { getHero } from "@/lib/content";
import HeroForm from "./HeroForm";

export const dynamic = "force-dynamic";

export default async function HeroAdminPage() {
  const hero = await getHero();
  return <HeroForm initial={hero} />;
}
