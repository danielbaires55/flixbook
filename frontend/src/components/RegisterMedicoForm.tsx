import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Container, Alert } from '@mui/material';
import axios from 'axios';

const API_URL = 'http://localhost:8080/api/medici';

const RegisterMedicoForm: React.FC = () => {
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    specializzazione: '',
    email: '',
    password: '',
    telefono: '', // Aggiunto il campo telefono
    biografia: '', // Aggiunto il campo biografia
  });

  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);

    try {
        // Modifica la richiesta Axios per inviare 'passwordHash'
        const response = await axios.post(`${API_URL}/register`, {
            nome: formData.nome,
            cognome: formData.cognome,
            specializzazione: formData.specializzazione,
            email: formData.email,
            // ATTENZIONE: CAMBIO QUI
            passwordHash: formData.password,
            telefono: formData.telefono,
            biografia: formData.biografia,
        });

        console.log('Medico registrato con successo:', response.data);
        // ...
    } catch (error) {
        console.error('Errore durante la registrazione del medico:', error);
        setMessage('Errore durante la registrazione del medico. Riprova.');
        setIsError(true);
        return;
    }
};

  return (
    <Container maxWidth="sm">
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          mt: 4,
          p: 3,
          border: '1px solid #ccc',
          borderRadius: '8px',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Registrazione Medico
        </Typography>
        {message && (
          <Alert severity={isError ? "error" : "success"}>
            {message}
          </Alert>
        )}
        <TextField
          label="Nome"
          name="nome"
          value={formData.nome}
          onChange={handleChange}
          required
        />
        <TextField
          label="Cognome"
          name="cognome"
          value={formData.cognome}
          onChange={handleChange}
          required
        />
        <TextField
          label="Specializzazione"
          name="specializzazione"
          value={formData.specializzazione}
          onChange={handleChange}
          required
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <TextField
          label="Telefono"
          name="telefono"
          value={formData.telefono}
          onChange={handleChange}
          required
        />
        <TextField
          label="Biografia"
          name="biografia"
          value={formData.biografia}
          onChange={handleChange}
          multiline
          rows={4}
          required
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          sx={{ mt: 2 }}
        >
          Registra
        </Button>
      </Box>
    </Container>
  );
};

export default RegisterMedicoForm;