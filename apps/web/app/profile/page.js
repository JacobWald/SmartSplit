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

// Input styling (matches rest of app)
const inputSx = {
  "& .MuiOutlinedInput-root": {
    backgroundColor: "var(--color-bg)",
    color: "var(--color-primary)",
    borderRadius: "8px",
    boxShadow: "0 1px 4px rgba(0, 0, 0, 0.15)",
  },
  "& .MuiOutlinedInput-input": {
    color: "var(--color-primary)",
  },
};

// Card style used for both "My Profile" and "My Friends"
const cardSx = {
  backgroundColor: "var(--color-primary)",
  color: "var(--color-tertiary)",
  borderRadius: "16px",
  boxShadow: "0 12px 40px rgba(0, 0, 0, 0.25)",
  flex: 1,
  minWidth: 0,
  p: 3,
};

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  // Auth / profile state
  const [userId, setUserId] = useState(null);
  const [email, setEmail] = useState("");

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState(""); // username shown under full name
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Friends (accepted)
  const [friends, setFriends] = useState([]);

  // Friend requests (incoming → TO this user)
  const [incomingRequests, setIncomingRequests] = useState([]);

  // UI state for friend actions
  const [friendUsernameInput, setFriendUsernameInput] = useState("");
  const [addingFriend, setAddingFriend] = useState(false);
  const [removingFriendId, setRemovingFriendId] = useState(null);
  const [respondingRequestId, setRespondingRequestId] = useState(null);

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

        // 1) Get current auth user
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        const user = data?.user;
        if (!user) {
          router.replace("/login");
          return;
        }

        setUserId(user.id);
        setEmail(user.email || "");

        // Initial username from auth metadata (for self-check, etc.)
        const usernameFromMeta = user.user_metadata?.username || "";
        if (usernameFromMeta) {
          setUsername(usernameFromMeta);
        }

        // 2) Load profile row
        const { data: profile, error: profErr } = await supabase
          .from("profiles")
          .select("full_name, display_name, phone, avatar_url, email, username")
          .eq("id", user.id)
          .single();

        // Any error other than "no rows found" → real error
        if (profErr && profErr.code !== "PGRST116") {
          throw profErr;
        }

        if (profile) {
          // Profile row exists: prefer full_name, then display_name, then metadata
          const nameFromProfile =
            profile.full_name ||
            profile.display_name ||
            user.user_metadata?.full_name ||
            user.user_metadata?.display_name ||
            "";

          const phoneFromProfile =
            profile.phone || user.user_metadata?.phone || "";

          const usernameFromProfile =
            profile.username || user.user_metadata?.username || "";

          setFullName(nameFromProfile);
          setPhone(phoneFromProfile);
          setAvatarUrl(profile.avatar_url || "");
          setEmail(profile.email || user.email || "");
          if (usernameFromProfile) {
            setUsername(usernameFromProfile);
          }

          // Backfill username into profiles if missing but present in auth metadata
          if (!profile.username && user.user_metadata?.username) {
            try {
              const { error: patchErr } = await supabase
                .from("profiles")
                .update({
                  username: user.user_metadata.username,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", user.id);

              if (patchErr) {
                console.error("Error backfilling username:", patchErr);
              }
            } catch (patchErr) {
              console.error(
                "Unexpected error backfilling username:",
                patchErr
              );
            }
          }
        } else {
          // No profile row yet: build from auth metadata and auto-create row
          const nameFromMeta =
            user.user_metadata?.full_name ||
            user.user_metadata?.display_name ||
            "";
          const phoneFromMeta = user.user_metadata?.phone || "";
          const usernameFromMeta2 = user.user_metadata?.username || "";

          setFullName(nameFromMeta);
          setPhone(phoneFromMeta);
          setAvatarUrl("");
          setEmail(user.email || "");
          if (usernameFromMeta2) {
            setUsername(usernameFromMeta2);
          }

          // Auto-upsert a row so next visits read from the profiles table
          const { error: insertErr } = await supabase.from("profiles").upsert({
            id: user.id,
            full_name: nameFromMeta || null,
            display_name: nameFromMeta || null,
            phone: phoneFromMeta || null,
            email: user.email || null,
            username: usernameFromMeta2 || null,
            avatar_url: null,
            updated_at: new Date().toISOString(),
          });
          if (insertErr) {
            console.error("Error auto-creating profile row:", insertErr);
          }
        }

        // 3) Load accepted friends
        const { data: friendsRows, error: friendsErr } = await supabase
          .from("user_friends")
          .select(
            `
            id,
            created_at,
            friend:friend_id (
              id,
              full_name,
              username,
              phone
            )
          `
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (friendsErr) {
          throw friendsErr;
        }
        setFriends(friendsRows || []);

        // 4) Load incoming friend requests (to this user, pending)
        const { data: reqRows, error: reqErr } = await supabase
          .from("user_friend_requests")
          .select(
            `
            id,
            created_at,
            from_user:from_user_id (
              id,
              full_name,
              username,
              phone
            )
          `
          )
          .eq("to_user_id", user.id)
          .eq("status", "PENDING")
          .order("created_at", { ascending: false });

        if (reqErr) {
          throw reqErr;
        }
        setIncomingRequests(reqRows || []);
      } catch (e) {
        console.error("Error loading profile:", e);
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

      const updates = {
        id: userId,
        full_name: fullName || null,
        display_name: fullName || null,
        phone: phone || null,
        email: email || null,
        username: username || null,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(updates);
      if (error) throw error;

      setInfoMsg("Profile saved!");
      setEditing(false);
    } catch (e) {
      console.error("Error saving profile:", e);
      setErrorMsg(e?.message || "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  }

  // SEND friend request by username
  async function handleAddFriend() {
    if (!userId) return;

    const raw = friendUsernameInput.trim();
    if (!raw) {
      setErrorMsg("Please enter a username.");
      return;
    }

    const normalized = raw.toLowerCase();

    // Prevent adding yourself
    if (username && username.toLowerCase() === normalized) {
      setErrorMsg("You cannot add yourself as a friend.");
      return;
    }

    try {
      setAddingFriend(true);
      setErrorMsg("");
      setInfoMsg("");

      // 1) Look up the friend in profiles by username (case-insensitive)
      const { data: friendProfile, error: lookupError } = await supabase
        .from("profiles")
        .select("id, full_name, username, phone")
        .ilike("username", normalized)
        .single();

      if (lookupError || !friendProfile) {
        console.error("Friend lookup error:", lookupError);
        setErrorMsg(`No user found with username "${raw}".`);
        return;
      }

      // 2) Insert into user_friend_requests as PENDING
      const { error: reqErr } = await supabase
        .from("user_friend_requests")
        .insert({
          from_user_id: userId,
          to_user_id: friendProfile.id,
        });

      if (reqErr) {
        console.error("Friend request insert error:", reqErr);
        if (
          reqErr.code === "23505" ||
          (reqErr.message || "").toLowerCase().includes("duplicate")
        ) {
          setErrorMsg("A pending friend request already exists.");
        } else {
          setErrorMsg(reqErr.message || "Unable to send friend request.");
        }
        return;
      }

      setFriendUsernameInput("");
      setInfoMsg("Friend request sent!");
    } catch (e) {
      console.error("Error sending friend request:", e);
      setErrorMsg(e?.message || "Unable to send friend request.");
    } finally {
      setAddingFriend(false);
    }
  }

  // ACCEPT or REJECT a pending friend request
  async function handleRespondToRequest(requestId, fromUserId, action) {
    if (!userId) return;

    try {
      setRespondingRequestId(requestId);
      setErrorMsg("");
      setInfoMsg("");

      // 1) Update request status
      const { error: updateError } = await supabase
        .from("user_friend_requests")
        .update({
          status: action === "ACCEPT" ? "ACCEPTED" : "REJECTED",
          responded_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("to_user_id", userId)
        .eq("status", "PENDING");

      if (updateError) {
        console.error("Error updating friend request:", updateError);
        setErrorMsg(updateError.message || "Unable to update friend request.");
        return;
      }

      if (action === "ACCEPT") {
        // 2) Create mutual friendships in user_friends
        const { error: insertError } = await supabase
          .from("user_friends")
          .insert([
            { user_id: userId, friend_id: fromUserId },
            { user_id: fromUserId, friend_id: userId },
          ]);

        if (insertError) {
          console.error("Error inserting friends:", insertError);
        }

        // 3) Refresh friends list
        const { data: friendsRows, error: friendsErr } = await supabase
          .from("user_friends")
          .select(
            `
            id,
            created_at,
            friend:friend_id (
              id,
              full_name,
              username,
              phone
            )
          `
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (!friendsErr) {
          setFriends(friendsRows || []);
        }

        setInfoMsg("Friend request accepted.");
      } else {
        setInfoMsg("Friend request rejected.");
      }

      // Remove request from local state
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (e) {
      console.error("Error responding to request:", e);
      setErrorMsg(e?.message || "Unable to respond to friend request.");
    } finally {
      setRespondingRequestId(null);
    }
  }

  async function handleRemoveFriend(friendRowId) {
    if (!userId) return;

    try {
      setRemovingFriendId(friendRowId);
      setErrorMsg("");
      setInfoMsg("");

      const { error } = await supabase
        .from("user_friends")
        .delete()
        .eq("id", friendRowId)
        .eq("user_id", userId);

      if (error) {
        console.error("Error removing friend:", error);
        setErrorMsg(error.message || "Unable to remove friend.");
        return;
      }

      setFriends((prev) => prev.filter((f) => f.id !== friendRowId));
      setInfoMsg("Friend removed.");
    } catch (e) {
      console.error("Error removing friend:", e);
      setErrorMsg(e?.message || "Unable to remove friend.");
    } finally {
      setRemovingFriendId(null);
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          maxWidth: 500,
          m: "60px auto",
          p: 4,
          textAlign: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: 1200,
        width: "96vw",
        mx: "auto",
        mt: 6,
        mb: 6,
      }}
    >
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

      {/* Two side-by-side cards on desktop, stacked on mobile */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 3,
          alignItems: "flex-start",
        }}
      >
        {/* LEFT: My Profile card */}
        <Box sx={cardSx}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            My Profile
          </Typography>

          {/* Avatar + avatar URL */}
          <Box display="flex" alignItems="center" mb={3}>
            <Avatar
              src={avatarUrl || undefined}
              sx={{
                width: 80,
                height: 80,
                mr: 2,
                fontWeight: 700,
                bgcolor: "var(--color-secondary)",
                color: "var(--color-primary)",
              }}
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
              sx={inputSx}
            />
          </Box>

          {/* Full name / username / email / phone bound to Supabase */}
          <TextField
            label="Full Name"
            fullWidth
            margin="normal"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={!editing}
            sx={inputSx}
          />

          {/* Username displayed right under Full Name */}
          <TextField
            label="Username"
            fullWidth
            margin="normal"
            value={username}
            disabled // read-only; managed via signup / profile logic
            sx={inputSx}
          />

          <TextField
            label="Email"
            fullWidth
            margin="normal"
            value={email}
            disabled
            sx={inputSx}
          />

          <TextField
            label="Phone Number"
            fullWidth
            margin="normal"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={!editing}
            sx={inputSx}
          />

          {/* Edit / Save buttons */}
          {!editing ? (
            <Button
              variant="contained"
              fullWidth
              onClick={() => setEditing(true)}
              sx={{
                mt: 3,
                backgroundColor: "var(--color-bg)",
                color: "var(--color-primary)",
                boxShadow: "0 1px 4px rgba(0, 0, 0, 0.15)",
                "&:hover": {
                  backgroundColor: "var(--color-bg)",
                  opacity: 0.9,
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
                },
              }}
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
        </Box>

        {/* RIGHT: My Friends card */}
        <Box sx={cardSx}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            My Friends
          </Typography>

          {/* Add friend by username */}
          <Box display="flex" gap={1} mb={2} flexWrap="wrap">
            <TextField
              label="Add friend by username"
              placeholder="username"
              value={friendUsernameInput}
              onChange={(e) => setFriendUsernameInput(e.target.value)}
              size="small"
              sx={{ ...inputSx, flex: 1, minWidth: 0 }}
            />
            <Button
              variant="contained"
              onClick={handleAddFriend}
              disabled={addingFriend || !friendUsernameInput.trim()}
              sx={{
                minWidth: 120,
                backgroundColor: "var(--color-bg)",
                color: "var(--color-primary)",
                boxShadow: "0 1px 4px rgba(0, 0, 0, 0.15)",
                "&:hover": {
                  backgroundColor: "var(--color-bg)",
                  opacity: 0.9,
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
                },
              }}
            >
              {addingFriend ? "Adding…" : "Add Friend"}
            </Button>
          </Box>

          {/* Friend Requests (incoming) */}
          <Box mb={2}>
            {incomingRequests.length > 0 ? (
              <>
                <Typography
                  variant="h6"
                  sx={{ mb: 1, color: "var(--color-primary)" }}
                >
                  Friend Requests
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                  }}
                >
                  {incomingRequests.map((req) => {
                    const from = req.from_user || {};
                    const displayName = from.full_name || from.username || "";
                    const phoneVal = from.phone || "";

                    return (
                      <Box
                        key={req.id}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          p: 1.5,
                          borderRadius: "12px",
                          backgroundColor: "var(--color-bg)",
                          boxShadow: "0 1px 4px rgba(0, 0, 0, 0.15)",
                        }}
                      >
                        <Box>
                          <Typography
                            sx={{
                              fontWeight: 600,
                              color: "var(--color-primary)",
                            }}
                          >
                            {displayName || "(No name)"}
                            {from.username && (
                              <Typography
                                component="span"
                                sx={{
                                  color: "var(--color-primary)",
                                  ml: 0.5,
                                  fontSize: "0.9rem",
                                }}
                              >
                                ({`@${from.username}`})
                              </Typography>
                            )}
                          </Typography>

                          {phoneVal && (
                            <Typography
                              variant="body2"
                              sx={{ color: "var(--color-primary)" }}
                            >
                              {phoneVal}
                            </Typography>
                          )}

                          <Typography
                            variant="caption"
                            sx={{ color: "var(--color-primary)" }}
                          >
                            Requested:{" "}
                            {req.created_at
                              ? new Date(
                                  req.created_at
                                ).toLocaleDateString()
                              : ""}
                          </Typography>
                        </Box>

                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() =>
                              handleRespondToRequest(
                                req.id,
                                from.id,
                                "ACCEPT"
                              )
                            }
                            disabled={respondingRequestId === req.id}
                          >
                            {respondingRequestId === req.id
                              ? "Accepting…"
                              : "Accept"}
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() =>
                              handleRespondToRequest(
                                req.id,
                                from.id,
                                "REJECT"
                              )
                            }
                            disabled={respondingRequestId === req.id}
                          >
                            {respondingRequestId === req.id
                              ? "Rejecting…"
                              : "Reject"}
                          </Button>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </>
            ) : (
              <Typography variant="body2">
                No pending friend requests.
              </Typography>
            )}
          </Box>

          {/* Accepted friends list */}
          {friends.length === 0 ? (
            <Typography variant="body2">
              You haven&apos;t added any friends yet.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {friends.map((f) => {
                const friend = f.friend || {};
                const displayName = friend.full_name || friend.username || "";
                const phoneVal = friend.phone || "";

                return (
                  <Box
                    key={f.id}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      p: 1.5,
                      borderRadius: "12px",
                      backgroundColor: "var(--color-bg)",
                      boxShadow: "0 1px 4px rgba(0, 0, 0, 0.15)",
                    }}
                  >
                    <Box>
                      <Typography
                        sx={{
                          fontWeight: 600,
                          color: "var(--color-primary)",
                        }}
                      >
                        {displayName || "(No name)"}
                        {friend.username && (
                          <Typography
                            component="span"
                            sx={{
                              color: "var(--color-primary)",
                              ml: 0.5,
                              fontSize: "0.9rem",
                            }}
                          >
                            ({`@${friend.username}`})
                          </Typography>
                        )}
                      </Typography>

                      {phoneVal && (
                        <Typography
                          variant="body2"
                          sx={{ color: "var(--color-primary)" }}
                        >
                          {phoneVal}
                        </Typography>
                      )}

                      <Typography
                        variant="caption"
                        sx={{ color: "var(--color-primary)" }}
                      >
                        Friends since{" "}
                        {f.created_at
                          ? new Date(f.created_at).toLocaleDateString()
                          : ""}
                      </Typography>
                    </Box>
                    <Button
                      variant="text"
                      color="error"
                      size="small"
                      onClick={() => handleRemoveFriend(f.id)}
                      disabled={removingFriendId === f.id}
                    >
                      {removingFriendId === f.id ? "Removing…" : "Remove"}
                    </Button>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
