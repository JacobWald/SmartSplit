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
  const [expenseFilter, setExpenseFilter] = useState('unfulfilled'); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // role-change dialog state (used for promote/demote)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleDialogMember, setRoleDialogMember] = useState(null);
  const [roleDialogTargetRole, setRoleDialogTargetRole] = useState(null);

  const [togglingAssignmentId, setTogglingAssignmentId] = useState(null);

  // Delete expense dialog
  const [deleteExpenseDialogOpen, setDeleteExpenseDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(false);

  // Delete member dialog
  const [deleteMemberDialogOpen, setDeleteMemberDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [deletingMember, setDeletingMember] = useState(false);

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

  const filteredExpenses = useMemo(() => {
    if (!Array.isArray(expenses)) return [];

    if (expenseFilter === 'fulfilled') {
      return expenses.filter((exp) => exp.fulfilled === true);
    }

    // default: show unfulfilled (or missing) ones
    return expenses.filter((exp) => exp.fulfilled !== true);
  }, [expenses, expenseFilter]);

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

  // Open dialog to change a member's role (promote/demote)
  const openRoleDialog = (member, targetRole) => {
    setRoleDialogMember(member);
    setRoleDialogTargetRole(targetRole); // 'MODERATOR' or 'MEMBER'
    setRoleDialogOpen(true);
  };

  // Call API to change member's role
  const confirmChangeMemberRole = async () => {
    const member = roleDialogMember;
    const targetRole = roleDialogTargetRole;

    if (!group?.id || !member || !targetRole) {
      setRoleDialogOpen(false);
      return;
    }

    try {
      const res = await fetch('/api/group-members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: group.id,
          user_id: member.user_id,
          role: targetRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('Error changing member role:', data.error);
        alert(data.error || 'Failed to change member role');
        return;
      }

      await reloadGroup();
    } catch (err) {
      console.error('Error changing member role:', err);
      alert('Error changing member role. Check console.');
    } finally {
      setRoleDialogOpen(false);
      setRoleDialogMember(null);
      setRoleDialogTargetRole(null);
    }
  };

  const closeRoleDialog = () => {
    setRoleDialogOpen(false);
    setRoleDialogMember(null);
    setRoleDialogTargetRole(null);
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

    const openDeleteExpenseDialog = (expense) => {
    setExpenseToDelete(expense);
    setDeleteExpenseDialogOpen(true);
  };

  const closeDeleteExpenseDialog = () => {
    setDeleteExpenseDialogOpen(false);
    setExpenseToDelete(null);
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete?.id) {
      closeDeleteExpenseDialog();
      return;
    }

    try {
      setDeletingExpense(true);

      const res = await fetch(`/api/expenses/${expenseToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('Error deleting expense:', data.error);
        alert(data.error || 'Failed to delete expense');
        return;
      }

      // Reload expenses after delete
      const eRes = await fetch(
        `/api/expenses?groupId=${encodeURIComponent(group.id)}`
      );
      const e = await parseJSON(eRes);
      setExpenses(Array.isArray(e) ? e : []);
    } catch (err) {
      console.error('Error deleting expense:', err);
      alert('Error deleting expense. Check console.');
    } finally {
      setDeletingExpense(false);
      closeDeleteExpenseDialog();
    }
  };

    const openDeleteMemberDialog = (member) => {
    setMemberToDelete(member);
    setDeleteMemberDialogOpen(true);
  };

  const closeDeleteMemberDialog = () => {
    setDeleteMemberDialogOpen(false);
    setMemberToDelete(null);
  };

  const confirmDeleteMember = async () => {
    if (!memberToDelete?.user_id || !group?.id) {
      closeDeleteMemberDialog();
      return;
    }

    try {
      setDeletingMember(true);

      const res = await fetch('/api/group-members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: group.id,
          user_id: memberToDelete.user_id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('Error removing member:', data.error);
        alert(data.error || 'Failed to remove member');
        return;
      }

      // Reload group to refresh members list
      await reloadGroup();
    } catch (err) {
      console.error('Error removing member:', err);
      alert('Error removing member. Check console.');
    } finally {
      setDeletingMember(false);
      closeDeleteMemberDialog();
    }
  };

  // Text for the role-change dialog
  const roleDialogTitle =
    roleDialogTargetRole === 'MODERATOR'
      ? 'Promote to moderator'
      : roleDialogTargetRole === 'MEMBER'
      ? 'Set role to member'
      : 'Change role';

  const roleDialogMessage =
    roleDialogMember && roleDialogTargetRole === 'MODERATOR'
      ? `Promote ${roleDialogMember.full_name} to moderator?`
      : roleDialogMember && roleDialogTargetRole === 'MEMBER'
      ? `Set ${roleDialogMember.full_name}'s role back to member?`
      : '';

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
          const canModifyRole =
            isAdmin && m.status === 'ACCEPTED' && !isSelf;

          const showPromote =
            canModifyRole && m.role === 'MEMBER';
          const showDemote =
            canModifyRole && m.role === 'MODERATOR';

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

                <Stack direction="row" spacing={1}>
                  {showPromote && (
                    <Button
                      size="small"
                      onClick={() => openRoleDialog(m, 'MODERATOR')}
                      className={styles.memberActionButton}
                    >
                      Promote to moderator
                    </Button>
                  )}

                  {showDemote && (
                    <Button
                      size="small"
                      onClick={() => openRoleDialog(m, 'MEMBER')}
                      className={styles.memberActionButton}
                    >
                      Demote to member
                    </Button>
                  )}

                  {/* Admin-only remove (same condition as canModifyRole) */}
                  {canModifyRole && (
                    <Button
                      size="small"
                      onClick={() => openDeleteMemberDialog(m)}
                      className={styles.memberDeleteButton}
                      color="error"
                    >
                      Remove
                    </Button>
                  )}
                </Stack>
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

      {/* Filter toggle */}
      <Box className={styles.expenseFilterBar}>
        <button
          type="button"
          className={
            expenseFilter === 'unfulfilled'
              ? `${styles.expenseFilterButton} ${styles.expenseFilterButtonActive}`
              : styles.expenseFilterButton
          }
          onClick={() => setExpenseFilter('unfulfilled')}
        >
          Outstanding
        </button>

        <button
          type="button"
          className={
            expenseFilter === 'fulfilled'
              ? `${styles.expenseFilterButton} ${styles.expenseFilterButtonActive}`
              : styles.expenseFilterButton
          }
          onClick={() => setExpenseFilter('fulfilled')}
        >
          Fulfilled
        </button>
      </Box>

      {filteredExpenses.length === 0 ? (
        <Typography variant="body2" className={styles.noExpensesText}>
          {expenseFilter === 'fulfilled'
            ? 'No fulfilled expenses yet.'
            : 'No outstanding expenses 🎉'}
        </Typography>
      ) : (
        <Stack spacing={2} sx={{ mt: 1 }}>
          {filteredExpenses.map((expense) => (
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
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <Typography className={styles.expenseTitle}>
                        {expense.title}
                      </Typography>
                      <span
                        className={`${styles.expenseStatusPill} ${
                          expense.fulfilled
                            ? styles.expenseStatusPillFulfilled
                            : styles.expenseStatusPillUnfulfilled
                        }`}
                      >
                        {expense.fulfilled ? 'Fulfilled' : 'Outstanding'}
                      </span>
                    </Box>
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

                    <Stack direction="row" spacing={1}>
                      {canManageExpenses && (
                        <Button
                          size="small"
                          onClick={() => openEditExpense(expense)}
                          className={styles.editButton}
                        >
                          Edit
                        </Button>
                      )}

                      {isAdmin && (
                        <Button
                          size="small"
                          onClick={() => openDeleteExpenseDialog(expense)}
                          className={styles.deleteButton}
                          color="error"
                        >
                          Delete
                        </Button>
                      )}
                    </Stack>
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
                              onChange={() =>
                                handleToggleAssignedFulfilled(expense.id, ae)
                              }
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

      {/* Role-change confirmation dialog (promote/demote) */}
      <Dialog
        open={roleDialogOpen}
        onClose={closeRoleDialog}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { className: styles.confirmDialogPaper } }}
      >
        <DialogTitle className={styles.confirmDialogTitle}>
          {roleDialogTitle}
        </DialogTitle>
        <DialogContent className={styles.confirmDialogContent}>
          <Typography>{roleDialogMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeRoleDialog}
            className={styles.confirmDialogButtonSecondary}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmChangeMemberRole}
            className={styles.confirmDialogButtonPrimary}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete expense confirmation dialog */}
      <Dialog
        open={deleteExpenseDialogOpen}
        onClose={closeDeleteExpenseDialog}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { className: styles.confirmDialogPaper } }}
      >
        <DialogTitle className={styles.confirmDialogTitle}>
          Delete expense
        </DialogTitle>
        <DialogContent className={styles.confirmDialogContent}>
          <Typography>
            {expenseToDelete
              ? `Are you sure you want to delete "${expenseToDelete.title}"? This action cannot be undone.`
              : ''}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeDeleteExpenseDialog}
            className={styles.confirmDialogButtonSecondary}
            disabled={deletingExpense}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteExpense}
            className={styles.confirmDialogButtonPrimary}
            color="error"
            disabled={deletingExpense}
          >
            {deletingExpense ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete member confirmation dialog */}
      <Dialog
        open={deleteMemberDialogOpen}
        onClose={closeDeleteMemberDialog}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { className: styles.confirmDialogPaper } }}
      >
        <DialogTitle className={styles.confirmDialogTitle}>
          Remove member
        </DialogTitle>
        <DialogContent className={styles.confirmDialogContent}>
          <Typography>
            {memberToDelete
              ? `Remove ${memberToDelete.full_name} from this group? They must not be part of any outstanding expenses.`
              : ''}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeDeleteMemberDialog}
            className={styles.confirmDialogButtonSecondary}
            disabled={deletingMember}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteMember}
            className={styles.confirmDialogButtonPrimary}
            color="error"
            disabled={deletingMember}
          >
            {deletingMember ? 'Removing…' : 'Remove'}
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
