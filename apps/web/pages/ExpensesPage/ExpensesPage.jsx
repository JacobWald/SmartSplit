"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Box,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Button,
  Stack,
  Checkbox,
} from "@mui/material";
import Link from "next/link";
import styles from "./ExpensesPage.module.css";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [profileId, setProfileId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);
  const [filter, setFilter] = useState("outstanding");

  // Load auth
  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        setLoadingError("You must sign in to view expenses.");
        return;
      }
      setProfileId(data.user.id);
    }
    loadUser();
  }, []);

  // Load expenses
  useEffect(() => {
    if (!profileId) return;

    async function fetchExpenses() {
      setLoading(true);

      const { data: assignments } = await supabase
        .from("assigned_expenses")
        .select("expense_id, amount, fulfilled")
        .eq("user_id", profileId);

      const assignedIds = assignments.map((a) => a.expense_id);

      const { data: expenseRows } = await supabase
        .from("expenses")
        .select("*, groups(name)")
        .or(
          `payer_id.eq.${profileId}${
            assignedIds.length ? `,id.in.(${assignedIds.join(",")})` : ""
          }`
        )
        .order("occurred_at", { ascending: false });

      // attach split data
      const final = [];
      for (const e of expenseRows) {
        const { data: split } = await supabase
          .from("assigned_expenses")
          .select("id, user_id, amount, fulfilled, profiles(full_name)")
          .eq("expense_id", e.id);

        final.push({
          ...e,
          split,
          myAssignment: assignments.find((a) => a.expense_id === e.id),
        });
      }

      setExpenses(final);
      setLoading(false);
    }

    fetchExpenses();
  }, [profileId]);

  // Toggle paid for your own assignment
  async function togglePaid(assignment) {
    await supabase
      .from("assigned_expenses")
      .update({ fulfilled: !assignment.fulfilled })
      .eq("id", assignment.id);

    // reload
    const updated = expenses.map((e) =>
      e.id === assignment.expense_id
        ? {
            ...e,
            split: e.split.map((s) =>
              s.id === assignment.id
                ? { ...s, fulfilled: !s.fulfilled }
                : s
            ),
            myAssignment: {
              ...e.myAssignment,
              fulfilled: !e.myAssignment.fulfilled,
            },
          }
        : e
    );

    setExpenses(updated);
  }

  if (loading)
    return (
      <Box className={styles.loadingBox}>
        <CircularProgress />
      </Box>
    );

  if (loadingError)
    return (
      <Box className={styles.container}>
        <Typography color="error">{loadingError}</Typography>
      </Box>
    );

  // Filter logic
  const filteredExpenses = expenses.filter((e) =>
    filter === "paid"
      ? e.myAssignment?.fulfilled === true
      : e.myAssignment?.fulfilled !== true
  );

  return (
    <Box className={styles.container}>
      <Typography variant="h4" className={styles.pageTitle}>
        My Expenses
      </Typography>

      {/* FILTER BAR */}
      <Box className={styles.filterBar}>
        <button
          className={
            filter === "outstanding"
              ? `${styles.filterButton} ${styles.filterButtonActive}`
              : styles.filterButton
          }
          onClick={() => setFilter("outstanding")}
        >
          OUTSTANDING
        </button>

        <button
          className={
            filter === "paid"
              ? `${styles.filterButton} ${styles.filterButtonActive}`
              : styles.filterButton
          }
          onClick={() => setFilter("paid")}
        >
          PAID
        </button>
      </Box>

      {/* EXPENSE GRID */}
      <div className={styles.expenseGrid}>
        {filteredExpenses.map((exp) => (
          <Card key={exp.id} className={styles.card}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between">
                <Typography className={styles.expenseTitle}>
                  {exp.title}
                </Typography>

                <span
                  className={`${styles.statusPill} ${
                    exp.myAssignment?.fulfilled
                      ? styles.statusPaid
                      : styles.statusOutstanding
                  }`}
                >
                  {exp.myAssignment?.fulfilled ? "PAID" : "OUTSTANDING"}
                </span>
              </Stack>

              <Typography className={styles.labelText}>
                Group: <strong>{exp.groups?.name}</strong>
              </Typography>

              <Typography className={styles.labelText}>
                Total: <strong>${exp.amount}</strong>
              </Typography>

              <Typography className={styles.labelText}>
                Your Share:{" "}
                <strong>${exp.myAssignment?.amount.toFixed(2)}</strong>
              </Typography>

              {exp.note && (
                <Typography
                  sx={{ marginTop: "6px" }}
                  className={styles.labelText}
                >
                  Note: <strong>{exp.note}</strong>
                </Typography>
              )}

              <Typography sx={{ mt: 1 }} className={styles.labelText}>
                {new Date(exp.occurred_at).toLocaleDateString()}
              </Typography>

              {/* SPLIT BOX */}
              <Box className={styles.splitBox}>
                <Typography className={styles.splitTitle}>
                  SPLIT BETWEEN:
                </Typography>

                {exp.split.map((u) => (
                  <Box key={u.id} className={styles.splitRow}>
                    <span>{u.profiles?.full_name}</span>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <strong>${Number(u.amount).toFixed(2)}</strong>

                      {/* YOUR checkbox only */}
                      {u.user_id === profileId && (
                        <Checkbox
                          size="small"
                          checked={!!u.fulfilled}
                          onChange={() => togglePaid(u)}
                        />
                      )}
                    </Stack>
                  </Box>
                ))}
              </Box>

              <Button
                variant="contained"
                className={styles.viewGroupButton}
                component={Link}
                href={`/groups/${exp.group_id}`}
              >
                View Group
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </Box>
  );
}