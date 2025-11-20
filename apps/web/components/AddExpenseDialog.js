"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Autocomplete,
  Chip,
} from "@mui/material";
import { useState } from "react";

export default function AddExpenseDialog({
  open,
  onClose,
  members,
  onSubmit,
  loading,
}) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

  const handleSave = () => {
    onSubmit({
      title,
      amount: parseFloat(amount),
      selectedMembers,
    });

    setTitle("");
    setAmount("");
    setSelectedMembers([]);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Expense</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Expense Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
          />

          <TextField
            label="Total Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            fullWidth
            required
          />

          <Autocomplete
            multiple
            options={members}
            getOptionLabel={(m) => m.full_name || "(unknown)"}
            value={selectedMembers}
            onChange={(e, v) => setSelectedMembers(v)}
            renderTags={(value, getTagProps) =>
              value.map((option, idx) => (
                <Chip {...getTagProps({ index: idx })} label={option.full_name} />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} label="Assign to Members" />
            )}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading || !title || !amount || selectedMembers.length === 0}
        >
          {loading ? "Saving…" : "Save Expense"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}