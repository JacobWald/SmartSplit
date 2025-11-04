"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../src/utils/supabaseClient";
import styles from "./ExpensesPage.module.css";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error("Error fetching expenses:", error.message);
    else setExpenses(data || []);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.from("expenses").insert([
      {
        description,
        amount: parseFloat(amount),
        payer_id: "dc099671-6ed0-49ab-a3b0-8518dfa77bc1",
        group_id: "dc099671-6ed0-49ab-a3b0-8518dfa77bc1",
      },
    ]);

    if (error) {
      console.error("❌ Error adding expense:", error.message);
      alert("Error adding expense. Check console for details.");
    } else {
      setExpenses([data[0], ...expenses]);
      setDescription("");
      setAmount("");
    }
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
        {expenses.map((exp) => (
          <li key={exp.id}>
            <strong>{exp.description}</strong> — ${exp.amount}
          </li>
        ))}
      </ul>
    </div>
  );
}
