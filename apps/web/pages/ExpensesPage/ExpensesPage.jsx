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

  // 1) Auth: check if user is signed in
  useEffect(() => {
    async function loadUser() {
      setLoading(true);
      setLoadingError(null);

      try {
        const { data, error } = await supabase.auth.getUser();

        // Not signed in or auth error → behave like Groups page
        if (error || !data?.user) {
          console.warn("No signed-in user for Expenses page:", error);
          setProfileId(null);
          setLoading(false);
          setLoadingError("You must sign in to view the Expenses page.");
          return;
        }

        // We have a user → save the id, the expenses effect will run next
        setProfileId(data.user.id);
      } catch (err) {
        console.error("Error loading auth user:", err);
        setProfileId(null);
        setLoading(false);
        setLoadingError("You must sign in to view the Expenses page.");
      }
    }

    loadUser();
  }, []);

  // 2) Load expenses only if we have a profileId
  useEffect(() => {
    if (!profileId) {
      // If there is no profileId because user isn't signed in,
      // we already set loadingError in the auth effect.
      return;
    }

    async function fetchExpenses() {
      setLoading(true);
      setLoadingError(null);

      try {
        const {
          data: assignments,
          error: assignmentsError,
        } = await supabase
          .from("assigned_expenses")
          .select("expense_id, amount, fulfilled")
          .eq("user_id", profileId);

        if (assignmentsError) {
          throw assignmentsError;
        }

        const safeAssignments = assignments || [];
        const assignedIds = safeAssignments.map((a) => a.expense_id);

        const {
          data: expenseRows,
          error: expensesError,
        } = await supabase
          .from("expenses")
          .select("*, groups(name)")
          .or(
            `payer_id.eq.${profileId}${
              assignedIds.length ? `,id.in.(${assignedIds.join(",")})` : ""
            }`
          )
          .order("occurred_at", { ascending: false });

        if (expensesError) {
          throw expensesError;
        }

        const safeExpenses = expenseRows || [];

        const final = [];
        for (const e of safeExpenses) {
          const {
            data: split,
            error: splitError,
          } = await supabase
            .from("assigned_expenses")
            .select("id, user_id, amount, fulfilled, profiles(full_name)")
            .eq("expense_id", e.id);

          if (splitError) {
            throw splitError;
          }

          final.push({
            ...e,
            split: split || [],
            myAssignment: safeAssignments.find(
              (a) => a.expense_id === e.id
            ),
          });
        }

        setExpenses(final);
      } catch (err) {
        console.error("Error loading expenses:", err);
        setLoadingError("Failed to load expenses.");
      } finally {
        setLoading(false);
      }
    }

    fetchExpenses();
  }, [profileId]);

  // Toggle paid for your own assignment
  async function togglePaid(assignment) {
    try {
      await supabase
        .from("assigned_expenses")
        .update({ fulfilled: !assignment.fulfilled })
        .eq("id", assignment.id);

      // update local state so we don't have to refetch everything
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
    } catch (err) {
      console.error("Error toggling paid:", err);
    }
  }

  // === RENDERING ===

  // While auth/expenses are loading → spinner only
  if (loading) {
    return (
      <Box className={styles.loadingBox}>
        <CircularProgress />
      </Box>
    );
  }

  // Not signed in OR load error → show message only (like Groups page)
  if (loadingError) {
    return (
      <Box
        sx={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          px: 2,
        }}
      >
        <Typography variant="h6" sx={{ color: "var(--color-primary)" }}>
          {loadingError}
        </Typography>
      </Box>
    );
  }

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
        <Button
          className={
            filter === "outstanding"
              ? `${styles.filterButton} ${styles.filterButtonActive}`
              : styles.filterButton
          }
          onClick={() => setFilter("outstanding")}
        >
          OUTSTANDING
        </Button>

        <Button
          className={
            filter === "paid"
              ? `${styles.filterButton} ${styles.filterButtonActive}`
              : styles.filterButton
          }
          onClick={() => setFilter("paid")}
        >
          PAID
        </Button>
      </Box>

      {/* EXPENSE AREA */}
      {filteredExpenses.length === 0 ? (
        <Box className={styles.empty}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {filter === 'outstanding'
              ? 'You have no outstanding expenses.'
              : 'You have no paid expenses.'}
          </Typography>
        </Box>
      ) : (
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
                <strong>
                  $
                  {exp.myAssignment
                    ? exp.myAssignment.amount.toFixed(2)
                    : "0.00"}
                </strong>
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
                {exp.occurred_at
                  ? new Date(exp.occurred_at).toLocaleDateString()
                  : ""}
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
      )}
    </Box>
  );
}
