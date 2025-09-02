import React, { useState } from 'react';
import axios from 'axios';
import { Container, Typography, Box, TextField, Button, Rating, Stack, Alert } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth'; // 1. Importa il nostro hook

import { API_BASE_URL } from '../config/api';

const FeedbackForm = () => {
    const { appuntamentoId } = useParams<{ appuntamentoId: string }>();
    const { user } = useAuth(); // 2. Ottieni l'utente dal contesto
    const navigate = useNavigate();
    
    const [valutazione, setValutazione] = useState<number | null>(5);
    const [commento, setCommento] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        // 3. Controlla l'utente tramite il contesto
        if (!user) {
            setError('Devi essere loggato per lasciare un feedback.');
            return;
        }

        if (!valutazione) {
            setError('Seleziona una valutazione da 1 a 5.');
            return;
        }

        try {
            const payload = {
                appuntamentoId: parseInt(appuntamentoId ?? '0'),
                valutazione,
                commento,
            };

            await axios.post(`${API_BASE_URL}/feedback/submit`, payload, {
                headers: { Authorization: `Bearer ${user.token}` }, // 4. Usa il token dal contesto
            });

            setSuccess('Feedback inviato con successo! Grazie. Sarai reindirizzato alla tua dashboard.');
            
            // 5. Reindirizza alla dashboard dopo aver mostrato il messaggio di successo
            setTimeout(() => {
                navigate('/paziente-dashboard');
            }, 2500);

        } catch (err) {
            if (axios.isAxiosError(err) && err.response) {
                setError(err.response.data.message || err.response.data || 'Errore nell\'invio del feedback.');
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
                    <Stack spacing={2} alignItems="center">
                        <Typography component="legend">Valutazione Complessiva</Typography>
                        <Rating
                            name="valutazione"
                            value={valutazione}
                            onChange={(_event, newValue: number | null) => {
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
                        <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
                            {error}
                        </Alert>
                    )}
                    {success && (
                        <Alert severity="success" sx={{ mt: 2, width: '100%' }}>
                            {success}
                        </Alert>
                    )}
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={!!success} // Disabilita il pulsante dopo l'invio
                    >
                        Invia Feedback
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default FeedbackForm;