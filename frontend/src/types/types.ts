export interface Servizio {
  id: number;
  nome: string;
}

export interface Medico {
  id: number;
  nome: string;
  cognome: string;
  
}

export interface Disponibilita {
  id: number;
  medico: Medico;
  dataInizio: string;
  dataFine: string;
  attiva: boolean;
}