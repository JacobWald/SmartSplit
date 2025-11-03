"use client";

import React, { useState, useEffect } from "react";
import styles from "../styles/ExpensesPage.module.css";
import { createClient } from "@supabase/supabase-js";

// TEMP: use public anon key from .env.local (already set)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ExpensesPage() {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);

  // TEMP: fetch basic list (no group filter yet)
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("id, description, amount, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (!error && data) setExpenses(data);
    })();
  }, []);

  const handleAddExpense = async () => {
    if (!amount) return alert("Amount is required");
    setLoading(true);
    // TEMP INSERT: ONLY columns that exist & don’t require FKs
    const { data, error } = await supabase
      .from("expenses")
      .insert([{ amount: Number(amount), description }])
      .select();
    setLoading(false);
    if (error) {
      console.error("❌ Error adding expense:", error.message);
      alert("Error adding expense. Check console for details.");
    } else if (data && data[0]) {
      setExpenses([data[0], ...expenses]);
      setDescription("");
      setAmount("");
    }
  };

  return (
    <div className={styles.expenseBox}>
      <h2 className={styles.expenseTitle}>Add Expense</h2>

      <div className={styles.expenseForm}>
        <input
          className={styles.input}
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          className={styles.input}
          placeholder="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <button
          className={styles.buttonPrimary}
          onClick={handleAddExpense}
          disabled={loading}
        >
          {loading ? "Adding..." : "Add Expense"}
        </button>

        <p className={styles.helper}>
          Temporary flow: inserts amount + description only. Once groups/login
          are finalized we’ll add <code>group_id</code> and <code>payer_id</code>.
        </p>

        {expenses.length > 0 && (
          <ul>
            {expenses.map((x) => (
              <li key={x.id}>
                {x.description || "Untitled"} — ${x.amount}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
