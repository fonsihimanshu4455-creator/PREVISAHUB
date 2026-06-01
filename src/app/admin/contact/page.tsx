import { getContact } from "@/lib/content";
import ContactForm from "./ContactForm";

export const dynamic = "force-dynamic";

export default async function ContactAdminPage() {
  const contact = await getContact();
  return <ContactForm initial={contact} />;
}
