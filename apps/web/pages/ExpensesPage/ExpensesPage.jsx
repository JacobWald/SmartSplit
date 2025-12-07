"use client";

import React, { useState, useEffect, useCallback } from "react";
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

  useEffect(() => {
    async function loadUser() {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          setLoadingError("You must sign in to view the Expenses page.");
          setProfileId(null);
          setLoading(false);
          return;
        }
        setProfileId(data.user.id);
      } catch {
        setLoadingError("You must sign in to view the Expenses page.");
        setProfileId(null);
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const refreshExpenses = useCallback(async () => {
    if (!profileId) return;

    setLoading(true);
    setLoadingError(null);

    try {
      const { data: assignments, error: aErr } = await supabase
        .from("assigned_expenses")
        .select("expense_id, amount, fulfilled, id")
        .eq("user_id", profileId);

      if (aErr) throw aErr;

      const myAssignments = assignments || [];
      const expenseIds = myAssignments.map(a => a.expense_id);

      const { data: expenseRows, error: eErr } = await supabase
        .from("expenses")
        .select("*, groups(name)")
        .or(
          `payer_id.eq.${profileId}${
            expenseIds.length ? `,id.in.(${expenseIds.join(",")})` : ""
          }`
        )
        .order("occurred_at", { ascending: false });

      if (eErr) throw eErr;

      const combined = (expenseRows || [])
        .map(exp => {
          const mine = myAssignments.find(a => a.expense_id === exp.id);
          if (!mine) return null;
          return { ...exp, myAssignment: mine };
        })
        .filter(Boolean);

      setExpenses(combined);
    } catch (err) {
      console.error("Error refreshing expenses:", err);
      setLoadingError("Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    if (profileId) refreshExpenses();
  }, [profileId, refreshExpenses]);

  async function togglePaid(assignment) {
    try {
      await supabase
        .from("assigned_expenses")
        .update({ fulfilled: !assignment.fulfilled })
        .eq("id", assignment.id);

      refreshExpenses();
    } catch (err) {
      console.error("Toggle paid error:", err);
    }
  }

  if (loading) {
    return (
      <Box className={styles.loadingBox}>
        <CircularProgress />
      </Box>
    );
  }

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

  const filteredExpenses = expenses.filter(exp =>
    filter === "paid"
      ? exp.myAssignment?.fulfilled === true
      : exp.myAssignment?.fulfilled !== true
  );

  return (
    <Box className={styles.container}>
      <Typography variant="h4" className={styles.pageTitle}>
        My Expenses
      </Typography>

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

      {filteredExpenses.length === 0 ? (
        <Box className={styles.empty}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {filter === "outstanding"
              ? "You have no outstanding expenses."
              : "You have no paid expenses."}
          </Typography>
        </Box>
      ) : (
        <div className={styles.expenseGrid}>
          {filteredExpenses.map(exp => (
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
                  <Typography sx={{ marginTop: "6px" }} className={styles.labelText}>
                    Note: <strong>{exp.note}</strong>
                  </Typography>
                )}

                <Typography sx={{ mt: 1 }} className={styles.labelText}>
                  {exp.occurred_at
                    ? new Date(exp.occurred_at).toLocaleDateString()
                    : ""}
                </Typography>

                <Stack direction="row" alignItems="center" sx={{ mt: 1 }}>
                  <Checkbox
                    checked={!!exp.myAssignment?.fulfilled}
                    onChange={() => togglePaid(exp.myAssignment)}
                  />
                  <Typography className={styles.labelText}>
                    Mark as Paid
                  </Typography>
                </Stack>

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