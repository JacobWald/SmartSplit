"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./ExpensesPage.module.css";

// 👉 Replace these with your actual values
const GROUP_ID = "5a772284-8183-46c5-a074-bed92f2d5b4d";
const PAYER_ID = "b31e95de-6eab-432c-b442-e49c1e0ef19e";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  // Load expenses initially
  useEffect(() => {
    fetchExpenses();
  }, []);

  // Fetch all expenses for this group
  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("group_id", GROUP_ID)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Error fetching expenses:", error.message);
    } else {
      setExpenses(data || []);
    }
  };

  // Add a new expense
  const handleAddExpense = async (e) => {
    e.preventDefault();

    const { error } = await supabase.from("expenses").insert([
      {
        title: description,
        amount: parseFloat(amount),
        group_id: GROUP_ID,
        payer_id: PAYER_ID,
        currency: "USD",
      },
    ]);

    if (error) {
      console.error("❌ Error adding expense:", error.message);
      alert("Failed to add expense. Check console.");
      return;
    }

    // Re-fetch after insert (avoids data[0] error)
    await fetchExpenses();

    // Clear form
    setDescription("");
    setAmount("");
  };

  return (
    <div className={styles.container}>
      <h1>💰 Group Expenses</h1>

      <form onSubmit={handleAddExpense} className={styles.form}>
        <input
          type="text"
          placeholder="Expense description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />

        <button type="submit">Add Expense</button>
      </form>

      <ul className={styles.expenseList}>
        {expenses.length === 0 && (
          <p style={{ marginTop: "20px" }}>No expenses yet.</p>
        )}

        {expenses.map((exp) => (
          <li key={exp.id} className={styles.expenseItem}>
            <strong>{exp.title}</strong> — ${exp.amount}
            <br />
            <small style={{ color: "#777" }}>
              Group: {exp.group_id} | Payer: {exp.payer_id}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
}