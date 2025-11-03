"use client";

import { useState } from "react";
// If "@/lib/supabaseClient" alias doesn't resolve in your project,
// change this to "../../lib/supabaseClient"
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [message, setMessage] = useState("");

  async function handleAuth(e) {
    e.preventDefault();
    setMessage("");

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("✅ Signup successful! Check your email to confirm.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage("✅ Signed in successfully!");
      }
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">
        {mode === "signup" ? "Create Account" : "Sign In"}
      </h1>

      <form onSubmit={handleAuth} className="flex flex-col gap-2 w-80">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          {mode === "signup" ? "Sign Up" : "Sign In"}
        </button>
      </form>

      <p
        className="mt-3 text-sm text-blue-600 cursor-pointer"
        onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
      >
        {mode === "signup" ? "Already have an account? Sign in" : "Need an account? Sign up"}
      </p>

      {message && <p className="mt-4 text-center">{message}</p>}
    </div>
  );
}
