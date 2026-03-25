import { useState, Fragment, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Fade,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  CloudUpload,
  ChevronRight,
  ExpandMore,
  Description,
  Download,
} from '@mui/icons-material';
import { useMappings, useMappingMutations } from './hooks';
import type { CustomerMasterWithAliases, MappingFormState, EditMasterFormState, AliasMapping } from './types';
import styles from './MappingsPage.module.css';

const initialForm: MappingFormState = {
  originalCustomerName: '',
  cleanedCustomerName: '',
  canonicalCustomerId: '',
  canonicalCustomerName: '',
  cisCode: '',
  mgs: '',
  countryOfOperation: '',
  region: '',
};

const initialEditForm: EditMasterFormState = {
  canonicalCustomerId: null,
  canonicalCustomerName: '',
  cisCode: '',
  mgs: '',
  countryOfOperation: '',
  region: '',
};

const headerCellSx = {
  fontWeight: 600,
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  color: 'text.secondary',
  letterSpacing: '0.05em',
} as const;

const childHeaderCellSx = {
  fontWeight: 600,
  fontSize: '0.65rem',
  textTransform: 'uppercase',
  color: 'text.secondary',
  py: 0.5,
} as const;

const MappingsPage = () => {
  const {
    masters,
    totalCount,
    loading,
    refetch,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
  } = useMappings();

  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<MappingFormState>(initialForm);

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditMasterFormState>(initialEditForm);

  // Confirm save dialog
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AliasMapping | null>(null);

  const {
    createMapping,
    deleteMapping,
    updateMaster,
    pushToPostgres,
    creating,
    deleting,
    updating,
    pushingPg,
  } = useMappingMutations({
    refetch,
    onCreateCompleted: () => setDialogOpen(false),
    onDeleteCompleted: () => {
      setDeleteDialogOpen(false);
      setSelectedItem(null);
    },
    onUpdateCompleted: () => setEditDialogOpen(false),
  });

  // Handlers
  const handleCreate = () => {
    createMapping(form);
  };

  const handleDeleteAlias = () => {
    if (!selectedItem) return;
    deleteMapping(selectedItem.id);
  };

  const openCreate = (master?: CustomerMasterWithAliases) => {
    setForm({
      originalCustomerName: '',
      cleanedCustomerName: master?.canonicalCustomerName || '',
      canonicalCustomerId: master?.canonicalCustomerId?.toString() || '',
      canonicalCustomerName: master?.canonicalCustomerName || '',
      cisCode: master?.cisCode || '',
      mgs: master?.mgs || '',
      countryOfOperation: master?.countryOfOperation || '',
      region: master?.region || '',
    });
    setDialogOpen(true);
  };

  const openEdit = (master: CustomerMasterWithAliases, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditForm({
      canonicalCustomerId: master.canonicalCustomerId,
      canonicalCustomerName: master.canonicalCustomerName || '',
      cisCode: master.cisCode || '',
      mgs: master.mgs || '',
      countryOfOperation: master.countryOfOperation || '',
      region: master.region || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    updateMaster(editForm);
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(masters.map((m) => m.canonicalCustomerId)));
  const collapseAll = () => setExpandedIds(new Set());

  const totalAliases = masters.reduce((sum, m) => sum + (m.aliasMappings?.length || 0), 0);

  // ---- Export to Excel (server-side CSV generation) ----
  const handleExport = useCallback(() => {
    const a = document.createElement('a');
    a.href = '/api/v1/export-mappings';
    a.download = 'customer-alias-mappings.csv';
    a.click();
  }, []);

  return (
    <div className={styles.page}>
      <Fade in>
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <Typography variant="h5" fontWeight={700} color="text.primary">
              Mappings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Customer alias mappings grouped by canonical customer
            </Typography>
          </div>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={`${totalCount} masters`} color="primary" variant="outlined" size="small" />
            <Chip label={`${totalAliases} aliases`} color="success" variant="outlined" size="small" />
          </Stack>
        </div>
      </Fade>

      <Paper sx={{ p: 0 }}>
        {/* Toolbar */}
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField
              size="small"
              label="Search"
              placeholder="Name, CIS code, or alias..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              sx={{ flex: 1, minWidth: 200 }}
            />

            <Box
              sx={{
                display: 'flex',
                bgcolor: 'background.default',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
              }}
            >
              <IconButton
                size="small"
                onClick={expandAll}
                title="Expand All"
                sx={{
                  borderRadius: 0,
                  px: 1.2,
                  py: 0.8,
                  color: 'text.secondary',
                  '&:hover': { bgcolor: 'primary.900', color: 'primary.300' },
                }}
              >
                <ExpandMore sx={{ fontSize: 15 }} />
              </IconButton>
              <Box sx={{ width: '1px', bgcolor: 'divider' }} />
              <IconButton
                size="small"
                onClick={collapseAll}
                title="Collapse All"
                sx={{
                  borderRadius: 0,
                  px: 1.2,
                  py: 0.8,
                  color: 'text.secondary',
                  '&:hover': { bgcolor: 'primary.900', color: 'primary.300' },
                }}
              >
                <ChevronRight sx={{ fontSize: 15 }} />
              </IconButton>
            </Box>

            <IconButton
              size="small"
              onClick={() => refetch()}
              title="Refresh"
              sx={{ color: 'text.secondary', '&:hover': { color: 'primary.300' } }}
            >
              <Refresh sx={{ fontSize: 15 }} />
            </IconButton>

            <Button
              size="small"
              variant="outlined"
              disabled={totalCount === 0}
              startIcon={<Download sx={{ fontSize: 14 }} />}
              onClick={handleExport}
              sx={{ textTransform: 'none', fontWeight: 600, px: 2 }}
            >
              Export Excel
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<Add sx={{ fontSize: 14 }} />}
              onClick={() => openCreate()}
              sx={{ textTransform: 'none', fontWeight: 600, px: 2 }}
            >
              New Mapping
            </Button>
            <Button
              size="small"
              variant="contained"
              color="success"
              disabled={pushingPg}
              startIcon={
                pushingPg ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <CloudUpload sx={{ fontSize: 14 }} />
                )
              }
              onClick={() => pushToPostgres()}
              sx={{ textTransform: 'none', fontWeight: 600, px: 2 }}
            >
              {pushingPg ? 'Pushing...' : 'Push to Postgres'}
            </Button>
          </Stack>
        </Box>

        {/* Master-detail table */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={32} />
          </Box>
        ) : masters.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography color="text.secondary">No mappings found</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell sx={{ width: 40 }} />
                  <TableCell sx={{ ...headerCellSx, width: 80 }}>ID</TableCell>
                  <TableCell sx={headerCellSx}>Canonical Customer Name</TableCell>
                  <TableCell sx={headerCellSx}>CIS Code</TableCell>
                  <TableCell sx={headerCellSx}>Ctry Of Op</TableCell>
                  <TableCell sx={headerCellSx}>MGS</TableCell>
                  <TableCell sx={headerCellSx}>Region</TableCell>
                  <TableCell sx={{ ...headerCellSx, width: 70 }}>Aliases</TableCell>
                  <TableCell sx={{ width: 50 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {masters.map((master) => {
                  const isExpanded = expandedIds.has(master.canonicalCustomerId);
                  const aliases = master.aliasMappings || [];
                  return (
                    <Fragment key={master.canonicalCustomerId}>
                      <TableRow
                        hover
                        onClick={() => toggleExpand(master.canonicalCustomerId)}
                        sx={{
                          cursor: 'pointer',
                          '& td': { borderBottom: isExpanded ? 'none' : undefined },
                        }}
                      >
                        <TableCell sx={{ px: 1 }}>
                          <IconButton size="small">
                            {isExpanded ? (
                              <ExpandMore sx={{ fontSize: 16 }} />
                            ) : (
                              <ChevronRight sx={{ fontSize: 16 }} />
                            )}
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500} color="text.primary">
                            {master.canonicalCustomerId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} color="text.primary">
                            {master.canonicalCustomerName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {master.cisCode || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {master.countryOfOperation || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {master.mgs || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {master.region || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={aliases.length}
                            size="small"
                            color={aliases.length > 0 ? 'primary' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell sx={{ px: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={(e) => openEdit(master, e)}
                            title="Edit customer"
                            sx={{ color: 'text.secondary', '&:hover': { color: 'primary.300' } }}
                          >
                            <Edit sx={{ fontSize: 14 }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          sx={{
                            py: 0,
                            px: 0,
                            borderBottom: isExpanded ? '1px solid' : 'none',
                            borderColor: 'divider',
                          }}
                        >
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ mx: 4, my: 1.5, mb: 2 }}>
                              {aliases.length === 0 ? (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ py: 1, fontStyle: 'italic' }}
                                >
                                  No alias mappings for this customer
                                </Typography>
                              ) : (
                                <Table
                                  size="small"
                                  sx={{ bgcolor: 'rgba(168, 85, 247, 0.04)', borderRadius: 1 }}
                                >
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={childHeaderCellSx}>ID</TableCell>
                                      <TableCell sx={childHeaderCellSx}>
                                        Original Customer Name
                                      </TableCell>
                                      <TableCell sx={childHeaderCellSx}>
                                        Cleaned Customer Name
                                      </TableCell>
                                      <TableCell sx={{ width: 60, py: 0.5 }} />
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {aliases.map((alias) => (
                                      <TableRow key={alias.id} hover>
                                        <TableCell sx={{ py: 0.75 }}>
                                          <Typography variant="caption" color="text.secondary">
                                            {alias.id}
                                          </Typography>
                                        </TableCell>
                                        <TableCell sx={{ py: 0.75 }}>
                                          <Stack direction="row" spacing={1} alignItems="center">
                                            <Description
                                              sx={{ fontSize: 12, color: 'text.secondary' }}
                                            />
                                            <Typography variant="body2" color="text.primary">
                                              {alias.originalCustomerName}
                                            </Typography>
                                          </Stack>
                                        </TableCell>
                                        <TableCell sx={{ py: 0.75 }}>
                                          <Typography variant="body2" color="text.secondary">
                                            {alias.cleanedCustomerName || '-'}
                                          </Typography>
                                        </TableCell>
                                        <TableCell sx={{ py: 0.75 }}>
                                          <IconButton
                                            size="small"
                                            title="Delete alias"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedItem(alias);
                                              setDeleteDialogOpen(true);
                                            }}
                                            sx={{
                                              color: 'text.secondary',
                                              '&:hover': { color: 'error.main' },
                                            }}
                                          >
                                            <Delete sx={{ fontSize: 13 }} />
                                          </IconButton>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => {
            setPageSize(parseInt(e.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Paper>

      {/* Create Alias Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' },
        }}
      >
        <DialogTitle>Add Alias Mapping</DialogTitle>
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}
        >
          <TextField
            label="Original Customer Name"
            fullWidth
            size="small"
            required
            value={form.originalCustomerName}
            onChange={(e) => setForm({ ...form, originalCustomerName: e.target.value })}
            helperText="The raw customer name variant to map"
          />
          <TextField
            label="Canonical Customer Name"
            fullWidth
            size="small"
            value={form.canonicalCustomerName}
            onChange={(e) => setForm({ ...form, canonicalCustomerName: e.target.value })}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="CIS Code"
              fullWidth
              size="small"
              value={form.cisCode}
              onChange={(e) => setForm({ ...form, cisCode: e.target.value })}
            />
            <TextField
              label="MGS"
              fullWidth
              size="small"
              value={form.mgs}
              onChange={(e) => setForm({ ...form, mgs: e.target.value })}
            />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Ctry Of Op"
              fullWidth
              size="small"
              value={form.countryOfOperation}
              onChange={(e) => setForm({ ...form, countryOfOperation: e.target.value })}
            />
            <TextField
              label="Region"
              fullWidth
              size="small"
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={creating || !form.originalCustomerName.trim()}
          >
            {creating && <CircularProgress size={16} sx={{ mr: 1 }} />}
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' },
        }}
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <Edit sx={{ fontSize: 18 }} />
            <span>Edit Customer</span>
          </Stack>
        </DialogTitle>
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}
        >
          <TextField
            label="Canonical Customer ID"
            fullWidth
            size="small"
            value={editForm.canonicalCustomerId || ''}
            InputProps={{ readOnly: true }}
            sx={{ '& .MuiInputBase-input': { color: 'text.secondary' } }}
          />
          <TextField
            label="Canonical Customer Name"
            fullWidth
            size="small"
            autoFocus
            value={editForm.canonicalCustomerName}
            onChange={(e) =>
              setEditForm({ ...editForm, canonicalCustomerName: e.target.value })
            }
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="CIS Code"
              fullWidth
              size="small"
              value={editForm.cisCode}
              onChange={(e) => setEditForm({ ...editForm, cisCode: e.target.value })}
            />
            <TextField
              label="MGS"
              fullWidth
              size="small"
              value={editForm.mgs}
              onChange={(e) => setEditForm({ ...editForm, mgs: e.target.value })}
            />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Ctry Of Op"
              fullWidth
              size="small"
              value={editForm.countryOfOperation}
              onChange={(e) =>
                setEditForm({ ...editForm, countryOfOperation: e.target.value })
              }
            />
            <TextField
              label="Region"
              fullWidth
              size="small"
              value={editForm.region}
              onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={() => setConfirmSaveOpen(true)}
            variant="contained"
            disabled={updating || !editForm.canonicalCustomerName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Save Dialog */}
      <Dialog
        open={confirmSaveOpen}
        onClose={() => setConfirmSaveOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' },
        }}
      >
        <DialogTitle>Confirm Save</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Save changes to <strong>&quot;{editForm.canonicalCustomerName}&quot;</strong> (ID:{' '}
            {editForm.canonicalCustomerId})?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmSaveOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={() => {
              setConfirmSaveOpen(false);
              handleUpdate();
            }}
            variant="contained"
            disabled={updating}
          >
            {updating && <CircularProgress size={16} sx={{ mr: 1 }} />}
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Alias Confirmation */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' },
        }}
      >
        <DialogTitle>Delete Alias Mapping</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Delete alias <strong>&quot;{selectedItem?.originalCustomerName}&quot;</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAlias}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting && <CircularProgress size={16} sx={{ mr: 1 }} />}
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default MappingsPage;
