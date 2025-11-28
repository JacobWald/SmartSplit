'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AddExpenseDialog from '@/components/AddExpenseDialog';
import styles from './GroupDetailPage.module.css';

export default function ExpensesSection({
  group,
  expenses,
  expenseFilter,
  setExpenseFilter,
  isAdmin,
  isModerator,
  currentUserId,
  onExpensesUpdated,
  memberNameFor,
  formatDate,
}) {
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const [togglingAssignmentId, setTogglingAssignmentId] = useState(null);

  const [deleteExpenseDialogOpen, setDeleteExpenseDialogOpen] =
    useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(false);

  const canManageExpenses = isAdmin || isModerator;

  const filteredExpenses = useMemo(() => {
    if (!Array.isArray(expenses)) return [];

    if (expenseFilter === 'fulfilled') {
      return expenses.filter((exp) => exp.fulfilled === true);
    }
    return expenses.filter((exp) => exp.fulfilled !== true);
  }, [expenses, expenseFilter]);

  const canToggleAssignment = (assignmentUserId) => {
    if (!currentUserId) return false;
    if (isAdmin || isModerator) return true;
    return assignmentUserId === currentUserId;
  };

  const openCreateExpense = () => {
    setEditingExpense(null);
    setExpenseOpen(true);
  };

  const openEditExpense = (expense) => {
    setEditingExpense(expense);
    setExpenseOpen(true);
  };

  const handleExpenseSubmit = async ({ title, amount, assigned }) => {
    if (!group?.id || !currentUserId) {
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
          payer_id: currentUserId,
          assigned,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('Error saving expense:', data.error);
        alert(data.error || 'Failed to save expense');
        return;
      }

      await onExpensesUpdated();
      setExpenseOpen(false);
      setEditingExpense(null);
    } catch (err) {
      console.error('Error saving expense:', err);
      alert('Error saving expense. Check console.');
    } finally {
      setSavingExpense(false);
    }
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

      await onExpensesUpdated();
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

      await onExpensesUpdated();
    } catch (err) {
      console.error('Error deleting expense:', err);
      alert('Error deleting expense. Check console.');
    } finally {
      setDeletingExpense(false);
      closeDeleteExpenseDialog();
    }
  };

  return (
    <>
        <Typography variant="h6" className={styles.sectionTitle}>
            Expenses
        </Typography>
        <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mt: 3, mb: 1 }}
        >
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

            {canManageExpenses && (
                <Button
                className={styles.createButton}
                onClick={openCreateExpense}
                >
                    Add Expense
                </Button>
            )}
        </Stack>

        {/* Filter toggle bar */}

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
                        {Number(expense.amount).toFixed(2)}{' '}
                        {group.base_currency}
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

                    {expense.assigned && expense.assigned.length > 0 && (
                    <Box className={styles.splitBox}>
                        <Typography className={styles.splitLabel}>
                        Split between:
                        </Typography>
                        <List dense className={styles.splitList}>
                        {expense.assigned.map((ae) => {
                            const canToggle = canToggleAssignment(ae.user_id);
                            const loading =
                            togglingAssignmentId === ae.id;

                            return (
                            <ListItem key={ae.id} className={styles.splitRow}>
                                <Checkbox
                                size="small"
                                checked={!!ae.fulfilled}
                                onChange={() =>
                                    handleToggleAssignedFulfilled(
                                    expense.id,
                                    ae
                                    )
                                }
                                disabled={!canToggle || loading}
                                className={styles.splitCheckbox}
                                />

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

        {/* Delete expense dialog */}
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

        {/* Create / edit expense dialog */}
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
        </>
    );
}
