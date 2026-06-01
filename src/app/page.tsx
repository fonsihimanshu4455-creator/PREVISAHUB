import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Countries from "@/components/Countries";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import FloatingCTA from "@/components/FloatingCTA";
import { getAllContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function Home() {
  const content = await getAllContent();

  return (
    <main>
      <Navbar contact={content.contact} />
      <Hero hero={content.hero} />
      <Services services={content.services} />
      <Countries countries={content.countries} />
      <About about={content.about} />
      <Contact contact={content.contact} />
      <Footer contact={content.contact} />
      <FloatingCTA contact={content.contact} />
    </main>
  );
}
