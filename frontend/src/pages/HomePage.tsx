import NavBar from "../components/NavBar";
import HeroSection from "../components/HeroSection";
import MediciSection from "../components/MediciSection";
import SpecialitaSection from "../components/SpecialitaSection";
import Footer from "../components/Footer";
import "./HomePage.css";
import { useRef } from "react";

export default function HomePage() {
  // I tuoi riferimenti (corretti)
  const specialitaRef = useRef<HTMLDivElement>(null);
  const mediciRef = useRef<HTMLDivElement>(null);
  const contattiRef = useRef<HTMLDivElement>(null); // Lo attaccheremo al Footer


  // La tua funzione per scorrere (corretta)
  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
  <div className="homepage-container">
      {/* 1. Passiamo le funzioni alla NavBar come props */}
      <NavBar
        onSpecialitaClick={() => scrollToSection(specialitaRef)}
        onMediciClick={() => scrollToSection(mediciRef)}
        onContattiClick={() => scrollToSection(contattiRef)}
      />

      <main className="homepage-main">
        <HeroSection />

        {/* 2. Colleghiamo i ref alle sezioni corrispondenti avvolgendole in un div */}
        <div ref={specialitaRef}>
          <SpecialitaSection />
        </div>

        <div ref={mediciRef}>
          <MediciSection />
        </div>
      </main>

      <div ref={contattiRef}>
        <Footer />
      </div>
    </div>
  );
}
