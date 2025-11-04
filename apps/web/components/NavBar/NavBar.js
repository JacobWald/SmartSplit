'use client';

import styles from './NavBar.module.css';
import { Button, Drawer, List, ListItemButton, ListItemText } from '@mui/material';
import Link from 'next/link';
import HomeIcon from '@mui/icons-material/Home';
import { useState } from 'react';

export default function NavBar() {
  const [isMenuOpen, setMenuOpen] = useState(false);

  const handleMenuClose = () => setMenuOpen(false);

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

      {/* RIGHT SIDE / Drawer or other items can remain */}
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

       {/* RIGHT: Log In */}
       <div className={styles['navbar-right']}>
        <Link href="/login">
          <Button
            variant="outlined"
            className={styles.navButton}
          >
            Log In
          </Button>
        </Link>
      </div>
    </div>
  );
}
