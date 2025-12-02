'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';

// Same input style as My Profile & Create Profile
const inputSx = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-primary)',
    borderRadius: '8px',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.15)',
  },
  '& .MuiOutlinedInput-input': {
    color: 'var(--color-primary)',
  },
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Optional safety: make sure we actually have a user/session
      if (!data?.user) {
        throw new Error('Login succeeded but no user returned.');
      }

      // ✅ Successful login → send to /profile
      router.push('/profile');
      router.refresh();
    } catch (err) {
      setErrorMsg(err?.message || 'Unable to log in. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      sx={{
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-tertiary)',
        borderRadius: '16px',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.25)',
        maxWidth: 560,
        width: '92vw',
        mx: 'auto',
        mt: 6,
        p: 3,
      }}
    >
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ fontWeight: 700, textAlign: 'center', mb: 2 }}
      >
        Log In
      </Typography>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      <Box component="form" onSubmit={handleLogin} noValidate>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          required
          autoComplete="email"
          margin="normal"
          sx={inputSx}
        />

        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          required
          autoComplete="current-password"
          margin="normal"
          sx={inputSx}
        />

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting}
            sx={{
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-primary)',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.15)',
              '&:hover': {
                backgroundColor: 'var(--color-bg)',
                opacity: 0.9,
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
              },
            }}
          >
            {submitting ? (
              <>
                <CircularProgress size={22} sx={{ mr: 1 }} />
                Logging in…
              </>
            ) : (
              'Log In'
            )}
          </Button>
        </Box>

        <Typography variant="body2" sx={{ mt: 3, textAlign: 'center' }}>
          Don&apos;t have an account?{' '}
          <Link
            href="/create-profile"
            style={{
              textDecoration: 'underline',
              color: 'var(--color-tertiary)',
              fontWeight: 600,
            }}
          >
            Create Profile
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}
