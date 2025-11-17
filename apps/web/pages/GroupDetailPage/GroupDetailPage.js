"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Typography,
  CircularProgress,
  List,
  ListItem,
  Divider,
  Stack,
  Button,
} from "@mui/material";
import styles from "./GroupDetailPage.module.css";

export default function GroupDetailPage() {
  const { slug } = useParams();
  const router = useRouter();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

        // Handle both array or object formats
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
  // Navigate to Expenses Page WITH group_id
  // -------------------------
  const handleAddExpense = () => {
    if (!group?.id) {
      console.error("ERROR: Missing group.id");
      return;
    }

    // Go to the expenses page with ?group_id=<uuid>
    router.push(`/expenses?group_id=${group.id}`);
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

        {/* Add Expense Button */}
        <Button className={styles.createButton} onClick={handleAddExpense}>
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

      {/* Expenses Section */}
      <Typography variant="h6" sx={{ mb: 1, mt: 4 }}>
        Expenses
      </Typography>

      {/* Whatever Jacob builds will go below */}
    </Box>
  );
}