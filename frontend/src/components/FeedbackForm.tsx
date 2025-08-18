import React, { useState } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Rating,
  Stack,
  Alert,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:8080/api';

const FeedbackForm = () => {
  const { appuntamentoId } = useParams<{ appuntamentoId: string }>();
  const [valutazione, setValutazione] = useState<number | null>(null);
  const [commento, setCommento] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const token = localStorage.getItem('jwtToken');
    if (!token) {
      setError('Devi essere loggato per lasciare un feedback.');
      return;
    }

    if (!valutazione) {
      setError('Seleziona una valutazione da 1 a 5.');
      return;
    }

    try {
      const payload = {
        appuntamentoId: parseInt(appuntamentoId ?? ''),
        valutazione,
        commento,
      };

      await axios.post(`${API_BASE_URL}/feedback/submit`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess('Feedback inviato con successo! Grazie per la tua opinione.');
      navigate('/paziente-dashboard');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data || 'Errore nell\'invio del feedback.');
      } else {
        setError('Errore di rete. Controlla la tua connessione.');
      }
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Lascia un Feedback
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 3 }}>
          <Stack spacing={2}>
            <Typography component="legend">Valutazione</Typography>
            <Rating
              name="valutazione"
              value={valutazione}
              onChange={(e, newValue) => {
                setValutazione(newValue);
              }}
              precision={1}
              size="large"
            />
            <TextField
              name="commento"
              label="Commento (Opzionale)"
              multiline
              rows={4}
              fullWidth
              value={commento}
              onChange={(e) => setCommento(e.target.value)}
            />
          </Stack>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {success}
            </Alert>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Invia Feedback
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default FeedbackForm;