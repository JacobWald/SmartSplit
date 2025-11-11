"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Box, Typography, CircularProgress, List, ListItem, Divider, Stack, Button } from "@mui/material";
import styles from './GroupDetailPage.module.css'

export default function GroupDetailPage() {
  const { slug } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;

    (async () => {
      try {
        const res = await fetch(`/api/groups?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch group");
        setGroup(Array.isArray(data) ? data[0] : data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <Box sx={{ height: "70vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
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

  return (
    <Box sx={{ p: 4 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h4">{group.name}</Typography>
            <Button className={styles.createButton} onClick={() => {}}>
            Add Expense
            </Button>
        </Stack>
        <Typography variant="body1" sx={{ mb: 4 }}>
            Base Currency: {group.base_currency}
        </Typography>

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
        <Typography variant="h6" sx={{ mb: 1 }}>
            Expenses
        </Typography>
    </Box>
  );
}
