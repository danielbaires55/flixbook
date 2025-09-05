import { useState, type FC } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { Card, Form, Row, Col, Button, Alert, FloatingLabel, Spinner, ProgressBar, InputGroup } from "react-bootstrap";
import "./css/RegisterForm.css";
import { API_BASE_URL } from "../config/api";

const PazienteRegistrationForm: FC = () => {
  const [formData, setFormData] = useState({
    nome: "",
    cognome: "",
    email: "",
    passwordHash: "",
    telefono: "",
    dataNascita: "",
  codiceFiscale: "",
    indirizzo: "",
    citta: "",
    provincia: "",
    cap: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

  // Password strength helper (non-bloccante)
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (!pwd) return { score: 0, label: 'Debole', variant: 'danger' as const };
    const lengthBonus = Math.min(6, Math.floor(pwd.length / 2)); // up to 6
    const hasLower = /[a-z]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasDigit = /\d/.test(pwd);
    const hasSymbol = /[^\w\s]/.test(pwd);
    score = lengthBonus + [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length * 2; // max ~14
    const pct = Math.min(100, Math.round((score / 14) * 100));
    const label = pct < 40 ? 'Debole' : pct < 75 ? 'Media' : 'Forte';
    const variant = pct < 40 ? 'danger' : pct < 75 ? 'warning' : 'success';
    return { score: pct, label, variant };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'codiceFiscale') {
      setFormData({ ...formData, codiceFiscale: value.toUpperCase() });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    // live-validate if field already touched
    if (touched[name]) {
      const errs = validate({ ...formData, [name]: name === 'codiceFiscale' ? value.toUpperCase() : value });
      setFieldErrors(errs);
    }
  };

  const handleConfirmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (touched.confirmPassword) {
      const errs = validate(formData, e.target.value);
      setFieldErrors(errs);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const errs = validate(formData);
    setFieldErrors(errs);
  };

  const isEmail = (v: string) => /.+@.+\..+/.test(v.trim());
  const isPhone = (v: string) => {
    const digits = (v || '').replace(/\D/g, '');
    return digits.length === 0 || digits.length >= 7; // optional field; if provided min 7 digits
  };
  const isCAP = (v: string) => v.trim() === '' || /^\d{5}$/.test(v.trim());
  const isFuture = (iso: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    const today = new Date();
    today.setHours(0,0,0,0);
    return d.getTime() > today.getTime();
  };

  const validate = (fd: typeof formData, confirmVal: string = confirmPassword) => {
    const errs: Record<string, string | null> = {};
    // required
    if (!fd.nome.trim()) errs.nome = 'Il nome è obbligatorio';
    if (!fd.cognome.trim()) errs.cognome = 'Il cognome è obbligatorio';
    if (!fd.email.trim()) errs.email = 'L\'email è obbligatoria';
    if (!fd.passwordHash.trim()) errs.passwordHash = 'La password è obbligatoria';
    if (!confirmVal.trim()) errs.confirmPassword = 'Conferma password obbligatoria';
    if (!fd.codiceFiscale.trim()) errs.codiceFiscale = 'Il Codice Fiscale è obbligatorio';
    // formats
    if (fd.email && !isEmail(fd.email)) errs.email = 'Inserisci un\'email valida';
    const cf = (fd.codiceFiscale || '').trim().toUpperCase();
    if (cf && !/^[A-Z0-9]{16}$/.test(cf)) errs.codiceFiscale = 'CF non valido (16 caratteri)';
    if (!isPhone(fd.telefono)) errs.telefono = 'Telefono non valido (min 7 cifre)';
    if (!isCAP(fd.cap)) errs.cap = 'CAP non valido (5 cifre)';
    if (isFuture(fd.dataNascita)) errs.dataNascita = 'La data non può essere futura';
    if (fd.passwordHash && confirmVal && fd.passwordHash !== confirmVal) errs.confirmPassword = 'Le password non coincidono';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // compute validation for all fields
  const errs = validate(formData);
    setFieldErrors(errs);
  setTouched({ nome: true, cognome: true, email: true, passwordHash: true, confirmPassword: true, telefono: true, dataNascita: true, codiceFiscale: true, indirizzo: true, citta: true, provincia: true, cap: true });
    const hasErr = Object.values(errs).some(Boolean);
    if (hasErr) return;

    // Validazione Codice Fiscale (16 caratteri alfanumerici)
    const cf = (formData.codiceFiscale || '').trim().toUpperCase();
    const cfOk = /^[A-Z0-9]{16}$/.test(cf);
    if (!cfOk) {
      setError('Inserisci un Codice Fiscale valido (16 caratteri alfanumerici).');
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(`${API_BASE_URL}/pazienti/register`, { ...formData, codiceFiscale: cf });
      setSuccess('Registrazione completata. Verrai reindirizzato al login.');
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setError("Questa email è già in uso.");
      } else {
  setError('Impossibile completare la registrazione. Riprova.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8 col-xl-6">
          <Card className="shadow-sm border-0 rounded-4">
            <Card.Body className="p-4 p-md-5">
              <div className="text-center mb-4">
                <h2 className="mb-1">Crea account paziente</h2>
                <p className="text-muted small mb-0">Compila i campi per registrarti</p>
              </div>

              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <Form onSubmit={handleSubmit} noValidate>
                <Row className="g-3">
                  {/* Nome / Cognome */}
                  <Col md={6}>
                    <FloatingLabel controlId="nome" label="Nome">
                      <Form.Control type="text" name="nome" value={formData.nome} onChange={handleChange} onBlur={handleBlur} placeholder=" " required isInvalid={!!fieldErrors.nome && touched.nome} disabled={submitting} />
                      <Form.Control.Feedback type="invalid">{fieldErrors.nome}</Form.Control.Feedback>
                    </FloatingLabel>
                  </Col>
                  <Col md={6}>
                    <FloatingLabel controlId="cognome" label="Cognome">
                      <Form.Control type="text" name="cognome" value={formData.cognome} onChange={handleChange} onBlur={handleBlur} placeholder=" " required isInvalid={!!fieldErrors.cognome && touched.cognome} disabled={submitting} />
                      <Form.Control.Feedback type="invalid">{fieldErrors.cognome}</Form.Control.Feedback>
                    </FloatingLabel>
                  </Col>

                  {/* Email / Telefono */}
                  <Col md={6}>
                    <FloatingLabel controlId="email" label="Email">
                      <Form.Control type="email" name="email" value={formData.email} onChange={handleChange} onBlur={handleBlur} placeholder="mario.rossi@example.com" required isInvalid={!!fieldErrors.email && touched.email} disabled={submitting} />
                      <Form.Control.Feedback type="invalid">{fieldErrors.email}</Form.Control.Feedback>
                    </FloatingLabel>
                  </Col>
                  <Col md={6}>
                    <FloatingLabel controlId="telefono" label="Telefono">
                      <Form.Control type="tel" name="telefono" value={formData.telefono} onChange={handleChange} onBlur={handleBlur} placeholder="+39 333 1234567" isInvalid={!!fieldErrors.telefono && touched.telefono} disabled={submitting} />
                      <Form.Control.Feedback type="invalid">{fieldErrors.telefono}</Form.Control.Feedback>
                    </FloatingLabel>
                  </Col>

                  {/* Password / Conferma password */}
                  <Col md={6}>
                    <Form.Group controlId="passwordHash">
                      <Form.Label>Password</Form.Label>
                      <InputGroup hasValidation>
                        <Form.Control
                          type={showPassword ? 'text' : 'password'}
                          name="passwordHash"
                          value={formData.passwordHash}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="Min 8 caratteri"
                          required
                          isInvalid={!!fieldErrors.passwordHash && touched.passwordHash}
                          disabled={submitting}
                        />
                        <Button
                          variant="outline-secondary"
                          type="button"
                          onClick={() => setShowPassword(s => !s)}
                          aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                          disabled={submitting}
                        >
                          {showPassword ? 'Nascondi' : 'Mostra'}
                        </Button>
                        <Form.Control.Feedback type="invalid">{fieldErrors.passwordHash}</Form.Control.Feedback>
                      </InputGroup>
                      {(() => { const m = getPasswordStrength(formData.passwordHash); return (
                        <div className="mt-2">
                          <div className="d-flex justify-content-between small mb-1"><span>Forza password</span><span>{m.label}</span></div>
                          <ProgressBar now={m.score} variant={m.variant} style={{ height: 6 }} visuallyHidden />
                        </div>
                      ); })()}
                      <Form.Text className="text-muted small">
                        Suggerimenti: almeno 8 caratteri, usa maiuscole/minuscole, numeri e simboli.
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group controlId="confirmPassword">
                      <Form.Label>Conferma password</Form.Label>
                      <InputGroup hasValidation>
                        <Form.Control
                          type={showConfirm ? 'text' : 'password'}
                          name="confirmPassword"
                          value={confirmPassword}
                          onChange={handleConfirmChange}
                          onBlur={() => { setTouched(prev => ({ ...prev, confirmPassword: true })); setFieldErrors(validate(formData)); }}
                          placeholder="Ripeti password"
                          required
                          isInvalid={!!fieldErrors.confirmPassword && touched.confirmPassword}
                          disabled={submitting}
                        />
                        <Button
                          variant="outline-secondary"
                          type="button"
                          onClick={() => setShowConfirm(s => !s)}
                          aria-label={showConfirm ? 'Nascondi conferma password' : 'Mostra conferma password'}
                          disabled={submitting}
                        >
                          {showConfirm ? 'Nascondi' : 'Mostra'}
                        </Button>
                        <Form.Control.Feedback type="invalid">{fieldErrors.confirmPassword}</Form.Control.Feedback>
                      </InputGroup>
                    </Form.Group>
                  </Col>

                  {/* Data nascita / Codice Fiscale */}
                  <Col md={6}>
                    <Form.Group controlId="dataNascita">
                      <Form.Label>Data di nascita</Form.Label>
                      <Form.Control type="date" name="dataNascita" value={formData.dataNascita} onChange={handleChange} onBlur={handleBlur} isInvalid={!!fieldErrors.dataNascita && touched.dataNascita} disabled={submitting} />
                      <Form.Control.Feedback type="invalid">{fieldErrors.dataNascita}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group controlId="codiceFiscale">
                      <Form.Label>Codice Fiscale</Form.Label>
                      <Form.Control type="text" name="codiceFiscale" value={formData.codiceFiscale} onChange={handleChange} onBlur={handleBlur} placeholder="RSSMRA85M01H501Z" maxLength={16} required className="text-uppercase" isInvalid={!!fieldErrors.codiceFiscale && touched.codiceFiscale} disabled={submitting} />
                      <Form.Control.Feedback type="invalid">{fieldErrors.codiceFiscale}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  {/* Indirizzo */}
                  <Col xs={12}>
                    <FloatingLabel controlId="indirizzo" label="Indirizzo">
                      <Form.Control type="text" name="indirizzo" value={formData.indirizzo} onChange={handleChange} onBlur={handleBlur} placeholder="Via Roma 1" disabled={submitting} />
                    </FloatingLabel>
                  </Col>

                  {/* Città / Provincia / CAP */}
                  <Col md={5}>
                    <FloatingLabel controlId="citta" label="Città">
                      <Form.Control type="text" name="citta" value={formData.citta} onChange={handleChange} onBlur={handleBlur} placeholder="Milano" disabled={submitting} />
                    </FloatingLabel>
                  </Col>
                  <Col md={4}>
                    <FloatingLabel controlId="provincia" label="Provincia">
                      <Form.Control type="text" name="provincia" value={formData.provincia} onChange={handleChange} onBlur={handleBlur} placeholder="MI" disabled={submitting} />
                    </FloatingLabel>
                  </Col>
                  <Col md={3}>
                    <FloatingLabel controlId="cap" label="CAP">
                      <Form.Control type="text" name="cap" value={formData.cap} onChange={handleChange} onBlur={handleBlur} placeholder="20100" isInvalid={!!fieldErrors.cap && touched.cap} disabled={submitting} />
                      <Form.Control.Feedback type="invalid">{fieldErrors.cap}</Form.Control.Feedback>
                    </FloatingLabel>
                  </Col>
                </Row>

                <div className="d-flex justify-content-center mt-4">
                  <Button type="submit" variant="primary" disabled={submitting} className="px-4">
                    {submitting && <Spinner animation="border" size="sm" className="me-2" />} Crea account
                  </Button>
                </div>

                <div className="text-center mt-3">
                  <small>Hai già un account? <Link to="/login">Accedi</Link></small>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PazienteRegistrationForm;
