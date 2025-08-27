import './css/Footer.css';
import logoImage from '../assets/logo-notext.png';

function Footer() {
  return (
    <footer className="footer-container">
      <div className="footer-top">
        <div className="footer-logo-container">
          <img 
            className="footer-logo" 
            src={logoImage} 
            alt="FlixBook Logo" 
          />
        </div>
        
        <div className="footer-link-column about">
          <div className="footer-column-title">Chi siamo</div>
          <div className="footer-link">Link 1</div>
          <div className="footer-link">Link 2</div>
          <div className="footer-link">Link 3</div>
        </div>
        
        <div className="footer-link-column contact">
          <div className="footer-column-title">Contatti</div>
          <div className="footer-link">Link 1</div>
          <div className="footer-link">Link 2</div>
          <div className="footer-link">Link 3</div>
        </div>
        
        <div className="footer-link-column privacy">
          <div className="footer-column-title">Privacy Policy</div>
          <div className="footer-link">Link 1</div>
          <div className="footer-link">Link 2</div>
          <div className="footer-link">Link 3</div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <div className="footer-copyright">
          © 2025 FlixBook. Tutti i diritti riservati.
        </div>
        
  <div className="footer-social-icons">
          <div className="footer-social-icon"></div>
          <div className="footer-social-icon"></div>
          <div className="footer-social-icon"></div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
