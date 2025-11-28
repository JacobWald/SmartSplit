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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
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
  const [editingExpense, setEditingExpense] = useState(null);

  // promote-confirm dialog state
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [memberToPromote, setMemberToPromote] = useState(null);

  const [togglingAssignmentId, setTogglingAssignmentId] = useState(null);

  const parseJSON = async (res) => {
    if (!res.ok) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  };

  const currentMember = useMemo(() => {
    if (!group?.members || !group.currentUserId) return null;
    return group.members.find((m) => m.user_id === group.currentUserId) ?? null;
  }, [group]);

  const currentRole = currentMember?.role ?? null;
  const isAdmin = currentRole === 'ADMIN';
  const isModerator = currentRole === 'MODERATOR';
  const canManageExpenses = isAdmin || isModerator;
  const canToggleAssignment = (assignmentUserId) => {
    if (!group?.currentUserId) return false;
    if (isAdmin || isModerator) return true;
    return assignmentUserId === group.currentUserId;
  };


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
        `/api/expenses?groupId=${encodeURIComponent(group.id)}`
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
      console.error('Failed to reload group after role change:', err);
    }
  };

  // Open custom dialog to confirm promote to moderator
  const handlePromoteToModerator = (member) => {
    setMemberToPromote(member);
    setPromoteDialogOpen(true);
  };

  // Call API to promote member to moderator
  const confirmPromoteToModerator = async () => {
    const member = memberToPromote;
    if (!group?.id || !member) {
      setPromoteDialogOpen(false);
      return;
    }

    try {
      const res = await fetch('/api/group-members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: group.id,
          user_id: member.user_id,
          role: 'MODERATOR',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('Error promoting member:', data.error);
        alert(data.error || 'Failed to promote member');
        return;
      }

      await reloadGroup();
    } catch (err) {
      console.error('Error promoting member:', err);
      alert('Error promoting member. Check console.');
    } finally {
      setPromoteDialogOpen(false);
      setMemberToPromote(null);
    }
  };

  const closePromoteDialog = () => {
    setPromoteDialogOpen(false);
    setMemberToPromote(null);
  };

  const handleToggleAssignedFulfilled = async (expenseId, assignment) => {
    if (!assignment?.id) return;
    if (!canToggleAssignment(assignment.user_id)) return;

    try {
      setTogglingAssignmentId(assignment.id);

      const res = await fetch(`/api/assigned-expenses/${assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fulfilled: !assignment.fulfilled }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('Error updating payment status:', data.error);
        alert(data.error || 'Failed to update payment status');
        return;
      }

      // Reload expenses so the UI updates
      const eRes = await fetch(
        `/api/expenses?groupId=${encodeURIComponent(group.id)}`
      );
      const e = await parseJSON(eRes);
      setExpenses(Array.isArray(e) ? e : []);
    } catch (err) {
      console.error('Error updating payment status:', err);
      alert('Error updating payment status. Check console.');
    } finally {
      setTogglingAssignmentId(null);
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

        {canManageExpenses && (
          <Button
            className={styles.createButton}
            onClick={openCreateExpense}
          >
            Add Expense
          </Button>
        )}
      </Stack>

      {/* Members */}
      <Typography variant="h6" className={styles.sectionTitle}>
        Members
      </Typography>

      <List className={styles.memberList}>
        {group.members.map((m, idx) => {
          const isSelf = m.user_id === group.currentUserId;
          const canPromote =
            isAdmin &&
            m.role === 'MEMBER' &&
            m.status === 'ACCEPTED' &&
            !isSelf;

          return (
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

                {canPromote && (
                  <Button
                    size="small"
                    onClick={() => handlePromoteToModerator(m)}
                    className={styles.memberActionButton}
                  >
                    Promote to moderator
                  </Button>
                )}
              </ListItem>
              {idx < group.members.length - 1 && (
                <Divider className={styles.memberDivider} />
              )}
            </div>
          );
        })}
      </List>

      {/* Expenses */}
      <Typography
        variant="h6"
        className={styles.sectionTitle}
        style={{ marginTop: '2rem' }}
      >
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
                    {canManageExpenses && (
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
                      {expense.assigned.map((ae) => {
                        const canToggle = canToggleAssignment(ae.user_id);
                        const loading = togglingAssignmentId === ae.id;

                        return (
                          <ListItem key={ae.id} className={styles.splitRow}>
                            {/* Checkbox */}
                            <Checkbox
                              size="small"
                              checked={!!ae.fulfilled}
                              onChange={() => handleToggleAssignedFulfilled(expense.id, ae)}
                              disabled={!canToggle || loading}
                              className={styles.splitCheckbox}
                            />

                            {/* Name + amount, spread apart */}
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flex: 1,
                                gap: '1rem',
                              }}
                            >
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
                            </Box>
                          </ListItem>
                        );
                      })}
                    </List>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Promote-to-moderator confirmation dialog */}
      <Dialog
        open={promoteDialogOpen}
        onClose={closePromoteDialog}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { className: styles.confirmDialogPaper } }}
      >
        <DialogTitle className={styles.confirmDialogTitle}>
          Promote to moderator
        </DialogTitle>
        <DialogContent className={styles.confirmDialogContent}>
          <Typography>
            {memberToPromote
              ? `Promote ${memberToPromote.full_name} to moderator?`
              : ''}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closePromoteDialog}
            className={styles.confirmDialogButtonSecondary}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmPromoteToModerator}
            className={styles.confirmDialogButtonPrimary}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

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
