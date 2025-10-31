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
                        <HomeIcon sx={{ fontSize: '45px' }} />
                    </Button>
                </Link>
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
