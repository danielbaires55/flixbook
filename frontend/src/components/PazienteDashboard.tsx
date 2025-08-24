// src/components/PazienteDashboard.tsx

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { useAuth } from "../context/useAuth";

// --- Interfacce per i dati ---
interface Medico {
  id: number;
  nome: string;
  cognome: string;
}
interface Prestazione {
  id: number;
  nome: string;
  costo: number;
}
interface Disponibilita {
  id: number;
  data: string;
  oraInizio: string;
  oraFine: string;
  medico: Medico;
  prestazione: Prestazione;
}
interface Appuntamento {
  id: number;
  dataEOraInizio: string;
  dataEOraFine: string;
  stato: "CONFERMATO" | "COMPLETATO" | "ANNULLATO";
  tipoAppuntamento: "virtuale" | "fisico";
  disponibilita: Disponibilita;
  linkVideocall?: string;
}
interface PazienteProfile {
  nome: string;
  cognome: string;
  email: string;
}

const API_BASE_URL = "http://localhost:8080/api";

const PazienteDashboard = () => {
  const { user } = useAuth();

  const [profile, setProfile] = useState<PazienteProfile | null>(null);
  const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchAllData = async () => {
      setLoading(true);
      const headers = { Authorization: `Bearer ${user.token}` };

      try {
        const [profileResponse, appuntamentiResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/pazienti/profile`, { headers }),
          axios.get(`${API_BASE_URL}/appuntamenti/paziente`, { headers }),
        ]);

        setProfile(profileResponse.data);
        setAppuntamenti(appuntamentiResponse.data);
      } catch (err) {
        console.error("Errore nel recupero dei dati:", err);
        setError("Impossibile caricare i dati. Riprova più tardi.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [user]);

  const handleAnnulla = async (appuntamentoId: number) => {
    if (
      !window.confirm("Sei sicuro di voler annullare questo appuntamento?") ||
      !user
    ) {
      return;
    }

    try {
      await axios.put(
        `${API_BASE_URL}/appuntamenti/annulla/${appuntamentoId}`,
        null,
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );
      alert("Appuntamento annullato con successo!");

      setAppuntamenti((prev) =>
        prev.map((app) =>
          app.id === appuntamentoId ? { ...app, stato: "ANNULLATO" } : app
        )
      );
    } catch (err) {
      console.error("Errore nell'annullamento dell'appuntamento", err);
      alert("Si è verificato un errore durante l'annullamento. Riprova.");
    }
  };

  if (loading)
    return (
      <div className="text-center mt-5">
        <h3>Caricamento in corso...</h3>
      </div>
    );
  if (error) return <div className="alert alert-danger mt-5">{error}</div>;

  return (
    <div className="container mt-5">
      <h1 className="text-center mb-4">La Tua Area Personale</h1>
      <div className="row">
        <div className="col-lg-5 mb-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h4 className="card-title text-center">Le tue informazioni</h4>
              {profile ? (
                <ul className="list-group list-group-flush text-start mt-3">
                  <li className="list-group-item">
                    <strong>Nome:</strong> {profile.nome}
                  </li>
                  <li className="list-group-item">
                    <strong>Cognome:</strong> {profile.cognome}
                  </li>
                  <li className="list-group-item">
                    <strong>Email:</strong> {profile.email}
                  </li>
                </ul>
              ) : (
                <p>Informazioni non disponibili.</p>
              )}
              <div className="mt-4 text-center">
                <Link to="/book" className="btn btn-primary">
                  Prenota un Nuovo Appuntamento
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-7 mb-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h4 className="card-title text-center">I tuoi appuntamenti</h4>
              {appuntamenti.length > 0 ? (
                <ul className="list-group list-group-flush mt-3">
                  {appuntamenti.map((app) => (
                    <li key={app.id} className="list-group-item">
                      <div>
                        <strong>
                          {new Date(app.dataEOraInizio).toLocaleDateString(
                            "it-IT",
                            {
                              /*...*/
                            }
                          )}
                        </strong>{" "}
                        alle{" "}
                        <strong>
                          {new Date(app.dataEOraInizio).toLocaleTimeString([], {
                            /*...*/
                          })}
                        </strong>
                        {/* ============================================================= */}
                        {/* == AGGIUNGI QUESTO CONTROLLO PER EVITARE IL CRASH           == */}
                        {/* ============================================================= */}
                        {app.disponibilita ? (
                          <>
                            <br />
                            <small className="text-muted">
                              Dr. {app.disponibilita.medico.nome}{" "}
                              {app.disponibilita.medico.cognome}
                            </small>
                            <br />
                            <small className="text-muted">
                              Prestazione: {app.disponibilita.prestazione.nome}{" "}
                              ({app.disponibilita.prestazione.costo}€)
                            </small>
                          </>
                        ) : (
                          <>
                            <br />
                            <small className="text-muted">
                              Dettagli non più disponibili per appuntamento
                              annullato.
                            </small>
                          </>
                        )}
                        {/* ============================================================= */}
                        <br />
                        <span
                          className={`badge text-capitalize ${
                            app.stato === "CONFERMATO"
                              ? "bg-success"
                              : app.stato === "COMPLETATO"
                              ? "bg-secondary"
                              : "bg-danger"
                          }`}
                        >
                          {app.stato.toLowerCase()}
                        </span>
                      </div>
                      <div className="mt-2 d-flex gap-2">
                        {app.tipoAppuntamento === "virtuale" &&
                          app.stato === "CONFERMATO" &&
                          app.linkVideocall && (
                            <a
                              href={app.linkVideocall}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm btn-info"
                            >
                              Vai alla Videocall
                            </a>
                          )}
                        {app.stato === "CONFERMATO" && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleAnnulla(app.id)}
                          >
                            Annulla
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="alert alert-info text-center mt-3">
                  Nessun appuntamento in programma.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PazienteDashboard;
