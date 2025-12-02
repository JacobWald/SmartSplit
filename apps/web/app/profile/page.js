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
  Autocomplete,
  Fade,
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

  // Automatically clear success messages after a few seconds
  useEffect(() => {
    if (!infoMsg) return;

    const timer = setTimeout(() => {
      setInfoMsg("");
    }, 4000); // 4 seconds

    return () => clearTimeout(timer);
  }, [infoMsg]);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState(""); // username shown under full name
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Friends (accepted)
  const [friends, setFriends] = useState([]);

  // Friend requests (incoming → TO this user)
  const [incomingRequests, setIncomingRequests] = useState([]);

  // UI state for friend actions
  const [addingFriend, setAddingFriend] = useState(false);
  const [removingFriendId, setRemovingFriendId] = useState(null);
  const [respondingRequestId, setRespondingRequestId] = useState(null);

  // All profiles for dynamic friend search
  const [allProfiles, setAllProfiles] = useState([]);

  // Search input for dynamic friend search
  const [friendSearchInput, setFriendSearchInput] = useState("");

  const initials = useMemo(() => {
    const n = (fullName || email || "").trim();
    if (!n) return "?";
    const parts = n.split(/\s+/);
    const first = parts[0]?.[0] || "";
    const second = parts[1]?.[0] || "";
    return (first + second).toUpperCase() || first.toUpperCase() || "?";
  }, [fullName, email]);

  // Profiles available to add as friends (exclude self + existing friends)
  const availableProfiles = useMemo(() => {
    if (!userId || !allProfiles.length) return [];
    const friendIds = new Set(
      (friends || [])
        .map((f) => f.friend?.id)
        .filter(Boolean)
    );
    return allProfiles.filter(
      (p) => p.id !== userId && !friendIds.has(p.id)
    );
  }, [allProfiles, friends, userId]);

  // Only show options after typing >= 3 chars, and filter by name/username
  const searchableProfiles = useMemo(() => {
    const term = friendSearchInput.trim().toLowerCase();
    if (!term || term.length < 3) return [];
    return availableProfiles.filter((p) => {
      const name = (p.full_name || "").toLowerCase();
      const handle = (p.username || "").toLowerCase();
      return name.includes(term) || handle.includes(term);
    });
  }, [availableProfiles, friendSearchInput]);

  // Whether the dropdown should be open at all
  const showAutocompleteDropdown = friendSearchInput.trim().length >= 3;

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
          .select("full_name, phone, avatar_url, email, username")
          .eq("id", user.id)
          .single();

        // Any error other than "no rows found" → real error
        if (profErr && profErr.code !== "PGRST116") {
          throw profErr;
        }

        if (profile) {
          // Profile row exists: prefer full_name, then metadata
          const nameFromProfile =
            profile.full_name || user.user_metadata?.full_name || "";

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
          const nameFromMeta = user.user_metadata?.full_name || "";
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

        // 5) Load all profiles for dynamic friend search
        try {
          const res = await fetch("/api/profiles");
          if (res.ok) {
            const list = await res.json();
            if (Array.isArray(list)) {
              setAllProfiles(list);
            } else {
              setAllProfiles([]);
            }
          } else {
            console.error("Failed to load profiles list:", await res.text());
          }
        } catch (profilesErr) {
          console.error("Error fetching profiles list:", profilesErr);
        }
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

  // SEND friend request by selecting a user from dynamic list
  async function handleAddFriend(profileOption) {
    if (!userId || !profileOption) return;

    const friendId = profileOption.id;
    const friendName = profileOption.full_name || profileOption.username || "";

    // Prevent adding yourself
    if (friendId === userId) {
      setErrorMsg("You cannot add yourself as a friend.");
      return;
    }

    // Prevent adding someone who is already a friend
    const alreadyFriend = friends.some(
      (f) => f.friend && f.friend.id === friendId
    );
    if (alreadyFriend) {
      setErrorMsg("You are already friends with this user.");
      return;
    }

    try {
      setAddingFriend(true);
      setErrorMsg("");
      setInfoMsg("");

      // Insert into user_friend_requests as PENDING
      const { error: reqErr } = await supabase
        .from("user_friend_requests")
        .insert({
          from_user_id: userId,
          to_user_id: friendId,
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

      // Remove this profile from the available list so they can't be re-selected
      setAllProfiles((prev) => prev.filter((p) => p.id !== friendId));

      setInfoMsg(
        friendName
          ? `Friend request sent to ${friendName}.`
          : "Friend request sent!"
      );
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

      // 🔔 Tell NavBar to refresh notifications
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("smartsplit-notifications-update"));
      }
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
        <Alert
          severity="error"
          sx={{
            mb: 2,
            maxWidth: 420,
            mx: "auto",
          }}
        >
          {errorMsg}
        </Alert>
      )}

      <Fade in={Boolean(infoMsg)} timeout={500}>
        <Box
          sx={{
            display: infoMsg ? "flex" : "none",
            justifyContent: "center",
            mb: 2,
          }}
        >
          <Alert
            severity="success"
            sx={{
              maxWidth: 420,
              width: "100%",
              bgcolor: "var(--color-tertiary)",
              color: "var(--color-primary)",
              border: "1px solid var(--color-primary)",
              boxShadow: 2,
              fontWeight: 500,
            }}
          >
            {infoMsg}
          </Alert>
        </Box>
      </Fade>

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

          {/* Add friend by searching users (dynamic list) */}
          <Box mb={2}>
            <Typography
              variant="subtitle1"
              sx={{
                mb: 1,
                color: "var(--color-primary)",
                fontWeight: 600,
              }}
            >
              Add a friend
            </Typography>

            <Autocomplete
              options={searchableProfiles}
              open={showAutocompleteDropdown}
              getOptionLabel={(option) => {
                if (!option) return "";
                const name = option.full_name || "";
                const handle = option.username || "";
                if (name && handle) return `${name} (${handle})`;
                return name || handle || "";
              }}
              inputValue={friendSearchInput}
              onInputChange={(_, newInput) => {
                setFriendSearchInput(newInput);
              }}
              sx={{
                "& .MuiInputBase-root": {
                  backgroundColor: "var(--color-bg)",
                  color: "var(--color-primary)",
                  borderRadius: "8px",
                  boxShadow: "0 1px 4px rgba(0, 0, 0, 0.15)",
                },
                "& .MuiFormLabel-root": {
                  color: "var(--color-primary)",
                },
                "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                  borderColor: "var(--color-primary)",
                },
                "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                  {
                    borderColor: "var(--color-secondary)",
                  },
                "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                  {
                    borderColor: "var(--color-secondary)",
                  },
              }}
              slotProps={{
                paper: {
                  sx: {
                    backgroundColor: "var(--color-bg)",
                    color: "var(--color-primary)",
                    borderRadius: "12px",
                    boxShadow: "0px 6px 20px rgba(0,0,0,0.25)",
                  },
                },
                listbox: {
                  sx: {
                    "& .MuiAutocomplete-option": {
                      "&:hover": {
                        backgroundColor: "rgba(255,255,255,0.06)",
                      },
                      '&[aria-selected="true"]': {
                        backgroundColor: "rgba(255,255,255,0.12)",
                      },
                    },
                  },
                },
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search by name or username"
                  placeholder="Type at least 3 characters..."
                  size="small"
                  sx={inputSx}
                />
              )}
              onChange={(_, newValue) => {
                if (newValue) {
                  handleAddFriend(newValue);
                  // Clear the input after selecting a friend
                  setFriendSearchInput("");
                }
              }}
              disabled={addingFriend}
              noOptionsText="No users found"
              forcePopupIcon={false}
            />
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
