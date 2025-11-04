"use client";
import React from "react";
import './LandingPage.module.css'

export default function LandingPage() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>🎉 Welcome to SmartSplit</h1>
      <p>
        SmartSplit helps groups track and split expenses fairly. 
        Easily add bills, assign who paid, and settle up instantly.
      </p>
      <a href="/expenses">
        <button style={{ marginTop: "20px", padding: "10px 20px" }}>
          Go to Expenses
        </button>
      </a>
    </div>
  );
}
