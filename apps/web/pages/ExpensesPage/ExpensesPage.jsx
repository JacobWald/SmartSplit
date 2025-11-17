"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSearchParams } from "next/navigation";
import styles from "./ExpensesPage.module.css";

export default function ExpensesPage() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get("group_id");

  const [expenses, setExpenses] = useState([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [profileId, setProfileId] = useState(null);

  // ---------------------------
  // 1. Fetch current user profile
  // ---------------------------
  useEffect(() => {
    async function loadProfile() {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userData.user.id)
        .single();

      if (profile) {
        setProfileId(profile.id);
      }
    }

    loadProfile();
  }, []);

  // ---------------------------
  // 2. Fetch expenses for the group
  // ---------------------------
  useEffect(() => {
    if (!groupId) return;

    async function fetchExpenses() {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching expenses:", error.message);
      } else {
        setExpenses(data || []);
      }
    }

    fetchExpenses();
  }, [groupId]);

  // ---------------------------
  // 3. Add a new expense
  // ---------------------------
  const handleAddExpense = async (e) => {
    e.preventDefault();

    if (!groupId) {
      alert("Missing group ID in URL.");
      return;
    }

    if (!profileId) {
      alert("Profile not loaded yet. Try again in a second.");
      return;
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert([
        {
          title,
          amount: parseFloat(amount),
          group_id: groupId,
          payer_id: profileId,
          currency: "USD",
          occurred_at: new Date(),
          qty: 1,
          unit_price: parseFloat(amount),
        },
      ])
      .select("*"); // <-- CRITICAL FIX (returns inserted row)

    if (error) {
      console.error("❌ Error adding expense:", error.message);
      alert(error.message);
      return;
    }

    // Safely append
    if (data && data.length > 0) {
      setExpenses([data[0], ...expenses]);
    }

    setTitle("");
    setAmount("");
  };

  // ---------------------------
  // 4. UI
  // ---------------------------
  return (
    <div className={styles.container}>
      <h1>💰 Group Expenses</h1>

      <form onSubmit={handleAddExpense} className={styles.form}>
        <input
          type="text"
          placeholder="Expense title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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
            <strong>{exp.title}</strong> — ${exp.amount}
            <br />
            <small>
              Group: {exp.group_id} | Payer: {exp.payer_id}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
}