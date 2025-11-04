'use client';

import { useState } from 'react';
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Box, Chip, Autocomplete, Stack, Typography
} from '@mui/material';
import styles from './GroupsPage.module.css';

// TEMP: until you wire this to a real “all users” query
const availableUsers = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Alice Johnson' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Bob Smith' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Charlie Nguyen' },
];

export default function GroupsPage() {
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [selectedMembers, setSelectedMembers] = useState([]); // array of user objects
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');

  const handleCreate = async () => {
    // setSubmitting(true);
    // setStatus('Creating group…');

    // try {
    //   const member_ids = [...new Set(selectedMembers.map((u) => u.id))];

    //   const res = await fetch('/api/groups', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       name: groupName,
    //       base_currency: currency,
    //       member_ids, // excludes owner; API will add owner
    //     }),
    //   });

    //   const data = await res.json();
    //   if (!res.ok) {
    //     throw new Error(data?.error || 'Failed to create group');
    //   }

    //   setStatus(`✅ Created group: ${data.name}`);
    //   // reset form
    //   setGroupName('');
    //   setCurrency('USD');
    //   setSelectedMembers([]);
    //   setOpen(false);
    // } catch (err) {
    //   setStatus(`❌ ${err.message}`);
    // } finally {
    //   setSubmitting(false);
    //   // hide status after a moment
    //   setTimeout(() => setStatus(''), 2500);
    // }
    setOpen(false);
    return;
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h4">Groups</Typography>
        <Button
          className={styles.createButton}
          onClick={() => setOpen(true)}
        >
          Create Group
        </Button>
      </Stack>

      {status && <Typography sx={{ mt: 1 }}>{status}</Typography>}

      <Dialog open={open} onClose={() => !submitting && setOpen(false)} fullWidth maxWidth="sm" slotProps={{ paper: { className: styles.dialogPaper } }}>
        <DialogTitle>Create A New Group</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              fullWidth
              required
              className={styles.inputs}
            />

            <TextField
              select
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              fullWidth
              className={styles.inputs}
            >
              <MenuItem value="USD">USD</MenuItem>
              {/* add more later */}
            </TextField>

            <Autocomplete
              className={styles.inputs}
              multiple
              options={availableUsers}
              getOptionLabel={(u) => u.name}
              value={selectedMembers}
              onChange={(e, newValue) => setSelectedMembers(newValue)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    key={option.id}
                    label={option.name}
                    {...getTagProps({ index })}
                    sx={{
                      backgroundColor: 'var(--color-bg)',
                      color: 'var(--color-primary)',
                      border: '1px solid var(--color-primary)',
                    }}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField {...params} label="Add members (multi-select)" placeholder="Type a name…" />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions className={styles.dialogActions}>
          <Button onClick={() => setOpen(false)} disabled={submitting} className={styles.dialogButton}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={submitting || !groupName.trim()}
            className={styles.dialogButton}
          >
            {submitting ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
