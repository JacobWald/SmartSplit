"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  RadioGroup,
  Radio,
  Stack,
} from "@mui/material";
import styles from "./AddExpenseDialog.module.css";

export default function AddExpenseDialog({
  open,
  onClose,
  members = [],
  onSubmit,
  loading = false,
  groupName = "",
  mode = "create",           // 🔥 NEW
  expense = null,            // 🔥 NEW
}) {
  const isEdit = mode === "edit";

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [splitMethod, setSplitMethod] = useState("equal");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [customAmounts, setCustomAmounts] = useState({});
  const [error, setError] = useState("");

  const acceptedMembers = members.filter((m) => m.status === "ACCEPTED");

  // ----------------------------------------------------
  // LOAD EXISTING DATA WHEN EDITING
  // ----------------------------------------------------
  useEffect(() => {
    if (!open) return; // only load when dialog opens

    if (isEdit && expense) {
      setTitle(expense.title);
      setAmount(String(expense.amount));
      setNote(expense.note || "");

      const assigned = expense.assigned || [];

      // Determine split method
      const hasCustom = assigned.some((a) => a.amount !== null);
      setSplitMethod(hasCustom ? "custom" : "equal");

      const memberIds = assigned.map((a) => a.user_id);
      setSelectedMembers(memberIds);

      const amountsMap = {};
      assigned.forEach((a) => {
        amountsMap[a.user_id] =
          a.amount !== null ? String(a.amount) : "";
      });
      setCustomAmounts(amountsMap);
    } else {
      // Reset for CREATE
      setTitle("");
      setAmount("");
      setNote("");
      setSplitMethod("equal");
      setSelectedMembers(acceptedMembers.map((m) => m.user_id));
      setCustomAmounts({});
    }
  }, [open, isEdit, expense, members]);

  const handleToggleMember = (id) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(selectedMembers.filter((m) => m !== id));
    } else {
      setSelectedMembers([...selectedMembers, id]);
    }
  };

  const handleCustomAmountChange = (userId, val) => {
    setCustomAmounts({
      ...customAmounts,
      [userId]: val,
    });
  };

  // ----------------------------------------------------
  // SAVE (Create or Edit)
  // ----------------------------------------------------
  const handleSave = () => {
    setError("");

    if (!title.trim()) return setError("Title is required");
    if (!amount || Number(amount) <= 0)
      return setError("Amount must be greater than 0");

    if (selectedMembers.length === 0)
      return setError("Select at least one member");

    const total = Number(amount);

    // Custom split must sum correctly
    if (splitMethod === "custom") {
      let sum = 0;
      selectedMembers.forEach((id) => {
        const val = parseFloat(customAmounts[id] || 0);
        sum += isNaN(val) ? 0 : val;
      });

      if (Math.round(sum * 100) !== Math.round(total * 100)) {
        return setError(
          "Custom amounts must add up exactly to the total."
        );
      }
    }

    // ---------------------- PAYLOAD ----------------------
    const payload = {
      mode,
      id: isEdit ? expense.id : undefined,
      title,
      amount: total,
      note,
      assigned: selectedMembers.map((uid) => ({
        user_id: uid,
        amount:
          splitMethod === "custom"
            ? Number(customAmounts[uid] || 0)
            : Number(total / selectedMembers.length),
      })),
    };

    onSubmit(payload);
  };

  return (
    <Dialog
      open={open}
      onClose={() => (!loading ? onClose() : null)}
      fullWidth
      maxWidth="sm"
      classes={{ paper: styles.dialogPaper }}
    >
      <DialogTitle className={styles.dialogTitle}>
        {isEdit ? "Edit Expense" : `Add Expense for ${groupName}`}
      </DialogTitle>

      <DialogContent className={styles.dialogContent}>
        <Stack spacing={2}>
          <TextField
            label="Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
          />

          <TextField
            label="Amount *"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            fullWidth
          />

          <TextField
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />

          <div className={styles.splitMethodLabel}>Split method</div>

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

          <div className={styles.splitMethodLabel}>Members responsible</div>

          <p className={styles.helperText}>
            Select members included in this expense.
            {splitMethod === "custom"
              ? " Enter individual amounts below."
              : ""}
          </p>

          {acceptedMembers.map((m) => (
            <div key={m.user_id} className={styles.memberRow}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedMembers.includes(m.user_id)}
                    onChange={() => handleToggleMember(m.user_id)}
                  />
                }
                label={`${m.full_name} — ${m.status}`}
              />

              {splitMethod === "custom" &&
                selectedMembers.includes(m.user_id) && (
                  <TextField
                    type="number"
                    placeholder="Amount"
                    className={styles.customAmountField}
                    value={customAmounts[m.user_id] || ""}
                    onChange={(e) =>
                      handleCustomAmountChange(
                        m.user_id,
                        e.target.value
                      )
                    }
                  />
                )}
            </div>
          ))}

          {error && (
            <p style={{ color: "red", fontWeight: 600 }}>
              {error}
            </p>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>

        <Button onClick={handleSave} disabled={loading}>
          {isEdit ? "Save Changes" : "Save Expense"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}