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
} from "@mui/material";
import Link from "next/link";
import styles from "./ExpensesPage.module.css";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [profileId, setProfileId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);

  // -----------------------------------------
  // Load current logged-in User ID
  // -----------------------------------------
  useEffect(() => {
    async function loadProfile() {
      const { data: userData, error } = await supabase.auth.getUser();
      if (error || !userData?.user) {
        setLoadingError("Unable to load user.");
        return;
      }
      setProfileId(userData.user.id);
    }
    loadProfile();
  }, []);

  // -----------------------------------------
  // Load ALL expenses for logged-in user
  // -----------------------------------------
  useEffect(() => {
    if (!profileId) return;

    async function loadExpenses() {
      setLoading(true);

      // A. Find all assigned expenses for this user
      const { data: myAssigned, error: assignErr } = await supabase
        .from("assigned_expenses")
        .select("expense_id, amount")
        .eq("user_id", profileId);

      if (assignErr) {
        console.error("Error loading assigned_expenses:", assignErr);
        setLoadingError(assignErr.message);
        setLoading(false);
        return;
      }

      const assignedIds = myAssigned.map((a) => a.expense_id);

      // B. Fetch expenses where:
      //  - user is the payer
      //  - OR expense appears in assigned_expenses
      const { data: expensesData, error: expensesErr } = await supabase
        .from("expenses")
        .select("*, groups(name)")
        .or(
          `payer_id.eq.${profileId}${
            assignedIds.length ? `,id.in.(${assignedIds.join(",")})` : ""
          }`
        )
        .order("occurred_at", { ascending: false });

      if (expensesErr) {
        console.error(expensesErr);
        setLoadingError(expensesErr.message);
        setLoading(false);
        return;
      }

      // C. Attach user's assigned amount
      const enriched = expensesData.map((exp) => {
        const match = myAssigned.find((a) => a.expense_id === exp.id);
        return {
          ...exp,
          assigned_amount: match ? match.amount : null,
        };
      });

      // ---------------------------------------------
      // D. Load SPLIT DETAILS for each expense
      // ---------------------------------------------
      const enrichedWithSplits = [];

      for (const exp of enriched) {
        const { data: assignedRows } = await supabase
          .from("assigned_expenses")
          .select("user_id, amount, profiles(full_name)")
          .eq("expense_id", exp.id);

        enrichedWithSplits.push({
          ...exp,
          assigned_split: assignedRows || [],
        });
      }

      setExpenses(enrichedWithSplits);
      setLoading(false);
    }

    loadExpenses();
  }, [profileId]);

  // -----------------------------------------
  // LOADING
  // -----------------------------------------
  if (loading)
    return (
      <Box className={styles.loadingBox}>
        <CircularProgress />
      </Box>
    );

  if (loadingError)
    return (
      <Box className={styles.container}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          My Expenses
        </Typography>
        <Typography color="error">{loadingError}</Typography>
      </Box>
    );

  // -----------------------------------------
  // MAIN UI
  // -----------------------------------------
  return (
    <Box className={styles.container}>
      <Typography variant="h4" className={styles.pageTitle}>
        My Expenses
      </Typography>

      {expenses.length === 0 ? (
        <Typography>No expenses to display.</Typography>
      ) : (
        <Stack spacing={2}>
          {expenses.map((exp) => (
            <Card key={exp.id} className={styles.card}>
              <CardContent>
                <Typography variant="h6" className={styles.expenseTitle}>
                  {exp.title}
                </Typography>

                <Typography className={styles.groupLabel}>
                  Group:{" "}
                  <strong>{exp.groups?.name || "Unknown Group"}</strong>
                </Typography>

                <Typography>
                  Total Amount: <strong>${exp.amount}</strong>
                </Typography>

                {exp.assigned_amount && (
                  <Typography>
                    Your Share: <strong>${exp.assigned_amount}</strong>
                  </Typography>
                )}

                {exp.note && (
                  <Typography sx={{ mt: 1 }}>
                    <strong>Note:</strong> {exp.note}
                  </Typography>
                )}

                <Typography sx={{ mt: 1 }}>
                  Date: {new Date(exp.occurred_at).toLocaleDateString()}
                </Typography>

                {/* SPLIT DETAILS */}
                {exp.assigned_split?.length > 0 && (
                  <Box className={styles.splitBox}>
                    <Typography className={styles.splitTitle}>
                      SPLIT BETWEEN:
                    </Typography>

                    {exp.assigned_split.map((s) => (
                      <Box key={s.user_id} className={styles.splitRow}>
                        <span>{s.profiles?.full_name || "Unknown User"}</span>
                        <strong>${Number(s.amount).toFixed(2)}</strong>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* VIEW GROUP BUTTON */}
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
        </Stack>
      )}
    </Box>
  );
}