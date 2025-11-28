'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Box, Typography, CircularProgress, Stack } from '@mui/material';
import styles from './GroupDetailPage.module.css';
import GroupMembersSection from './MembersSection';
import ExpensesSection from './ExpensesSection';

export default function GroupDetailPage() {
  const { slug } = useParams(); // group id (UUID)

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [friendProfiles, setFriendProfiles] = useState([]);
  const [expenseFilter, setExpenseFilter] = useState('unfulfilled');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const parseJSON = async (res) => {
    if (!res.ok) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  };

  // Fetch group + expenses + current user on mount / slug change
  useEffect(() => {
    if (!slug) return;

    (async () => {
      try {
        setLoading(true);
        setError('');

        const [gRes, eRes, meRes] = await Promise.all([
          fetch(`/api/groups?groupId=${encodeURIComponent(slug)}`),
          fetch(`/api/expenses?groupId=${encodeURIComponent(slug)}`),
          fetch('/api/auth/me'),
        ]);

        const [g, e, me] = await Promise.all([
          parseJSON(gRes),
          parseJSON(eRes),
          parseJSON(meRes),
        ]);

        const groupObj = Array.isArray(g) ? g[0] : g;

        if (!groupObj) {
          setGroup(null);
          setExpenses([]);
          return;
        }

        if (me?.id) {
          groupObj.currentUserId = me.id;
        }

        setGroup(groupObj);
        setExpenses(Array.isArray(e) ? e : []);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to load group');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  // Load friend profiles for the "Add members" dialog
  useEffect(() => {
    if (!group?.currentUserId) {
      setFriendProfiles([]);
      return;
    }

    (async () => {
      try {
        const friendId = group.currentUserId;
        const fRes = await fetch(`/api/friends?friendId=${friendId}`);
        const f = await parseJSON(fRes);
        setFriendProfiles(Array.isArray(f) ? f : []);
      } catch (err) {
        console.error('Failed to load friend profiles:', err);
        setFriendProfiles([]);
      }
    })();
  }, [group?.currentUserId]);

  const currentMember = useMemo(() => {
    if (!group?.members || !group.currentUserId) return null;
    return group.members.find((m) => m.user_id === group.currentUserId) ?? null;
  }, [group]);

  const currentRole = currentMember?.role ?? null;
  const isAdmin = currentRole === 'ADMIN';
  const isModerator = currentRole === 'MODERATOR';

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString();
  };

  const memberNameFor = (userId) => {
    if (!group?.members) return 'Unknown user';
    const m = group.members.find((mem) => mem.user_id === userId);
    return m?.full_name || 'Unknown user';
  };

  const reloadGroup = async () => {
    try {
      const gRes = await fetch(
        `/api/groups?groupId=${encodeURIComponent(group.id)}`
      );
      const g = await parseJSON(gRes);
      const groupObj = Array.isArray(g) ? g[0] : g;

      if (groupObj && group.currentUserId) {
        groupObj.currentUserId = group.currentUserId;
      }

      setGroup(groupObj);
    } catch (err) {
      console.error('Failed to reload group:', err);
    }
  };

  const reloadExpenses = async () => {
    if (!group?.id) return;
    try {
      const eRes = await fetch(
        `/api/expenses?groupId=${encodeURIComponent(group.id)}`
      );
      const e = await parseJSON(eRes);
      setExpenses(Array.isArray(e) ? e : []);
    } catch (err) {
      console.error('Failed to reload expenses:', err);
    }
  };

  if (loading) {
    return (
      <Box className={styles.loadingBox}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !group) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="error">
          {error || 'Group not found.'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h4" className={styles.groupTitle}>
            {group.name}
          </Typography>
          <Typography variant="body2" className={styles.baseCurrency}>
            Base Currency: {group.base_currency}
          </Typography>
        </Box>
      </Stack>

      {/* Members */}
      <GroupMembersSection
        group={group}
        isAdmin={isAdmin}
        currentUserId={group.currentUserId}
        friendProfiles={friendProfiles}
        onGroupUpdated={reloadGroup}
      />

      {/* Expenses */}
      <ExpensesSection
        group={group}
        expenses={expenses}
        expenseFilter={expenseFilter}
        setExpenseFilter={setExpenseFilter}
        isAdmin={isAdmin}
        isModerator={isModerator}
        currentUserId={group.currentUserId}
        onExpensesUpdated={reloadExpenses}
        memberNameFor={memberNameFor}
        formatDate={formatDate}
      />
    </Box>
  );
}
