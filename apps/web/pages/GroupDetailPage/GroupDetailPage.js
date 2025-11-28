'use client';

import { useEffect, useMemo, useState } from 'react';
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
  Card,
  CardContent,
} from '@mui/material';
import AddExpenseDialog from '@/components/AddExpenseDialog';
import styles from './GroupDetailPage.module.css';

export default function GroupDetailPage() {
  // slug is actually the groupId (UUID) now
  const { slug } = useParams();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  // null = create mode; non-null = edit this expense
  const [editingExpense, setEditingExpense] = useState(null);

  const parseJSON = async (res) => {
    if (!res.ok) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  };

  const isAdmin = useMemo(() => {
    if (!group?.members || !group.currentUserId) return false;
    return group.members.some(
      (m) => m.user_id === group.currentUserId && m.role === 'ADMIN',
    );
  }, [group]);

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

  // Fetch group details, group expenses, & current user
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

  const openCreateExpense = () => {
    setEditingExpense(null);
    setExpenseOpen(true);
  };

  const openEditExpense = (expense) => {
    setEditingExpense(expense);
    setExpenseOpen(true);
  };

  // Used for both create + edit
  const handleExpenseSubmit = async ({ title, amount, assigned }) => {
    if (!group?.id || !group.currentUserId) {
      console.error('Missing group id or current user id');
      return;
    }

    try {
      setSavingExpense(true);

      const isEdit = !!editingExpense;
      const endpoint = isEdit
        ? `/api/expenses/${editingExpense.id}`
        : '/api/expenses/create';
      const method = isEdit ? 'PUT' : 'POST';

      console.log('Saving expense:', {
        isEdit,
        editingExpenseId: editingExpense?.id,
        endpoint,
        method,
      });


      const res = await fetch(endpoint, {
        method,
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
        console.error('Error saving expense:', data.error);
        alert(data.error || 'Failed to save expense');
        return;
      }

      // Reload expenses so the list updates
      const eRes = await fetch(
        `/api/expenses?groupId=${encodeURIComponent(group.id)}`,
      );
      const e = await parseJSON(eRes);
      setExpenses(Array.isArray(e) ? e : []);

      setExpenseOpen(false);
      setEditingExpense(null);
    } catch (err) {
      console.error('Error saving expense:', err);
      alert('Error saving expense. Check console.');
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
        <Box>
          <Typography variant="h4" className={styles.groupTitle}>
            {group.name}
          </Typography>
          <Typography variant="body2" className={styles.baseCurrency}>
            Base Currency: {group.base_currency}
          </Typography>
        </Box>

        <Button
          className={styles.createButton}
          onClick={openCreateExpense}
        >
          Add Expense
        </Button>
      </Stack>

      {/* Members */}
      <Typography variant="h6" className={styles.sectionTitle}>
        Members
      </Typography>

      <List className={styles.memberList}>
        {group.members.map((m, idx) => (
          <div key={m.user_id}>
            <ListItem className={styles.memberRow}>
              <Box className={styles.memberInfo}>
                <Typography className={styles.memberName}>
                  {m.full_name}
                </Typography>
                <Typography className={styles.memberMeta}>
                  {m.role} ({m.status})
                </Typography>
              </Box>
            </ListItem>
            {idx < group.members.length - 1 && (
              <Divider className={styles.memberDivider} />
            )}
          </div>
        ))}
      </List>

      {/* Expenses */}
      <Typography variant="h6" className={styles.sectionTitle} style={{ marginTop: '2rem' }}>
        Expenses
      </Typography>

      {expenses.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No expenses recorded for this group yet.
        </Typography>
      ) : (
        <Stack spacing={2} sx={{ mt: 1 }}>
          {expenses.map((expense) => (
            <Card key={expense.id} className={styles.expenseCard}>
              <CardContent className={styles.expenseCardContent}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  spacing={2}
                  className={styles.expenseHeader}
                >
                  <Box>
                    <Typography className={styles.expenseTitle}>
                      {expense.title}
                    </Typography>
                    {expense.occurred_at && (
                      <Typography className={styles.expenseDate}>
                        {formatDate(expense.occurred_at)}
                      </Typography>
                    )}
                    {expense.note && (
                      <Typography className={styles.expenseNote}>
                        {expense.note}
                      </Typography>
                    )}
                  </Box>

                  <Box className={styles.expenseAmountBox}>
                    <Typography className={styles.expenseAmount}>
                      {Number(expense.amount).toFixed(2)} {group.base_currency}
                    </Typography>
                    {isAdmin && (
                      <Button
                        size="small"
                        onClick={() => openEditExpense(expense)}
                        className={styles.editButton}
                      >
                        Edit
                      </Button>
                    )}
                  </Box>
                </Stack>

                {/* Assigned breakdown */}
                {expense.assigned && expense.assigned.length > 0 && (
                  <Box className={styles.splitBox}>
                    <Typography className={styles.splitLabel}>
                      Split between:
                    </Typography>
                    <List dense className={styles.splitList}>
                      {expense.assigned.map((ae) => (
                        <ListItem key={ae.id} className={styles.splitRow}>
                          <Typography className={styles.splitName}>
                            {memberNameFor(ae.user_id)}
                          </Typography>
                          <Typography className={styles.splitValue}>
                            {[
                              ae.amount != null
                                ? `$${Number(ae.amount).toFixed(2)}`
                                : null,
                              ae.percent != null
                                ? `${Number(ae.percent).toFixed(2)}%`
                                : null,
                              ae.ratio_part != null
                                ? `ratio ${Number(ae.ratio_part)}`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(' • ') || '-'}
                          </Typography>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Reused dialog for both create + edit */}
      <AddExpenseDialog
        open={expenseOpen}
        onClose={() => {
          setExpenseOpen(false);
          setEditingExpense(null);
        }}
        members={group.members}
        onSubmit={handleExpenseSubmit}
        loading={savingExpense}
        groupName={group.name}
        mode={editingExpense ? 'edit' : 'create'}
        expense={editingExpense}
      />
    </Box>
  );
}
