'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Box,
  Typography,
  CircularProgress,
  List,
  ListItem,
  Divider,
  Stack,
  Button,
} from '@mui/material';
import AddExpenseDialog from '@/components/AddExpenseDialog';
import styles from './GroupDetailPage.module.css';

export default function GroupDetailPage() {
  const { slug } = useParams();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);

  // Fetch group details plus current user
  useEffect(() => {
    if (!slug) return;

    (async () => {
      try {
        const res = await fetch(`/api/groups?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch group');

        const groupObj = Array.isArray(data) ? data[0] : data;

        const meRes = await fetch('/api/auth/me');
        const me = await meRes.json();
        if (me?.id) {
          groupObj.currentUserId = me.id;
        }

        setGroup(groupObj);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <Box
        sx={{
          height: '70vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
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

  const handleCreateExpense = async ({ title, amount, assigned }) => {
    if (!group?.id || !group.currentUserId) {
      console.error('Missing group id or current user id');
      return;
    }

    try {
      setSavingExpense(true);

      const res = await fetch('/api/expenses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          amount,
          group_id: group.id,
          payer_id: group.currentUserId,
          assigned,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('Error creating expense:', data.error);
        alert(data.error || 'Failed to create expense');
        return;
      }

      setExpenseOpen(false);
      // Jacob will handle displaying expenses for the group, so we do not need
      // to reload anything here yet.
    } catch (err) {
      console.error('Error creating expense:', err);
      alert('Error creating expense. Check console.');
    } finally {
      setSavingExpense(false);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="h4">{group.name}</Typography>

        <Button
          className={styles.createButton}
          onClick={() => setExpenseOpen(true)}
        >
          Add Expense
        </Button>
      </Stack>

      <Typography variant="body1" sx={{ mb: 4 }}>
        Base Currency: {group.base_currency}
      </Typography>

      <Typography variant="h6" sx={{ mb: 1 }}>
        Members
      </Typography>

      <List sx={{ border: '1px solid #ccc', borderRadius: 2 }}>
        {group.members.map((m) => (
          <div key={m.user_id}>
            <ListItem>
              {m.full_name} — {m.role} ({m.status})
            </ListItem>
            <Divider />
          </div>
        ))}
      </List>

      <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>
        Expenses
      </Typography>
      <Typography variant="body2">
        Expense display for this group will be handled by Jacob’s component.
      </Typography>

      <AddExpenseDialog
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        members={group.members}
        onSubmit={handleCreateExpense}
        loading={savingExpense}
        groupName={group.name}
      />
    </Box>
  );
}