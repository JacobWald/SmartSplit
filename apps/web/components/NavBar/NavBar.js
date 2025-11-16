'use client';

import styles from './NavBar.module.css';
import { Button, Drawer, List, ListItemButton, ListItemText } from '@mui/material';
import Link from 'next/link';
import HomeIcon from '@mui/icons-material/Home';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function NavBar() {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  const handleMenuClose = () => setMenuOpen(false);

  useEffect(() => {
    // Check the current auth session on mount
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    };

    getUser();

    // Subscribe to auth changes so the nav stays in sync
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    // Redirect after logout
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return (
    <div className={styles.navbar}>
      {/* LEFT: Home / Groups / Expenses / Profile */}
      <div className={styles['navbar-left']}>
        <Link href="/">
          <Button>
            <HomeIcon sx={{ fontSize: '45px', color: 'var(--color-bg)' }} />
          </Button>
        </Link>

        <Link href="/groups">
          <Button variant="contained" className={styles.navButton}>
            Groups
          </Button>
        </Link>

        <Link href="/expenses">
          <Button variant="contained" className={styles.navButton}>
            Expenses
          </Button>
        </Link>

        <Link href="/profile">
          <Button variant="contained" className={styles.navButton}>
            Profile
          </Button>
        </Link>
      </div>

      {/* RIGHT SIDE / Drawer */}
      <Drawer anchor="right" open={isMenuOpen} onClose={handleMenuClose}>
        <List>
          <ListItemButton component={Link} href="/">
            <ListItemText primary="Home" />
          </ListItemButton>
          <ListItemButton component={Link} href="/groups">
            <ListItemText primary="Groups" />
          </ListItemButton>
          <ListItemButton component={Link} href="/expenses">
            <ListItemText primary="Expenses" />
          </ListItemButton>
          <ListItemButton component={Link} href="/profile">
            <ListItemText primary="Profile" />
          </ListItemButton>
        </List>
      </Drawer>

      {/* RIGHT: Auth-aware button */}
      <div className={styles['navbar-right']}>
        {user ? (
          <Button
            variant="outlined"
            className={styles.navButton}
            onClick={handleLogout}
          >
            Log Out
          </Button>
        ) : (
          <Link href="/login">
            <Button
              variant="outlined"
              className={styles.navButton}
            >
              Log In
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
