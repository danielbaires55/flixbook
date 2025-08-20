import NavBar from "../components/NavBar";
import HeroSection from "../components/HeroSection";
import MediciSection from "../components/MediciSection";
import SpecialitaSection from "../components/SpecialitaSection";
import Footer from "../components/Footer";
import "./HomePage.css";

export default function HomePage() {
    return (
        <div className="homepage-container">
            <NavBar />
            <main className="homepage-main">
                <HeroSection />
                <MediciSection />
                <SpecialitaSection />
            </main>
            <Footer />
        </div>
    );
}
