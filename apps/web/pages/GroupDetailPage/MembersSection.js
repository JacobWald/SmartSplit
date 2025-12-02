'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  Divider,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  TextField,
  Chip,
} from '@mui/material';
import styles from './GroupDetailPage.module.css';

export default function GroupMembersSection({
  group,
  isAdmin,
  currentUserId,
  friendProfiles,
  onGroupUpdated,
  isReadOnly,
}) {
  // role-change dialog
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleDialogMember, setRoleDialogMember] = useState(null);
  const [roleDialogTargetRole, setRoleDialogTargetRole] = useState(null);

  // delete-member dialog
  const [deleteMemberDialogOpen, setDeleteMemberDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [deletingMember, setDeletingMember] = useState(false);

  // add-members dialog
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedNewMembers, setSelectedNewMembers] = useState([]);
  const [addingMembers, setAddingMembers] = useState(false);
  const [addMemberStatus, setAddMemberStatus] = useState('');

  const openRoleDialog = (member, targetRole) => {
    if (isReadOnly) return;
    setRoleDialogMember(member);
    setRoleDialogTargetRole(targetRole); // 'MODERATOR' or 'MEMBER'
    setRoleDialogOpen(true);
  };

  const closeRoleDialog = () => {
    setRoleDialogOpen(false);
    setRoleDialogMember(null);
    setRoleDialogTargetRole(null);
  };

  const confirmChangeMemberRole = async () => {
    const member = roleDialogMember;
    const targetRole = roleDialogTargetRole;

    if (!group?.id || !member || !targetRole) {
      closeRoleDialog();
      return;
    }

    try {
      const res = await fetch('/api/group-members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: group.id,
          user_id: member.user_id,
          role: targetRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('Error changing member role:', data.error);
        alert(data.error || 'Failed to change member role');
        return;
      }

      await onGroupUpdated();
    } catch (err) {
      console.error('Error changing member role:', err);
      alert('Error changing member role. Check console.');
    } finally {
      closeRoleDialog();
    }
  };

  const openDeleteMemberDialog = (member) => {
    if (isReadOnly) return;
    setMemberToDelete(member);
    setDeleteMemberDialogOpen(true);
  };

  const closeDeleteMemberDialog = () => {
    setDeleteMemberDialogOpen(false);
    setMemberToDelete(null);
  };

  const confirmDeleteMember = async () => {
    if (!memberToDelete?.user_id || !group?.id) {
      closeDeleteMemberDialog();
      return;
    }

    try {
      setDeletingMember(true);

      const res = await fetch('/api/group-members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: group.id,
          user_id: memberToDelete.user_id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('Error removing member:', data.error);
        alert(data.error || 'Failed to remove member');
        return;
      }

      await onGroupUpdated();
    } catch (err) {
      console.error('Error removing member:', err);
      alert('Error removing member. Check console.');
    } finally {
      setDeletingMember(false);
      closeDeleteMemberDialog();
    }
  };

  const handleAddMembers = async () => {
    if (!group?.id) return;

    const member_ids = [
      ...new Set(selectedNewMembers.map((u) => u.id).filter(Boolean)),
    ];

    if (member_ids.length === 0) {
      setAddMemberStatus('Please select at least one friend to add.');
      return;
    }

    try {
      setAddingMembers(true);
      setAddMemberStatus('Inviting members…');

      const res = await fetch('/api/group-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: group.id,
          member_ids,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('Error adding members:', data.error);
        setAddMemberStatus(data.error || 'Failed to add members.');
        return;
      }

      setAddMemberStatus('✅ Invitations sent.');
      await onGroupUpdated();

      setTimeout(() => {
        setAddMemberOpen(false);
        setSelectedNewMembers([]);
        setAddMemberStatus('');
      }, 600);
    } catch (err) {
      console.error('Error adding members:', err);
      setAddMemberStatus('Error adding members. Check console.');
    } finally {
      setAddingMembers(false);
    }
  };

  const roleDialogTitle =
    roleDialogTargetRole === 'MODERATOR'
      ? 'Promote to moderator'
      : roleDialogTargetRole === 'MEMBER'
      ? 'Set role to member'
      : 'Change role';

  const roleDialogMessage =
    roleDialogMember && roleDialogTargetRole === 'MODERATOR'
      ? `Promote ${roleDialogMember.full_name} to moderator?`
      : roleDialogMember && roleDialogTargetRole === 'MEMBER'
      ? `Set ${roleDialogMember.full_name}'s role back to member?`
      : '';

  return (
    <>
      {/* Members header + Add button */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mt: 0, mb: 1 }} // top spacing now handled in GroupDetailPage
      >
        <Typography
          variant="h6"
          className={styles.sectionTitle}
          sx={{ mt: 0, mb: 0.5 }}
        >
          Members
        </Typography>

        {!isReadOnly && isAdmin && (
          <Button
            className={styles.createButton}
            onClick={() => {
              setSelectedNewMembers([]);
              setAddMemberStatus('');
              setAddMemberOpen(true);
            }}
          >
            Add members
          </Button>
        )}
      </Stack>

      {/* Member list */}
      <List className={styles.memberList}>
        {group.members.map((m, idx) => {
          const isSelf = m.user_id === currentUserId;
          const canModifyRole =
            !isReadOnly && isAdmin && m.status === 'ACCEPTED' && !isSelf;

          const showPromote = canModifyRole && m.role === 'MEMBER';
          const showDemote = canModifyRole && m.role === 'MODERATOR';

          return (
            <div key={m.user_id}>
              <ListItem className={styles.memberRow}>
                <Box className={styles.memberInfo}>
                  <Typography className={styles.memberName}>
                    {m.full_name}
                  </Typography>
                  <Typography className={styles.memberMeta}>
                    {m.role} ({m.status})
                  </Typography>
                </Box>

                {!isReadOnly && (
                  <Stack direction="row" spacing={1}>
                    {showPromote && (
                      <Button
                        size="small"
                        onClick={() => openRoleDialog(m, 'MODERATOR')}
                        className={styles.memberActionButton}
                      >
                        Promote to moderator
                      </Button>
                    )}

                    {showDemote && (
                      <Button
                        size="small"
                        onClick={() => openRoleDialog(m, 'MEMBER')}
                        className={styles.memberActionButton}
                      >
                        Demote to member
                      </Button>
                    )}

                    {canModifyRole && (
                      <Button
                        size="small"
                        onClick={() => openDeleteMemberDialog(m)}
                        className={styles.memberDeleteButton}
                        color="error"
                      >
                        Remove
                      </Button>
                    )}
                  </Stack>
                )}
              </ListItem>
              {idx < group.members.length - 1 && (
                <Divider className={styles.memberDivider} />
              )}
            </div>
          );
        })}
      </List>

      {/* Dialogs only when NOT read-only */}
      {!isReadOnly && (
        <>
          {/* Role-change dialog */}
          <Dialog
            open={roleDialogOpen}
            onClose={closeRoleDialog}
            fullWidth
            maxWidth="xs"
            slotProps={{ paper: { className: styles.confirmDialogPaper } }}
          >
            <DialogTitle className={styles.confirmDialogTitle}>
              {roleDialogTitle}
            </DialogTitle>
            <DialogContent className={styles.confirmDialogContent}>
              <Typography>{roleDialogMessage}</Typography>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={closeRoleDialog}
                className={styles.confirmDialogButtonSecondary}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmChangeMemberRole}
                className={styles.confirmDialogButtonPrimary}
              >
                Confirm
              </Button>
            </DialogActions>
          </Dialog>

          {/* Delete member dialog */}
          <Dialog
            open={deleteMemberDialogOpen}
            onClose={closeDeleteMemberDialog}
            fullWidth
            maxWidth="xs"
            slotProps={{ paper: { className: styles.confirmDialogPaper } }}
          >
            <DialogTitle className={styles.confirmDialogTitle}>
              Remove member
            </DialogTitle>
            <DialogContent className={styles.confirmDialogContent}>
              <Typography>
                {memberToDelete
                  ? `Remove ${memberToDelete.full_name} from this group? They must not be part of any outstanding expenses.`
                  : ''}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={closeDeleteMemberDialog}
                className={styles.confirmDialogButtonSecondary}
                disabled={deletingMember}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteMember}
                className={styles.confirmDialogButtonPrimary}
                color="error"
                disabled={deletingMember}
              >
                {deletingMember ? 'Removing…' : 'Remove'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Add members dialog */}
          <Dialog
            open={addMemberOpen}
            onClose={() => !addingMembers && setAddMemberOpen(false)}
            fullWidth
            maxWidth="sm"
            slotProps={{ paper: { className: styles.confirmDialogPaper } }}
          >
            <DialogTitle className={styles.confirmDialogTitle}>
              Add members to {group.name}
            </DialogTitle>
            <DialogContent className={styles.confirmDialogContent}>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {friendProfiles.length === 0 ? (
                  <Typography variant="body2">
                    You don&apos;t have any friends to add yet. Add friends
                    from the profile page first.
                  </Typography>
                ) : (
                  <>
                    <Typography
                      variant="body2"
                      className={styles.dialogueText}
                    >
                      Invite additional friends to this group. They&apos;ll
                      appear with status <strong>INVITED</strong> until they
                      accept.
                    </Typography>

                    <Autocomplete
                      multiple
                      options={friendProfiles.filter(
                        (f) =>
                          !(group.members || []).some(
                            (m) => m.user_id === f.id
                          )
                      )}
                      getOptionLabel={(u) => u?.username ?? ''}
                      value={selectedNewMembers}
                      onChange={(_, newValue) =>
                        setSelectedNewMembers(newValue)
                      }
                      className={styles.inputs}
                      slotProps={{
                        paper: {
                          sx: {
                            backgroundColor: 'var(--color-bg)',
                            color: 'var(--color-primary)',
                            borderRadius: '12px',
                            boxShadow: '0px 6px 20px rgba(0,0,0,0.25)',
                          },
                        },
                        listbox: {
                          sx: {
                            '& .MuiAutocomplete-option': {
                              '&:hover': {
                                backgroundColor: 'rgba(255,255,255,0.06)',
                              },
                              '&[aria-selected="true"]': {
                                backgroundColor: 'rgba(255,255,255,0.12)',
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
                          label="Add members (friends only)"
                          placeholder="Type a name…"
                        />
                      )}
                    />
                  </>
                )}

                {addMemberStatus && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {addMemberStatus}
                  </Typography>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setAddMemberOpen(false)}
                disabled={addingMembers}
                className={styles.confirmDialogButtonSecondary}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddMembers}
                disabled={
                  addingMembers ||
                  selectedNewMembers.length === 0 ||
                  friendProfiles.length === 0
                }
                className={styles.confirmDialogButtonPrimary}
              >
                {addingMembers ? 'Adding…' : 'Add'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </>
  );
}
