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
import HomeIcon from '@mui/icons-material/Home';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function NavBar() {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  // Friend request state
  const [pendingFriendCount, setPendingFriendCount] = useState(0);
  const [friendRequests, setFriendRequests] = useState([]);
  const [friendRequestsLoading, setFriendRequestsLoading] = useState(false);
  const [respondingRequestId, setRespondingRequestId] = useState(null);

  // Group invite state
  const [pendingGroupInviteCount, setPendingGroupInviteCount] = useState(0);
  const [groupInvites, setGroupInvites] = useState([]);
  const [groupInvitesLoading, setGroupInvitesLoading] = useState(false);
  const [respondingGroupInviteId, setRespondingGroupInviteId] = useState(null);

  // Bell dropdown state
  const [bellAnchorEl, setBellAnchorEl] = useState(null);
  const isBellMenuOpen = Boolean(bellAnchorEl);

  const handleMenuClose = () => setMenuOpen(false);

  const totalNotifications = pendingFriendCount + pendingGroupInviteCount;

  const handleBellOpen = (event) => {
    // If there are no notifications, do nothing at all
    if (totalNotifications <= 0) return;
    setBellAnchorEl(event.currentTarget);
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

  // Load list + count of pending friend requests
  useEffect(() => {
    if (!user) {
      setPendingFriendCount(0);
      setFriendRequests([]);
      return;
    }

    const fetchPendingFriendRequests = async () => {
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
        .eq('to_user_id', user.id)
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
    };

    fetchPendingFriendRequests();
  }, [user]);

  // Load list + count of group invites (simple, non-relational query)
  useEffect(() => {
    if (!user) {
      setPendingGroupInviteCount(0);
      setGroupInvites([]);
      return;
    }

    const fetchGroupInvites = async () => {
      setGroupInvitesLoading(true);

      const { data, error } = await supabase
        .from('group_members')
        .select('id, group_id, created_at')
        .eq('user_id', user.id)
        .eq('status', 'INVITED')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn(
          'Group invites query failed, hiding invites in bell menu:',
          error.message || error
        );
        setPendingGroupInviteCount(0);
        setGroupInvites([]);
        setGroupInvitesLoading(false);
        return;
      }

      setPendingGroupInviteCount(data?.length || 0);
      setGroupInvites(data || []);
      setGroupInvitesLoading(false);
    };

    fetchGroupInvites();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  // Accept / reject friend request
  const handleRespondToFriendRequest = async (requestId, fromUserId, action) => {
    if (!user) return;

    setRespondingRequestId(requestId);
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('user_friend_requests')
        .update({
          status: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED',
          responded_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('to_user_id', user.id)
        .eq('status', 'PENDING');

      if (updateError) {
        console.error('Error updating friend request:', updateError);
        return;
      }

      // If accepted, create mutual friendships
      if (action === 'ACCEPT') {
        const { error: insertError } = await supabase
          .from('user_friends')
          .insert([
            { user_id: user.id, friend_id: fromUserId },
            { user_id: fromUserId, friend_id: user.id },
          ]);

        if (insertError) {
          console.error('Error inserting friends:', insertError);
        }
      }

      // Update UI state
      setFriendRequests((prev) => prev.filter((req) => req.id !== requestId));
      setPendingFriendCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Error responding to friend request:', e);
    } finally {
      setRespondingRequestId(null);
    }
  };

  // Accept / reject group invite
  const handleRespondToGroupInvite = async (inviteId, action) => {
    if (!user) return;

    setRespondingGroupInviteId(inviteId);
    try {
      const update = {
        status: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED',
      };
      if (action === 'ACCEPT') {
        update.joined_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('group_members')
        .update(update)
        .eq('id', inviteId)
        .eq('user_id', user.id)
        .eq('status', 'INVITED');

      if (updateError) {
        console.error('Error updating group invite:', updateError);
        return;
      }

      setGroupInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
      setPendingGroupInviteCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Error responding to group invite:', e);
    } finally {
      setRespondingGroupInviteId(null);
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

              {totalNotifications > 0 && (
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
                  {/* Friend Requests Section */}
                  {friendRequests.length > 0 && (
                    <>
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

                      {friendRequests.map((req) => (
                        <MenuItem
                          key={req.id}
                          sx={{ alignItems: 'flex-start', py: 1.2 }}
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
                              <Typography
                                variant="caption"
                                sx={{ opacity: 0.8 }}
                              >
                                @{req.from_user.username}
                              </Typography>
                            )}

                            {req.from_user?.phone && (
                              <Typography
                                variant="caption"
                                sx={{ opacity: 0.8 }}
                              >
                                {req.from_user.phone}
                              </Typography>
                            )}

                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: 1,
                                mt: 1,
                              }}
                            >
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() =>
                                  handleRespondToFriendRequest(
                                    req.id,
                                    req.from_user?.id,
                                    'REJECT'
                                  )
                                }
                                disabled={respondingRequestId === req.id}
                              >
                                {respondingRequestId === req.id
                                  ? 'Rejecting…'
                                  : 'Reject'}
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() =>
                                  handleRespondToFriendRequest(
                                    req.id,
                                    req.from_user?.id,
                                    'ACCEPT'
                                  )
                                }
                                disabled={respondingRequestId === req.id}
                              >
                                {respondingRequestId === req.id
                                  ? 'Accepting…'
                                  : 'Accept'}
                              </Button>
                            </Box>
                          </Box>
                        </MenuItem>
                      ))}
                    </>
                  )}

                  {/* Group Invites Section */}
                  {groupInvites.length > 0 && (
                    <>
                      {friendRequests.length > 0 && (
                        <MenuItem disabled>
                          <Box
                            sx={{
                              borderTop: '1px solid rgba(0,0,0,0.08)',
                              width: '100%',
                            }}
                          />
                        </MenuItem>
                      )}

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

                      {groupInvites.map((inv) => (
                        <MenuItem
                          key={inv.id}
                          sx={{ alignItems: 'flex-start', py: 1.2 }}
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
                              Group invitation
                            </Typography>

                            <Typography
                              variant="caption"
                              sx={{ opacity: 0.8 }}
                            >
                              Group ID: {inv.group_id}
                            </Typography>

                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: 1,
                                mt: 1,
                              }}
                            >
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() =>
                                  handleRespondToGroupInvite(inv.id, 'REJECT')
                                }
                                disabled={respondingGroupInviteId === inv.id}
                              >
                                {respondingGroupInviteId === inv.id
                                  ? 'Rejecting…'
                                  : 'Reject'}
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() =>
                                  handleRespondToGroupInvite(inv.id, 'ACCEPT')
                                }
                                disabled={respondingGroupInviteId === inv.id}
                              >
                                {respondingGroupInviteId === inv.id
                                  ? 'Accepting…'
                                  : 'Accept'}
                              </Button>
                            </Box>
                          </Box>
                        </MenuItem>
                      ))}
                    </>
                  )}
                </Menu>
              )}
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
