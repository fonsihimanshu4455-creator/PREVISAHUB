import { getServices } from "@/lib/content";
import ServicesEditor from "./ServicesEditor";

export const dynamic = "force-dynamic";

export default async function ServicesAdminPage() {
  const services = await getServices();
  return <ServicesEditor initial={services} />;
}
