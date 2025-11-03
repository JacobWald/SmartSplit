"use client";
import { Box, Typography, Avatar, TextField, Button } from "@mui/material";
import { useState } from "react";

export default function ProfilePage() {
  // TODO: replace with real data from Supabase later
  const [user, setUser] = useState({
    name: "John Doe",
    email: "johndoe@example.com",
    phone: "555-123-4567",
    photo: "/default-avatar.png",
  });

  const [editing, setEditing] = useState(false);

  const handleSave = () => {
    setEditing(false);
    // TODO: send updates to DB (Supabase)
    alert("Profile saved (placeholder)!");
  };

  return (
    <Box sx={{ maxWidth: 500, m: "40px auto", p: 4, bgcolor: "#fafafa", borderRadius: 3, boxShadow: 2 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        My Profile
      </Typography>

      <Box display="flex" alignItems="center" mb={3}>
        <Avatar src={user.photo} sx={{ width: 80, height: 80, mr: 2 }} />
        <Button variant="outlined" size="small">Change Photo</Button>
      </Box>

      <TextField
        label="Name"
        fullWidth
        margin="normal"
        value={user.name}
        onChange={(e) => setUser({ ...user, name: e.target.value })}
        disabled={!editing}
      />
      <TextField label="Email" fullWidth margin="normal" value={user.email} disabled />
      <TextField
        label="Phone Number"
        fullWidth
        margin="normal"
        value={user.phone}
        onChange={(e) => setUser({ ...user, phone: e.target.value })}
        disabled={!editing}
      />

      {!editing ? (
        <Button variant="contained" fullWidth sx={{ mt: 3 }} onClick={() => setEditing(true)}>
          Edit Profile
        </Button>
      ) : (
        <Button variant="contained" color="success" fullWidth sx={{ mt: 3 }} onClick={handleSave}>
          Save Changes
        </Button>
      )}
    </Box>
  );
}
