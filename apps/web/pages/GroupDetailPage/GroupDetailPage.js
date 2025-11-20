"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Box,
  Typography,
  CircularProgress,
  List,
  ListItem,
  Divider,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { supabase } from "@/lib/supabaseClient";
import styles from "./GroupDetailPage.module.css";

export default function GroupDetailPage() {
  const { slug } = useParams();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // for popup + creating an expense
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [profileId, setProfileId] = useState(null);
  const [creating, setCreating] = useState(false);

  // -------------------------
  // Fetch current user profile id
  // -------------------------
  useEffect(() => {
    async function loadProfile() {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userData.user.id)
        .single();

      if (profile) setProfileId(profile.id);
    }

    loadProfile();
  }, []);

  // -------------------------
  // Fetch Group Details
  // -------------------------
  useEffect(() => {
    if (!slug) return;

    (async () => {
      try {
        const res = await fetch(`/api/groups?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to fetch group");

        // handle array or single object
        const g = Array.isArray(data) ? data[0] : data;
        setGroup(g);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  // -------------------------
  // Loading & Error UI
  // -------------------------
  if (loading) {
    return (
      <Box
        sx={{
          height: "70vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !group) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h5" color="error">
          {error || "Group not found."}
        </Typography>
      </Box>
    );
  }

  // -------------------------
  // Add Expense (popup)
  // -------------------------
  const openDialog = () => {
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (creating) return;
    setDialogOpen(false);
    setTitle("");
    setAmount("");
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();

    if (!group?.id) {
      alert("Missing group id.");
      return;
    }
    if (!profileId) {
      alert("Profile not loaded yet, please try again in a moment.");
      return;
    }

    try {
      setCreating(true);

      const { data, error } = await supabase
        .from("expenses")
        .insert([
          {
            title,
            amount: parseFloat(amount),
            group_id: group.id,
            payer_id: profileId,
            currency: "USD",
            occurred_at: new Date(),
            qty: 1,
            unit_price: parseFloat(amount),
          },
        ])
        .select("*");

      if (error) {
        console.error("Error creating expense:", error.message);
        alert(error.message);
        return;
      }

      // later Jacob can use this expense data when he builds the group expenses view
      console.log("Created expense:", data);

      closeDialog();
    } finally {
      setCreating(false);
    }
  };

  // -------------------------
  // MAIN UI
  // -------------------------
  return (
    <Box sx={{ p: 4 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="h4">{group.name}</Typography>

        {/* Add Expense opens dialog instead of navigating away */}
        <Button className={styles.createButton} onClick={openDialog}>
          Add Expense
        </Button>
      </Stack>

      <Typography variant="body1" sx={{ mb: 4 }}>
        Base Currency: {group.base_currency}
      </Typography>

      {/* Members Section */}
      <Typography variant="h6" sx={{ mb: 1 }}>
        Members
      </Typography>

      <List sx={{ border: "1px solid #ccc", borderRadius: 2 }}>
        {group.members.map((m) => (
          <div key={m.user_id}>
            <ListItem>
              {m.full_name} — {m.role} ({m.status})
            </ListItem>
            <Divider />
          </div>
        ))}
      </List>

      {/* Expenses Section placeholder for Jacob */}
      <Typography variant="h6" sx={{ mb: 1, mt: 4 }}>
        Expenses
      </Typography>

      {/* --- Add Expense Dialog --- */}
      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add Expense for {group.name}</DialogTitle>
        <form onSubmit={handleCreateExpense}>
          <DialogContent sx={{ pt: 2 }}>
            <TextField
              label="Title"
              fullWidth
              margin="normal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <TextField
              label="Amount"
              type="number"
              fullWidth
              margin="normal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              inputProps={{ step: "0.01", min: "0" }}
            />
            {/* later we can extend this dialog to add per-member splits */}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating || !title || !amount}>
              {creating ? "Saving…" : "Save Expense"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}