'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { supabase } from '@/lib/supabaseClient';

export default function LandingPage() {
  const [user, setUser] = useState(null);

  // Simple auth check to show/hide the "Log in" button
  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    };

    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 80px)', // space for navbar
        display: 'flex',
        alignItems: 'stretch',
        bgcolor: 'var(--color-bg)',
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          py: { xs: 4, md: 6 },
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {/* HERO */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 2,
            }}
          >
            Split Shared Costs Without Awkward Math
          </Typography>


          <Typography
            variant="subtitle1"
            sx={{
              maxWidth: 540,
              mx: 'auto',
              color: 'rgba(0,0,0,0.7)',
            }}
          >
            SmartSplit helps you organize groups, track who paid for what, and
            see exactly who owes whom — trips, roommates, events, and more.
          </Typography>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: 2,
              mt: 4,
            }}
          >
            <Button
              component={Link}
              href="/groups"
              variant="contained"
              sx={{
                px: 4,
                py: 1.25,
                borderRadius: '999px',
                backgroundColor: 'var(--color-primary)',
                '&:hover': {
                  backgroundColor: '#5879a2',
                },
              }}
            >
              Start a new split
            </Button>

            {/* Only show Log in when NOT logged in */}
            {!user && (
              <Button
                component={Link}
                href="/login"
                variant="outlined"
                sx={{
                  px: 4,
                  py: 1.25,
                  borderRadius: '999px',
                  borderColor: 'var(--color-primary)',
                  color: 'var(--color-primary)',
                  backgroundColor: 'var(--color-tertiary)',
                  '&:hover': {
                    borderColor: '#5879a2',
                    backgroundColor: '#f0e7da',
                  },
                }}
              >
                Log in
              </Button>
            )}
          </Box>
        </Box>

        {/* TWO-COLUMN SECTION */}
        <Box
          sx={{
            mt: 2,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 3,
            alignItems: 'stretch',
          }}
        >
          {/* LEFT COLUMN: How SmartSplit Works */}
          <Box
            sx={{
              flex: { xs: '1 1 100%', md: '0 0 40%' },
              display: 'flex',
            }}
          >
            <Card
              elevation={3}
              sx={{
                width: '100%',
                borderRadius: 3,
                bgcolor: 'var(--color-tertiary)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <CardContent
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  textAlign: 'left',
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                  }}
                >
                  How{' '}
                  <Box
                    component="span"
                    sx={{ color: 'var(--color-primary)', fontWeight: 700 }}
                  >
                    SmartSplit
                  </Box>{' '}
                  Works
                </Typography>

                <Stack spacing={2}>
                  {/* Step 1: Sign up & customize */}
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        fontSize: 11,
                        letterSpacing: 1.1,
                        color: 'rgba(0,0,0,0.6)',
                      }}
                    >
                      Step 1
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600, mt: 0.5 }}
                    >
                      Sign up & customize your account
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ opacity: 0.8, mt: 0.5 }}
                    >
                      Create your SmartSplit account, choose a username, and add
                      a profile photo so friends can easily recognize you.
                    </Typography>
                  </Box>

                  {/* Step 2: Create a group */}
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        fontSize: 11,
                        letterSpacing: 1.1,
                        color: 'rgba(0,0,0,0.6)',
                      }}
                    >
                      Step 2
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600, mt: 0.5 }}
                    >
                      Create a group
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ opacity: 0.8, mt: 0.5 }}
                    >
                      Name your group (trip, apartment, or event) and choose a
                      currency. Each group keeps its own expenses and members.
                    </Typography>
                  </Box>

                  {/* Step 3: Invite friends */}
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        fontSize: 11,
                        letterSpacing: 1.1,
                        color: 'rgba(0,0,0,0.6)',
                      }}
                    >
                      Step 3
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600, mt: 0.5 }}
                    >
                      Invite friends
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ opacity: 0.8, mt: 0.5 }}
                    >
                      Add people from your SmartSplit friends list so everyone
                      sees the same totals and can confirm their shares.
                    </Typography>
                  </Box>

                  {/* Step 4: Add expenses & settle up */}
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        fontSize: 11,
                        letterSpacing: 1.1,
                        color: 'rgba(0,0,0,0.6)',
                      }}
                    >
                      Step 4
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600, mt: 0.5 }}
                    >
                      Add expenses & settle up
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ opacity: 0.8, mt: 0.5 }}
                    >
                      Record who paid, choose who shares each expense, and let
                      SmartSplit calculate who owes what — no manual math or
                      messy spreadsheets.
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>

          {/* RIGHT COLUMN: three use-case cards stacked */}
          <Box
            sx={{
              flex: { xs: '1 1 100%', md: '0 0 60%' },
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            {/* Trips & Vacations */}
            <Card
              elevation={3}
              sx={{
                borderRadius: 3,
                bgcolor: 'var(--color-tertiary)',
              }}
            >
              <CardActionArea component={Link} href="/groups">
                <CardContent
                  sx={{
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                  }}
                >
                  <FlightTakeoffIcon
                    sx={{
                      fontSize: 32,
                      color: 'var(--color-primary)',
                    }}
                  />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Trips & Vacations
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Disney, ski trips, weekend getaways — keep track of who’s
                    covering flights, hotels, gas, and meals.
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ mt: 0.5, fontStyle: 'italic', opacity: 0.8 }}
                  >
                    Example: “Disney Trip with Friends”
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>

            {/* Roommates & Housing */}
            <Card
              elevation={3}
              sx={{
                borderRadius: 3,
                bgcolor: 'var(--color-tertiary)',
              }}
            >
              <CardActionArea component={Link} href="/groups">
                <CardContent
                  sx={{
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                  }}
                >
                  <HomeWorkIcon
                    sx={{
                      fontSize: 32,
                      color: 'var(--color-primary)',
                    }}
                  />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Roommates & Housing
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Rent, utilities, streaming, furniture, and bulk groceries —
                    no more mystery Venmos or forgotten IOUs.
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ mt: 0.5, fontStyle: 'italic', opacity: 0.8 }}
                  >
                    Example: “Roommates – 123 Main St”
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>

            {/* Events & One-Offs */}
            <Card
              elevation={3}
              sx={{
                borderRadius: 3,
                bgcolor: 'var(--color-tertiary)',
              }}
            >
              <CardActionArea component={Link} href="/groups">
                <CardContent
                  sx={{
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                  }}
                >
                  <EmojiEventsIcon
                    sx={{
                      fontSize: 32,
                      color: 'var(--color-primary)',
                    }}
                  />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Events & One-Offs
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Birthday dinners, bachelor(ette) parties, group gifts, or
                    any one-time thing you don’t want to track in a
                    spreadsheet.
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ mt: 0.5, fontStyle: 'italic', opacity: 0.8 }}
                  >
                    Example: “Sam’s Birthday Dinner”
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
