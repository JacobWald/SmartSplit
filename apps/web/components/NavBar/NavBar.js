'use client';

import styles from './NavBar.module.css';

import { Button, Drawer, List, ListItemButton, ListItemText } from '@mui/material';
import Link from 'next/link';
import HomeIcon from '@mui/icons-material/Home';
import { useState } from "react";


export default function NavBar() {

    const [isMenuOpen, setMenuOpen] = useState(false);

    const handleMenuClose = () => {
        setMenuOpen(false);
    };

    return (
        <div className={styles.navbar}>
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
<<<<<<< HEAD
		<Link href="/expenses" onClick={handleMenuClose}> Expenses
		</Link>
=======
                <Link href="/profile">
                    <Button variant="contained" className={styles.navButton}>
                        Profile
                    </Button>
                </Link>
>>>>>>> origin/main
                {/* Add more navigation links/buttons here as needed */}
            </div>
            <div className={styles['navbar-mobile']}>
                <div
                className={styles['navbar-mobile-hamburgerWrapper']}
                onClick={() => {
                    setMenuOpen(!isMenuOpen);
                }}
                style={isMenuOpen ? { transform: "rotate(90deg)" } : {}}
                >
                <div></div>
                <div></div>
                <div></div>
                </div>
                <Drawer anchor="left" open={isMenuOpen} onClose={handleMenuClose}>
                    <List>
                        <ListItemButton component={Link} href="/" onClick={handleMenuClose}>
                                <ListItemText primary="Home" />
                        </ListItemButton>
                        <ListItemButton component={Link} href="/groups" onClick={handleMenuClose}>
                                <ListItemText primary="Groups" />
                        </ListItemButton>
                        <ListItemButton component={Link} href="/profile" onClick={handleMenuClose}>
                                 <ListItemText primary="Profile" />
                        </ListItemButton>
                        {/* Add more navigation items here as needed */}
                    </List>
                </Drawer>
            </div>
            <div className={styles['navbar-right']}>
                {/* <img src="./images/YOUR_SITE_LOGO" className="logo"/> */}
            </div>
        </div>
    );
}
