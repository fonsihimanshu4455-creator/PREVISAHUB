import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Countries from "@/components/Countries";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import FloatingCTA from "@/components/FloatingCTA";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Services />
      <Countries />
      <About />
      <Contact />
      <Footer />
      <FloatingCTA />
    </main>
  );
}
