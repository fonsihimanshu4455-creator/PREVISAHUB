import { getCountries } from "@/lib/content";
import CountriesEditor from "./CountriesEditor";

export const dynamic = "force-dynamic";

export default async function CountriesAdminPage() {
  const countries = await getCountries();
  return <CountriesEditor initial={countries} />;
}
