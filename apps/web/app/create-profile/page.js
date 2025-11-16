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
  Grid,
} from '@mui/material';

function normalizeUsername(raw) {
  return (raw || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
}

// Same input style as My Profile page
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

export default function CreateProfilePage() {
  const router = useRouter();

  // Auth fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Profile fields (for metadata)
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState(''); // unique handle
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setSubmitting(true);

    const normalized = normalizeUsername(username);

    // Client-side checks
    if (!email || !password || !fullName || !normalized) {
      setErrorMsg('Please fill in Full Name, Username, Email, and Password.');
      setSubmitting(false);
      return;
    }
    if (normalized.length < 3) {
      setErrorMsg(
        'Username must be at least 3 characters (letters, numbers, underscore).'
      );
      setSubmitting(false);
      return;
    }

    try {
      // 1) Create auth user + store username in user_metadata
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
            avatar_url: avatarUrl || null,
            username: normalized,
          },
        },
      });

      if (signUpError) throw signUpError;

      const hasSession = !!signUpData.session;

      // If email confirmation is required, Supabase won't give us a session here
      if (!hasSession) {
        setInfoMsg(
          'Account created! Check your email to confirm. After confirming, log in – your profile (including username) will be set up automatically.'
        );
        return;
      }

      // If we *do* have a session, we can send them straight to /profile.
      // The Profile page will create/update the row in public.profiles using RLS.
      setInfoMsg('Account created! Redirecting to your profile…');
      setTimeout(() => router.push('/profile'), 800);
    } catch (err) {
      console.error('Create profile error:', err);
      setErrorMsg(
        err?.message || 'Unable to create your profile. Please try again.'
      );
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
        Create Profile
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

      <Box component="form" onSubmit={handleCreate} noValidate>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              fullWidth
              required
              autoComplete="name"
              sx={inputSx}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Username"
              placeholder="e.g., rakan_a"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              required
              helperText="Letters, numbers, underscore; 3+ chars."
              inputProps={{ pattern: '[A-Za-z0-9_]{3,}' }}
              sx={inputSx}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              fullWidth
              autoComplete="tel"
              sx={inputSx}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Avatar URL (optional)"
              placeholder="https://…"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              fullWidth
              autoComplete="off"
              sx={inputSx}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              autoComplete="email"
              sx={inputSx}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              autoComplete="new-password"
              sx={inputSx}
            />
          </Grid>
        </Grid>

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
                Creating…
              </>
            ) : (
              'Create Profile'
            )}
          </Button>
        </Box>

        <Typography variant="body2" sx={{ mt: 3, textAlign: 'center' }}>
          Already have an account?{' '}
          <Link
            href="/login"
            style={{
              textDecoration: 'underline',
              color: 'var(--color-tertiary)',
              fontWeight: 600,
            }}
          >
            Log In
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}
