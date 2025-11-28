'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Box, Chip, Autocomplete, Stack, Typography,
  Card, CardActionArea, CardContent, Select, InputLabel, FormControl, Link, MenuItem as MenuItem2, CircularProgress
} from '@mui/material'
import styles from './GroupsPage.module.css'

export default function GroupsPage() {
    const [open, setOpen] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState('');
    const [friendProfiles, setFriendProfiles] = useState([]);
    const [groups, setGroups] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const [groupFilter, setGroupFilter] = useState('active');

    const parseJSON = async (res) => {
        if (!res.ok) return null;
        const text = await res.text();
        return text ? JSON.parse(text) : null;
    };

    // load friends + groups + current user
    useEffect(() => {
    (async () => {
        try {
            const [gRes, meRes] = await Promise.all([
                fetch('/api/groups'),
                fetch('/api/auth/me'),
            ]);

            const [g, me] = await Promise.all([
                parseJSON(gRes),
                parseJSON(meRes),
            ]);

            if (Array.isArray(g)) setGroups(g);

            if (me?.id) {
                setCurrentUser(me);
                const friendId = me.id;
                const fRes = await fetch(`/api/friends?friendId=${friendId}`);
                console.log('friends response status:', fRes.status);
                const f = await parseJSON(fRes);
                console.log('friends parsed JSON:', f); 
                if(Array.isArray(f)) {
                    setFriendProfiles(f);
                } else {
                    setFriendProfiles([]);
                }
            } else {
                setFriendProfiles([]);
            }
        } catch (err) {
            console.error('Failed to load groups or profiles:', err);
            setFriendProfiles([]);
        } finally {
            setLoading(false);
        }
    })();
    }, []);

    const filteredGroups = useMemo(() => {
        if (!Array.isArray(groups)) return [];

        if (groupFilter === 'inactive') {
        return groups.filter(g => g.active === false);
        }

        // default: active 
        return groups.filter(g => g.active !== false);
    }, [groups, groupFilter]);

    const handleToggleGroupActive = async (event, group) => {
    // prevent navigating to the group when clicking the button
    event.preventDefault();
    event.stopPropagation();

    try {
        const res = await fetch('/api/groups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            group_id: group.id,
            active: !group.active,
        }),
        });

        const data = await res.json();
        if (!res.ok) {
        console.error('Error toggling group active flag:', data.error);
        alert(data.error || 'Failed to update group status.');
        return;
        }

        // Update local groups state
        setGroups(prev =>
        prev.map(g =>
            g.id === data.id ? { ...g, active: data.active } : g
        )
        );
    } catch (err) {
        console.error('Error toggling group active flag:', err);
        alert('Error updating group status. Check console.');
    }
    };

    const handleCreate = async () => {
        try {
        setSubmitting(true)
        setStatus('Creating group…')

        const member_ids = [...new Set(selectedMembers.map(u => u.id))]

        const res = await fetch('/api/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            name: groupName,
            base_currency: currency,
            member_ids, // owner auto-added server-side
            }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Failed to create group')

        setStatus(`✅ Created group: ${data.name}`)
        setGroupName('')
        setCurrency('USD')
        setSelectedMembers([])
        setOpen(false)

        // refresh groups
        const gRes = await fetch('/api/groups')
        const g = await gRes.json()
        if (Array.isArray(g)) setGroups(g)
        } catch (err) {
        setStatus(`❌ ${err.message}`)
        } finally {
        setSubmitting(false)
        setTimeout(() => setStatus(''), 2500)
        }
    }

    return (
        <>
            {loading ? (
                <Box
                sx={{
                minHeight: '60vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                px: 2,
                }}
                >
                    <CircularProgress />
                </Box>
            ) : currentUser === null ? (
                    <Box
                    sx={{
                        minHeight: '60vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        px: 2,
                    }}
                    >
                        <Typography variant="h6" sx={{ color: 'var(--color-primary)' }}>
                            You must sign in to view the Groups page.
                        </Typography>
                    </Box>
                ) : (
                    <Box className={styles.page}>
                        <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            className={styles.header}
                        >
                            <Typography variant="h4" className={styles.title}>Groups</Typography>
                            <Button className={styles.createButton} onClick={() => setOpen(true)}>
                            Create Group
                            </Button>
                        </Stack>

                        {/* Active / inactive filter bar */}
                        <Box className={styles.groupFilterBar}>
                            <Button
                                type="button"
                                className={
                                groupFilter === 'active'
                                    ? `${styles.groupFilterButton} ${styles.groupFilterButtonActive}`
                                    : styles.groupFilterButton
                                }
                                onClick={() => setGroupFilter('active')}
                            >
                                ACTIVE
                            </Button>

                            <Button
                                type="button"
                                className={
                                groupFilter === 'inactive'
                                    ? `${styles.groupFilterButton} ${styles.groupFilterButtonActive}`
                                    : styles.groupFilterButton
                                }
                                onClick={() => setGroupFilter('inactive')}
                            >
                                INACTIVE
                            </Button>
                        </Box>

                        {status && <Typography sx={{ mt: 1 }}>{status}</Typography>}

                        {filteredGroups.length === 0 ? (
                            <Box className={styles.empty}>
                                <Typography variant="h6" sx={{ mb: 1 }}>
                                {groupFilter === 'inactive'
                                    ? 'You have no inactive groups.'
                                    : 'You have no active groups.'}
                                </Typography>
                                {groupFilter === 'active' && (
                                <Typography variant="body2">
                                    Click “Create Group” above to start a new one, or accept an invitation from a friend.
                                </Typography>
                                )}
                            </Box>
                            ) : (
                            <div className={styles.groupGrid}>
                                {filteredGroups.map(group => {
                                    const meInGroup = group.members.find(
                                        (m) => m.user_id === currentUser.id
                                    );
                                    const isAdminInGroup = meInGroup?.role === 'ADMIN';

                                    return (
                                        <CardActionArea
                                        key={group.id}
                                        component={Link}
                                        href={`/groups/${encodeURIComponent(group.id)}`}
                                        className={styles.groupCard}
                                        >
                                            <CardContent className={styles.cardContent}>
                                                <Stack
                                                direction="row"
                                                alignItems="center"
                                                justifyContent="space-between"
                                                sx={{ mb: 1 }}
                                                >
                                                    <Typography variant="h6" className={styles.cardTitle}>
                                                        {group.name}
                                                    </Typography>

                                                    {/* Active/inactive pill + toggle (admin only) */}
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        {isAdminInGroup && (
                                                        <Button
                                                            size="small"
                                                            className={styles.groupToggleButton}
                                                            onClick={(e) => handleToggleGroupActive(e, group)}
                                                        >
                                                            {group.active !== false ? 'Set inactive' : 'Set active'}
                                                        </Button>
                                                        )}
                                                    </Stack>
                                                </Stack>

                                                <FormControl fullWidth size="small" className={styles.selectOutline}>
                                                <InputLabel className={styles.selectText}>Members</InputLabel>
                                                <Select
                                                label="Members"
                                                displayEmpty
                                                value=""
                                                renderValue={() => "Members"}
                                                sx={{
                                                    color: "var(--color-tertiary)", // text always white-ish
                                                    "& .MuiSelect-icon": {
                                                    color: "var(--color-tertiary)",
                                                    },
                                                    "& .MuiOutlinedInput-notchedOutline": {
                                                    borderColor: "var(--color-tertiary)",
                                                    },
                                                    "&:hover .MuiOutlinedInput-notchedOutline": {
                                                    borderColor: "var(--color-secondary)",
                                                    },
                                                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                                    borderColor: "var(--color-secondary)",
                                                    },
                                                }}
                                                MenuProps={{
                                                    PaperProps: {
                                                    sx: {
                                                        backgroundColor: "var(--color-bg)",
                                                        color: "var(--color-primary)",
                                                        borderRadius: "12px",
                                                        boxShadow: "0px 6px 20px rgba(0,0,0,0.25)",
                                                    },
                                                    },
                                                }}
                                                >
                                                    {group.members.map((m) => (
                                                        <MenuItem2
                                                        key={m.user_id}
                                                        value={m.user_id}
                                                        disabled
                                                        sx={{
                                                            opacity: 1,
                                                            color: "var(--color-primary)",
                                                            display: "flex",
                                                            justifyContent: "space-between",
                                                            alignItems: "center",
                                                            "&.Mui-disabled": { opacity: 1, color: "var(--color-primary)" },
                                                        }}
                                                        >
                                                        <Typography>{m.full_name}</Typography>
                                                        <Chip
                                                            size="small"
                                                            label={m.status}
                                                            color={
                                                            m.status === "ACCEPTED"
                                                                ? "success"
                                                                : m.status === "INVITED"
                                                                ? "warning"
                                                                : "default"
                                                            }
                                                            variant="outlined"
                                                        />
                                                        </MenuItem2>
                                                    ))}
                                                </Select>
                                                </FormControl>
                                            </CardContent>
                                        </CardActionArea>
                                    );
                                })}
                            </div>
                        )}

                        {/* CREATE DIALOG */}
                        <Dialog
                            open={open}
                            onClose={() => !submitting && setOpen(false)}
                            fullWidth
                            maxWidth="sm"
                            slotProps={{ paper: { className: styles.dialogPaper } }}
                        >
                            <DialogTitle className={styles.dialogTitle}>Create A New Group</DialogTitle>
                            <DialogContent className={styles.dialogContent}>
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
                                </TextField>

                                {friendProfiles.length === 0 ? (
                                    <Typography variant="body2" className={styles.dialogueText}>
                                        Add friends on the profile page to create a group.
                                    </Typography>
                                    ) : (
                                    <Autocomplete
                                        className={styles.inputs}
                                        multiple
                                        options={friendProfiles || []}
                                        getOptionLabel={(u) => u?.username ?? ''}
                                        value={selectedMembers}
                                        onChange={(e, newValue) => setSelectedMembers(newValue)}
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
                                                // normal option
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
                                        renderTags={(value, getTagProps) =>
                                            value.map((option, index) => (
                                                <Chip
                                                {...getTagProps({ index })}
                                                key={option.id}
                                                label={option.username}
                                                sx={{
                                                    backgroundColor: 'var(--color-bg)',
                                                    color: 'var(--color-primary)',
                                                    border: '1px solid var(--color-primary)',
                                                }}
                                                />
                                            ))
                                        }
                                        renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Add members (multi-select)"
                                            placeholder="Type a name…"
                                        />
                                        )}
                                    />
                                    )}
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
                )
            }
        </>
    )
}
