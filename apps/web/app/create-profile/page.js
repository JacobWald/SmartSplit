'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Grid,
} from '@mui/material';

function normalizeUsername(raw) {
  return (raw || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export default function CreateProfilePage() {
  const router = useRouter();

  // Auth fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Profile fields
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
      setErrorMsg('Username must be at least 3 characters (letters, numbers, underscore).');
      setSubmitting(false);
      return;
    }

    try {
      // 1) Create auth user (may require email confirmation depending on your Supabase Auth settings)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }, // user_metadata
      });
      if (signUpError) throw signUpError;

      // 2) If your project requires email confirmation, there will be NO session yet.
      //    With RLS, anonymous inserts are blocked. So don't upsert now; wait until user logs in.
      if (!signUpData.session) {
        setInfoMsg(
          'Check your email to confirm your account. After confirming, please log in — we’ll finish creating your profile automatically.'
        );
        return;
      }

      // 3) Session exists (email confirmation OFF) → safe to upsert now
      const userId = signUpData.user?.id;
      if (!userId) {
        setErrorMsg('Could not read new user id. Please try logging in.');
        return;
      }

      // Upsert WITHOUT the "email" column to avoid schema mismatch errors
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: fullName,
        username: normalized,
        phone: phone || null,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      });

      // Handle unique-username errors nicely (Postgres code 23505)
      if (profileError) {
        if (profileError.code === '23505') {
          setErrorMsg('That username is taken. Please choose another.');
        } else {
          setErrorMsg(profileError.message || 'Unable to create your profile.');
        }
        return;
      }

      setInfoMsg('Account created! Redirecting to your profile…');
      setTimeout(() => router.push('/profile'), 800);
    } catch (err) {
      setErrorMsg(err?.message || 'Unable to create your profile. Please try again.');
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
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  fullWidth
                  autoComplete="tel"
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
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
              <Button type="submit" variant="contained" size="large" disabled={submitting}>
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
                style={{ textDecoration: 'none', color: '#1976d2', fontWeight: 600 }}
              >
                Log In
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
