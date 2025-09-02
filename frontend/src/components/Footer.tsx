import "./css/Footer.css";

function Footer() {
  return (
    <footer className="footer-container">
      <div className="footer-top">
        <div className="footer-link-column">
          <h3 className="footer-section-title">Chi siamo</h3>
          <p className="footer-section-text">
            Alla Clinica Benessere ci prendiamo cura della salute a 360 gradi,
            con un approccio che unisce competenza medica e attenzione alla
            persona. Il nostro team di specialisti offre visite personalizzate,
            prevenzione e percorsi terapeutici studiati su misura, in un
            ambiente accogliente e moderno. La nostra missione è semplice:
            mettere il benessere del paziente al centro, garantendo
            professionalità, ascolto e tecnologie all’avanguardia.
          </p>
        </div>

        <div className="footer-contact-column">
          <h3 className="footer-section-title">Contatti</h3>
          <div className="footer-contact-info">
            <p className="footer-contact-item">Email: flixbook819@gmail.com</p>
            <p className="footer-contact-item">Telefono: +39 02 1234567</p>
            <p className="footer-contact-item">
              Sede principale: Via della Spiga, 10 - 20121 Milano (MI)
            </p>
          </div>
        </div>

        <div className="footer-link-column">
          <h3 className="footer-section-title">Privacy Policy</h3>
          <p className="footer-section-text">
            La tua privacy è fondamentale per noi. Trattiamo i tuoi dati con la
            massima cura e nel rispetto delle normative vigenti (GDPR), usandoli
            solo per gestire le tue prenotazioni e i promemoria. Non cediamo i
            tuoi dati a terzi. Per saperne di più, leggi la nostra{" "}
            <span className="footer-privacy-link">
              Informativa sulla Privacy completa
            </span>
            .
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-copyright">
          © 2025 FlixBook. Tutti i diritti riservati.
        </p>
    <p className="footer-powered-by">Powered by <strong>Flixbook</strong></p>
      </div>
    </footer>
  );
}

export default Footer;
