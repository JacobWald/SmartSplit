'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import {
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Box,
  CircularProgress,
} from '@mui/material';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  async function handleAuth(e) {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message || 'Unable to log in. Please try again.');
      } else {
        setInfoMsg('Logged in successfully!');
        // optional redirect
        // window.location.href = '/profile';
      }
    } catch (err) {
      setErrorMsg('Unexpected error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
      <Card elevation={3} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ fontWeight: 700, textAlign: 'center', mb: 3 }}
          >
            Log In
          </Typography>

          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMsg}
            </Alert>
          )}
          {infoMsg && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {infoMsg}
            </Alert>
          )}

          <Box component="form" onSubmit={handleAuth} noValidate>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              margin="normal"
              autoComplete="email"
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              margin="normal"
              autoComplete="current-password"
            />

            {/* Centered login button */}
            <Box
              sx={{
                mt: 4,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <CircularProgress size={22} sx={{ mr: 1 }} />
                    Logging In…
                  </>
                ) : (
                  'Log In'
                )}
              </Button>
            </Box>
          </Box>

          {/* Line for account creation */}
          <Typography
            variant="body1"
            sx={{
              mt: 4,
              textAlign: 'center',
            }}
          >
            Don’t have a profile?{' '}
            <Link
              href="/create-profile"
              style={{
                textDecoration: 'none',
                color: '#1976d2',
                fontWeight: 600,
              }}
            >
              Create one now
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}
