'use client';

import styles from './NavBar.module.css';
import {
  Button,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
} from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import HomeIcon from '@mui/icons-material/Home';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function NavBar() {
  const router = useRouter();

  const [isMenuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  // Friend request state
  const [pendingFriendCount, setPendingFriendCount] = useState(0);
  const [friendRequests, setFriendRequests] = useState([]);
  const [friendRequestsLoading, setFriendRequestsLoading] = useState(false);

  // Group invite state
  const [pendingGroupInviteCount, setPendingGroupInviteCount] = useState(0);
  const [groupInvites, setGroupInvites] = useState([]);
  const [groupInvitesLoading, setGroupInvitesLoading] = useState(false);

  // Bell dropdown state
  const [bellAnchorEl, setBellAnchorEl] = useState(null);
  const isBellMenuOpen = Boolean(bellAnchorEl);

  const handleMenuClose = () => setMenuOpen(false);

  const totalNotifications = pendingFriendCount + pendingGroupInviteCount;

  // same helper the Groups page uses
  const parseJSON = async (res) => {
    if (!res.ok) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  };

  // ---- helpers to load notifications ----
  async function loadPendingFriendRequests(currentUserId) {
    const uid = currentUserId || user?.id;
    if (!uid) {
      setPendingFriendCount(0);
      setFriendRequests([]);
      return;
    }

    setFriendRequestsLoading(true);

    const { data, error } = await supabase
      .from('user_friend_requests')
      .select(
        `
          id,
          created_at,
          from_user:from_user_id (
            id,
            full_name,
            username,
            phone
          )
        `
      )
      .eq('to_user_id', uid)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading pending friend requests:', error);
      setPendingFriendCount(0);
      setFriendRequests([]);
      setFriendRequestsLoading(false);
      return;
    }

    setPendingFriendCount(data?.length || 0);
    setFriendRequests(data || []);
    setFriendRequestsLoading(false);
  }

  // Use /api/groups like the Groups page to detect invites
  async function loadGroupInvites(currentUserId) {
    const uid = currentUserId || user?.id;
    if (!uid) {
      setPendingGroupInviteCount(0);
      setGroupInvites([]);
      return;
    }

    setGroupInvitesLoading(true);

    try {
      const res = await fetch('/api/groups');
      const groups = await parseJSON(res);

      console.log('[NavBar] /api/groups result for invites', {
        uid,
        groups,
      });

      if (!Array.isArray(groups)) {
        setPendingGroupInviteCount(0);
        setGroupInvites([]);
        return;
      }

      // Match the invites logic from Groups page (INVITED membership for this user)
      const invites = [];
      for (const g of groups) {
        if (!Array.isArray(g.members)) continue;

        const membership = g.members.find(
          (m) => m.user_id === uid && m.status === 'INVITED'
        );

        if (membership) {
          invites.push({
            id: `${g.id}-${uid}`, // synthetic id for React key
            group_id: g.id,
            group_name: g.name,
            created_at: membership.created_at ?? g.created_at ?? null,
          });
        }
      }

      console.log('[NavBar] computed groupInvites', invites);

      setPendingGroupInviteCount(invites.length);
      setGroupInvites(invites);
    } catch (error) {
      console.error('Error loading group invites:', error);
      setPendingGroupInviteCount(0);
      setGroupInvites([]);
    } finally {
      setGroupInvitesLoading(false);
    }
  }

  const handleBellOpen = (event) => {
    setBellAnchorEl(event.currentTarget);
    // Refresh notifications whenever the bell is opened
    if (user) {
      loadPendingFriendRequests(user.id);
      loadGroupInvites(user.id);
    }
  };

  const handleBellClose = () => {
    setBellAnchorEl(null);
  };

  // Keep nav in sync with Supabase auth
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

  // Initial load of notifications when user changes
  useEffect(() => {
    if (!user) {
      setPendingFriendCount(0);
      setFriendRequests([]);
      setPendingGroupInviteCount(0);
      setGroupInvites([]);
      return;
    }

    loadPendingFriendRequests(user.id);
    loadGroupInvites(user.id);
  }, [user]);

  // Listen for "smartsplit-notifications-update" events from other pages (e.g., Profile after accepting a friend)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = () => {
      if (user) {
        loadPendingFriendRequests(user.id);
        loadGroupInvites(user.id);
      }
    };

    window.addEventListener('smartsplit-notifications-update', handler);
    return () => {
      window.removeEventListener('smartsplit-notifications-update', handler);
    };
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return (
    <>
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

        {/* Drawer for mobile navigation */}
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

        {/* RIGHT: Bell + Log In / Log Out */}
        <div className={styles['navbar-right']}>
          {/* Notification bell only when logged in */}
          {user && (
            <>
              <IconButton
                onClick={handleBellOpen}
                aria-label={
                  totalNotifications > 0
                    ? `You have ${totalNotifications} notifications`
                    : 'Notifications'
                }
                sx={{
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-primary)',
                  borderRadius: '999px',
                  boxShadow: 1,
                  '&:hover': {
                    backgroundColor: 'var(--color-secondary)',
                    color: 'var(--color-primary)',
                  },
                }}
              >
                <Badge
                  badgeContent={totalNotifications}
                  color="error"
                  overlap="circular"
                  invisible={totalNotifications === 0}
                >
                  <NotificationsNoneIcon />
                </Badge>
              </IconButton>

              <Menu
                anchorEl={bellAnchorEl}
                open={isBellMenuOpen}
                onClose={handleBellClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                  sx: {
                    mt: 1,
                    borderRadius: 2,
                    bgcolor: 'var(--color-tertiary)',
                    minWidth: 300,
                    maxWidth: 360,
                  },
                }}
              >
                {/* No notifications state */}
                {!friendRequestsLoading &&
                  !groupInvitesLoading &&
                  friendRequests.length === 0 &&
                  groupInvites.length === 0 && (
                    <MenuItem disabled>
                      <Typography
                        variant="body2"
                        sx={{ opacity: 0.8, textAlign: 'center' }}
                      >
                        You don&apos;t have any notifications yet.
                      </Typography>
                    </MenuItem>
                  )}

                {/* Friend Requests Section */}
                {friendRequests.length > 0 && (
                  <MenuItem disabled>
                    <Typography
                      variant="caption"
                      sx={{
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        fontWeight: 600,
                        opacity: 0.7,
                      }}
                    >
                      Friend Requests
                    </Typography>
                  </MenuItem>
                )}

                {friendRequests.map((req) => (
                  <MenuItem
                    key={req.id}
                    sx={{ alignItems: 'flex-start', py: 1.2 }}
                    onClick={() => {
                      handleBellClose();
                      router.push('/profile'); // go to profile/friends section
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        gap: 0.5,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: 'var(--color-primary)',
                        }}
                      >
                        {req.from_user?.full_name ||
                          req.from_user?.username ||
                          'New friend request'}
                      </Typography>

                      {req.from_user?.username && (
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          @{req.from_user.username}
                        </Typography>
                      )}

                      {req.from_user?.phone && (
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          {req.from_user.phone}
                        </Typography>
                      )}

                      <Typography
                        variant="caption"
                        sx={{ opacity: 0.6, mt: 0.5 }}
                      >
                        Tap to view and respond on Profile page
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}

                {/* Divider between friend + group sections */}
                {groupInvites.length > 0 && friendRequests.length > 0 && (
                  <MenuItem disabled>
                    <Box
                      sx={{
                        borderTop: '1px solid rgba(0,0,0,0.08)',
                        width: '100%',
                      }}
                    />
                  </MenuItem>
                )}

                {/* Group Invites Section */}
                {groupInvites.length > 0 && (
                  <MenuItem disabled>
                    <Typography
                      variant="caption"
                      sx={{
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        fontWeight: 600,
                        opacity: 0.7,
                      }}
                    >
                      Group Invites
                    </Typography>
                  </MenuItem>
                )}

                {groupInvites.map((inv) => (
                  <MenuItem
                    key={inv.id}
                    sx={{ alignItems: 'flex-start', py: 1.2 }}
                    onClick={() => {
                      handleBellClose();
                      router.push('/groups'); // user can tap INVITES tab there
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        gap: 0.5,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: 'var(--color-primary)',
                        }}
                      >
                        Group invitation: {inv.group_name || 'New group'}
                      </Typography>
                      
                      <Typography
                        variant="caption"
                        sx={{ opacity: 0.6, mt: 0.5 }}
                      >
                        Tap to view and respond on Groups page
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}

          {/* Auth button */}
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
              <Button variant="outlined" className={styles.navButton}>
                Log In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
