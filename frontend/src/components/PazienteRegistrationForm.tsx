import React, { useState } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

const PazienteRegistrationForm = () => {
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    email: '',
    password: '',
    telefono: '',
    dataNascita: '',
    indirizzo: '',
    citta: '',
    provincia: '',
    cap: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        'http://localhost:8080/api/pazienti/register',
        formData
      );
      console.log('Registrazione avvenuta con successo:', response.data);
      alert('Registrazione avvenuta con successo!');
    } catch (error) {
      console.error('Errore durante la registrazione:', error);
      alert('Errore durante la registrazione. Controlla la console per i dettagli.');
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card">
            <div className="card-body">
              <h2 className="card-title text-center mb-4">Registrazione Paziente</h2>
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="nome" className="form-label">Nome</label>
                    <input
                      type="text"
                      className="form-control"
                      id="nome"
                      name="nome"
                      required
                      value={formData.nome}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="cognome" className="form-label">Cognome</label>
                    <input
                      type="text"
                      className="form-control"
                      id="cognome"
                      name="cognome"
                      required
                      value={formData.cognome}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-12">
                    <label htmlFor="email" className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-12">
                    <label htmlFor="password" className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      id="password"
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-12">
                    <label htmlFor="telefono" className="form-label">Telefono</label>
                    <input
                      type="text"
                      className="form-control"
                      id="telefono"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-12">
                    <label htmlFor="dataNascita" className="form-label">Data di Nascita</label>
                    <input
                      type="date"
                      className="form-control"
                      id="dataNascita"
                      name="dataNascita"
                      value={formData.dataNascita}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-12">
                    <label htmlFor="indirizzo" className="form-label">Indirizzo</label>
                    <input
                      type="text"
                      className="form-control"
                      id="indirizzo"
                      name="indirizzo"
                      value={formData.indirizzo}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="citta" className="form-label">Città</label>
                    <input
                      type="text"
                      className="form-control"
                      id="citta"
                      name="citta"
                      value={formData.citta}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="provincia" className="form-label">Provincia</label>
                    <input
                      type="text"
                      className="form-control"
                      id="provincia"
                      name="provincia"
                      value={formData.provincia}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-12">
                    <label htmlFor="cap" className="form-label">CAP</label>
                    <input
                      type="text"
                      className="form-control"
                      id="cap"
                      name="cap"
                      value={formData.cap}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-12">
                    <button type="submit" className="btn btn-primary w-100">
                      Registrati
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PazienteRegistrationForm;