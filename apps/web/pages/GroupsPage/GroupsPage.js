'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Box, Chip, Autocomplete, Stack, Typography,
  Grid, Card, CardActionArea, CardContent, Select, InputLabel, FormControl, Link, MenuItem as MenuItem2
} from '@mui/material'
import styles from './GroupsPage.module.css'

export default function GroupsPage() {
    const [open, setOpen] = useState(false)
    const [groupName, setGroupName] = useState('')
    const [currency, setCurrency] = useState('USD')
    const [selectedMembers, setSelectedMembers] = useState([])
    const [submitting, setSubmitting] = useState(false)
    const [status, setStatus] = useState('')
    const [profiles, setProfiles] = useState([])
    const [groups, setGroups] = useState([])
    const [currentUser, setCurrentUser] = useState(null)

    // load profiles + groups + current user
    useEffect(() => {
    (async () => {
        try {
        const [pRes, gRes, meRes] = await Promise.all([
            fetch('/api/profiles'),
            fetch('/api/groups'),
            fetch('/api/auth/me'),
        ]);

        const parseJSON = async (res) => {
            if (!res.ok) return null;
            const text = await res.text();
            return text ? JSON.parse(text) : null;
        };

        const [p, g, me] = await Promise.all([
            parseJSON(pRes),
            parseJSON(gRes),
            parseJSON(meRes),
        ]);

        if (Array.isArray(p)) setProfiles(p);
        if (Array.isArray(g)) setGroups(g);
        if (me?.id) setCurrentUser(me);
        } catch (err) {
        console.error('Failed to load groups or profiles:', err);
        }
    })();
    }, []);

    // Filter available users (exclude current user)
    const options = useMemo(() => {
        if (!profiles.length) return []
        return profiles
        .filter(p => p.id !== currentUser?.id)
        .map(p => ({ id: p.id, full_name: p.full_name }))
    }, [profiles, currentUser])

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

    const slugify = (s) =>
        s.toLowerCase()
            .trim()
            .replace(/[\s\_]+/g, '-')    
            .replace(/[^a-z0-9\-]/g, '')    
            .replace(/\-+/g, '-')   

    return (
        <>
        {currentUser === null ? (
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

                {status && <Typography sx={{ mt: 1 }}>{status}</Typography>}

                {groups.length === 0 ? (
                    <Box className={styles.empty}>
                        <Typography variant="h6" sx={{ mb: 1 }}>
                        You are currently not in any groups.
                        </Typography>
                        <Typography variant="body2">
                        Click “Create Group” above to start a new one!
                        </Typography>
                    </Box>
                    ) : (
                    <div className={styles.groupGrid}>
                        {groups.map(group => (
                        <Card key={group.id} className={styles.groupCard}>
                            <CardActionArea component={Link} href={`/groups/${encodeURIComponent(slugify(group.name))}`}>
                            <CardContent className={styles.cardContent}>
                                <Typography variant="h6" className={styles.cardTitle}>
                                {group.name}
                                </Typography>

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
                        </Card>
                        ))}
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

                            <Autocomplete
                            className={styles.inputs}
                            multiple
                            options={options}
                            getOptionLabel={(u) => u.full_name}
                            value={selectedMembers}
                            onChange={(e, newValue) => setSelectedMembers(newValue)}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip
                                    {...getTagProps({ index })}  // spread FIRST
                                    key={option.id}              // then define key explicitly
                                    label={option.full_name}
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
            )}
        </>
    )
}
