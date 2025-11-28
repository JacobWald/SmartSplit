'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Radio,
  RadioGroup,
  Checkbox,
  Typography,
  Stack,
  Box,
} from '@mui/material';
import { useEffect, useState } from 'react';
import styles from './AddExpenseDialog.module.css';

export default function AddExpenseDialog({
  open,
  onClose,
  members,
  onSubmit,
  loading,
  groupName,
  mode = 'create',   // 'create' or 'edit'
  expense = null,    // when editing
}) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [splitMethod, setSplitMethod] = useState('equal'); // 'equal' | 'custom'
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [customAmounts, setCustomAmounts] = useState({});

  // Initialize when dialog opens / mode changes / expense changes
  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && expense) {
      setTitle(expense.title ?? '');
      setAmount(
        expense.amount !== undefined && expense.amount !== null
          ? String(expense.amount)
          : ''
      );

      const assigned = Array.isArray(expense.assigned)
        ? expense.assigned
        : [];

      const memberIds = assigned.map((a) => a.user_id);
      setSelectedMembers(memberIds);

      if (assigned.length > 0) {
        const base = Number(assigned[0].amount ?? 0);
        const allEqual = assigned.every(
          (a) => Number(a.amount ?? 0) === base
        );
        const totalAssigned = assigned.reduce(
          (sum, a) => sum + Number(a.amount ?? 0),
          0
        );
        const total = Number(expense.amount ?? 0);

        if (
          allEqual &&
          Math.abs(totalAssigned - total) < 0.05 &&
          memberIds.length > 0
        ) {
          setSplitMethod('equal');
          setCustomAmounts({});
        } else {
          setSplitMethod('custom');
          const initialCustom = {};
          for (const a of assigned) {
            if (a.user_id) {
              initialCustom[a.user_id] =
                a.amount !== undefined && a.amount !== null
                  ? String(a.amount)
                  : '';
            }
          }
          setCustomAmounts(initialCustom);
        }
      } else {
        setSplitMethod('equal');
        setCustomAmounts({});
      }
    } else {
      // create mode: reset
      setTitle('');
      setAmount('');
      setSplitMethod('equal');
      setSelectedMembers([]);
      setCustomAmounts({});
    }
  }, [open, mode, expense]);

  const handleMemberToggle = (user_id) => {
    if (selectedMembers.includes(user_id)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== user_id));
    } else {
      setSelectedMembers([...selectedMembers, user_id]);
    }
  };

  const handleCustomAmountChange = (user_id, value) => {
    setCustomAmounts((prev) => ({
      ...prev,
      [user_id]: value,
    }));
  };

  const handleSave = () => {
    if (!title.trim() || !amount.trim()) {
      alert('Title and amount are required.');
      return;
    }
    if (selectedMembers.length === 0) {
      alert('Select at least one member.');
      return;
    }

    const total = parseFloat(amount);
    if (Number.isNaN(total) || total <= 0) {
      alert('Amount must be a positive number.');
      return;
    }

    let assigned = [];

    if (splitMethod === 'equal') {
      const split = total / selectedMembers.length;
      const each = Number(split.toFixed(2));

      assigned = selectedMembers.map((uid) => ({
        user_id: uid,
        amount: each,
      }));
    } else {
      assigned = selectedMembers.map((uid) => ({
        user_id: uid,
        amount: parseFloat(customAmounts[uid] || '0'),
      }));
    }

    onSubmit({
      title,
      amount: total,
      assigned,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { className: styles.dialogPaper } }}
    >
      <DialogTitle className={styles.dialogTitle}>
        {mode === 'edit' ? 'Edit Expense' : 'Add Expense'} for {groupName}
      </DialogTitle>

      <DialogContent className={styles.dialogContent}>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Title *"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.inputs}
          />

          <TextField
            label="Amount *"
            fullWidth
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={styles.inputs}
          />

          <Typography sx={{ mt: 2 }} className={styles.splitMethodLabel}>
            Split method
          </Typography>

          <RadioGroup
            row
            value={splitMethod}
            onChange={(e) => setSplitMethod(e.target.value)}
          >
            <FormControlLabel
              value="equal"
              control={<Radio />}
              label="Split equally"
            />
            <FormControlLabel
              value="custom"
              control={<Radio />}
              label="Custom amounts"
            />
          </RadioGroup>

          <Typography sx={{ mt: 2 }} className={styles.splitMethodLabel}>
            Members responsible
          </Typography>
          <Typography className={styles.helperText}>
            Select who is included in this expense and (optionally) adjust custom amounts.
          </Typography>

          {members.map((m) => (
            <Box key={m.user_id} className={styles.memberRow}>
              <Checkbox
                checked={selectedMembers.includes(m.user_id)}
                onChange={() => handleMemberToggle(m.user_id)}
              />
              <Typography className={styles.memberLabel}>
                {m.full_name} — {m.status}
              </Typography>

              {splitMethod === 'custom' &&
                selectedMembers.includes(m.user_id) && (
                  <TextField
                    type="number"
                    size="small"
                    className={`${styles.inputs} ${styles.customAmountField}`}
                    placeholder="Amount"
                    value={customAmounts[m.user_id] || ''}
                    onChange={(e) =>
                      handleCustomAmountChange(m.user_id, e.target.value)
                    }
                  />
                )}
            </Box>
          ))}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={onClose}
          disabled={loading}
          className={styles.dialogButton}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading}
          className={styles.dialogButton}
        >
          {mode === 'edit' ? 'Save Changes' : 'Save Expense'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
