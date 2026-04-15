import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { isFullReload } from './reloadDetector';

/**
 * One-time dialog shown after a full page reload to let the user know that
 * in-memory session state (search filters, bulk inputs, pagination, selected
 * rows) has been cleared. SPA navigations never trigger this.
 */
export const ReloadNotice = () => {
  const [open, setOpen] = useState(() => isFullReload());

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' },
      }}
    >
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <RefreshIcon color="primary" />
          <span>Page reloaded</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Typography color="text.secondary">
          Your unsaved session changes (filters, bulk inputs, selection) have been cleared.
          The workspace has been refreshed.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="contained" onClick={() => setOpen(false)}>
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
};
