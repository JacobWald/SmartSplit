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
  Box
} from '@mui/material';
import { useState } from 'react';

export default function AddExpenseDialog({
  open,
  onClose,
  members,
  onSubmit,
  loading,
  groupName
}) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [splitMethod, setSplitMethod] = useState('equal');

  // For selecting members
  const [selectedMembers, setSelectedMembers] = useState([]);

  // For custom amounts
  const [customAmounts, setCustomAmounts] = useState({});

  const handleMemberToggle = (user_id) => {
    if (selectedMembers.includes(user_id)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== user_id));
    } else {
      setSelectedMembers([...selectedMembers, user_id]);
    }
  };

  const handleCustomAmountChange = (user_id, value) => {
    setCustomAmounts({
      ...customAmounts,
      [user_id]: value
    });
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

    let assigned = [];

    if (splitMethod === 'equal') {
      const split = parseFloat(amount) / selectedMembers.length;
      const each = Number(split.toFixed(2));

      assigned = selectedMembers.map((uid) => ({
        user_id: uid,
        amount: each
      }));
    } else {
      assigned = selectedMembers.map((uid) => ({
        user_id: uid,
        amount: parseFloat(customAmounts[uid] || 0)
      }));
    }

    onSubmit({
      title,
      amount: parseFloat(amount),
      assigned
    });

    setTitle('');
    setAmount('');
    setSelectedMembers([]);
    setCustomAmounts({});
    setSplitMethod('equal');
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Expense for {groupName}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Title *"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <TextField
            label="Amount *"
            fullWidth
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <Typography sx={{ mt: 2 }}>Split method</Typography>

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

          <Typography sx={{ mt: 2 }}>Members responsible</Typography>

          {members.map((m) => (
            <Box key={m.user_id} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Checkbox
                checked={selectedMembers.includes(m.user_id)}
                onChange={() => handleMemberToggle(m.user_id)}
              />
              <Typography sx={{ flexGrow: 1 }}>
                {m.full_name} — {m.status}
              </Typography>

              {splitMethod === 'custom' && selectedMembers.includes(m.user_id) && (
                <TextField
                  type="number"
                  size="small"
                  sx={{ width: 120 }}
                  placeholder="Amount"
                  value={customAmounts[m.user_id] || ''}
                  onChange={(e) => handleCustomAmountChange(m.user_id, e.target.value)}
                />
              )}
            </Box>
          ))}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={loading}>
          Save Expense
        </Button>
      </DialogActions>
    </Dialog>
  );
}