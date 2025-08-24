export interface Servizio {
  id: number;
  nome: string;
}

export interface Medico {
    id: number;
    nome: string;
    cognome: string;
    email: string;
    telefono: string;
    biografia: string;
}

export interface Disponibilita {
  id: number;
  medico: Medico;
  dataInizio: string;
  dataFine: string;
  attiva: boolean;
  prenotato: boolean; 
}

export interface Paziente {
  id: number;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
}

export interface Prestazione {
  id: number;
  nome: string;
}

export interface Appuntamento {
  id: number;
  paziente: Paziente;
  disponibilita: Disponibilita;
  dataEOraInizio: string;
  dataEOraFine: string;
  stato: 'confermato' | 'completato' | 'annullato';
  tipoAppuntamento: 'in presenza' | 'virtuale';
  linkVideocall?: string;
}