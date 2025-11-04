"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Box,
  Typography,
  Avatar,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  // Auth user fields (email from auth, id for profile linkage)
  const [userId, setUserId] = useState(null);
  const [email, setEmail] = useState("");

  // Profile fields (in your DB: profiles table)
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const initials = useMemo(() => {
    const n = (fullName || email || "").trim();
    if (!n) return "?";
    const parts = n.split(/\s+/);
    const first = parts[0]?.[0] || "";
    const second = parts[1]?.[0] || "";
    return (first + second).toUpperCase() || first.toUpperCase() || "?";
  }, [fullName, email]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");
        setInfoMsg("");

        // 1) Get the current auth user
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;

        const user = userData?.user;
        if (!user) {
          // Not logged in → back to login
          router.replace("/login");
          return;
        }

        setUserId(user.id);
        setEmail(user.email || "");

        // 2) Load profile row
        const { data: profile, error: profErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profErr && profErr.code !== "PGRST116") {
          // PGRST116 = no rows found (that's fine on first visit)
          throw profErr;
        }

        if (profile) {
          setFullName(profile.full_name || "");
          setPhone(profile.phone || "");
          setAvatarUrl(profile.avatar_url || "");
        } else {
          // No row yet—prefill name from user metadata if present
          const metaName = user.user_metadata?.full_name || "";
          setFullName(metaName);
        }
      } catch (e) {
        setErrorMsg(e?.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function handleSave() {
    if (!userId) return;
    try {
      setSaving(true);
      setErrorMsg("");
      setInfoMsg("");

      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: fullName || null,
        phone: phone || null,
        email: email || null, // handy to keep in the profile table
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      setInfoMsg("Profile saved!");
      setEditing(false);
    } catch (e) {
      setErrorMsg(e?.message || "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ maxWidth: 500, m: "60px auto", p: 4, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: 500,
        m: "40px auto",
        p: 4,
        bgcolor: "#fafafa",
        borderRadius: 3,
        boxShadow: 2,
      }}
    >
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        My Profile
      </Typography>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}
      {infoMsg && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {infoMsg}
        </Alert>
      )}

      <Box display="flex" alignItems="center" mb={3}>
        <Avatar
          src={avatarUrl || undefined}
          sx={{ width: 80, height: 80, mr: 2, fontWeight: 700 }}
        >
          {initials}
        </Avatar>
        <TextField
          label="Avatar URL"
          placeholder="https://…"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          size="small"
          fullWidth
          disabled={!editing}
        />
      </Box>

      <TextField
        label="Full Name"
        fullWidth
        margin="normal"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        disabled={!editing}
      />

      <TextField
        label="Email"
        fullWidth
        margin="normal"
        value={email}
        disabled
        helperText="Email comes from your Supabase auth account"
      />

      <TextField
        label="Phone Number"
        fullWidth
        margin="normal"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        disabled={!editing}
      />

      {!editing ? (
        <Button
          variant="contained"
          fullWidth
          sx={{ mt: 3 }}
          onClick={() => setEditing(true)}
        >
          Edit Profile
        </Button>
      ) : (
        <Button
          variant="contained"
          color="success"
          fullWidth
          sx={{ mt: 3 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      )}

      {/* Optional: add a logout button */}
      {/* <Button variant="text" sx={{ mt: 1 }} onClick={async () => { await supabase.auth.signOut(); router.replace('/login'); }}>
        Log Out
      </Button> */}
    </Box>
  );
}
