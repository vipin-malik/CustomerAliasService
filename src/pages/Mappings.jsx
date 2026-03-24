import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { motion } from 'framer-motion';
import {
  Plus, Pencil, Trash2, Loader2, RefreshCw, Upload,
  ChevronRight, ChevronDown, FileText,
} from 'lucide-react';
import {
  Box, Paper, Typography, Button, TextField, Stack, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Collapse, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination,
} from '@mui/material';
import toast from 'react-hot-toast';
import {
  GET_CUSTOMER_MASTERS_WITH_ALIASES,
  CREATE_CUSTOMER_ALIAS_MAPPING,
  DELETE_CUSTOMER_ALIAS_MAPPING,
  UPDATE_CUSTOMER_MASTER,
  PUSH_TO_POSTGRES,
} from '../services/graphqlClient';

const Mappings = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [expandedIds, setExpandedIds] = useState(new Set());

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    originalCustomerName: '', cleanedCustomerName: '', canonicalCustomerId: '',
    canonicalCustomerName: '', cisCode: '', mgs: '', countryOfOperation: '', region: '',
  });

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    canonicalCustomerId: null,
    canonicalCustomerName: '', cisCode: '', mgs: '', countryOfOperation: '', region: '',
  });

  // Confirm save dialog
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // ─── Apollo query ──────────────────────────────────────────────
  const { data, loading, refetch } = useQuery(GET_CUSTOMER_MASTERS_WITH_ALIASES, {
    variables: { page: page + 1, pageSize, search: search || null },
  });

  const masters = data?.customerMastersWithAliases?.items || [];
  const totalCount = data?.customerMastersWithAliases?.totalCount || 0;

  // ─── Apollo mutations ─────────────────────────────────────────
  const [createMapping, { loading: creating }] = useMutation(CREATE_CUSTOMER_ALIAS_MAPPING, {
    onCompleted: () => { toast.success('Mapping created'); setDialogOpen(false); refetch(); },
    onError: () => toast.error('Failed to create'),
  });

  const [deleteMapping, { loading: deleting }] = useMutation(DELETE_CUSTOMER_ALIAS_MAPPING, {
    onCompleted: () => { toast.success('Alias mapping deleted'); setDeleteDialogOpen(false); setSelectedItem(null); refetch(); },
    onError: () => toast.error('Failed to delete'),
  });

  const [updateMaster, { loading: updating }] = useMutation(UPDATE_CUSTOMER_MASTER, {
    onCompleted: () => { toast.success('Customer updated'); setEditDialogOpen(false); refetch(); },
    onError: () => toast.error('Failed to update'),
  });

  const [pushToPostgres, { loading: pushingPg }] = useMutation(PUSH_TO_POSTGRES, {
    onCompleted: ({ pushToPostgres: d }) => {
      toast.success(
        `Pushed to Postgres: ${d.mastersCreated} masters created, ${d.mastersUpdated} updated, ${d.mappingsCreated} mappings created, ${d.mappingsUpdated} updated`
      );
      if (d.errors?.length > 0) d.errors.forEach((e) => toast.error(e));
    },
    onError: (err) => toast.error(err.message || 'Push to Postgres failed'),
  });

  // ─── Handlers ──────────────────────────────────────────────────
  const handleCreate = () => {
    createMapping({
      variables: {
        input: {
          originalCustomerName: form.originalCustomerName,
          cleanedCustomerName: form.cleanedCustomerName || null,
          canonicalCustomerId: form.canonicalCustomerId ? parseInt(form.canonicalCustomerId) : null,
          canonicalCustomerName: form.canonicalCustomerName || null,
          cisCode: form.cisCode || null,
          mgs: form.mgs || null,
          countryOfOperation: form.countryOfOperation || null,
          region: form.region || null,
        },
      },
    });
  };

  const handleDeleteAlias = () => {
    if (!selectedItem) return;
    deleteMapping({ variables: { id: selectedItem.id } });
  };

  const openCreate = (master = null) => {
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

  const openEdit = (master, e) => {
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
    updateMaster({
      variables: {
        canonicalCustomerId: editForm.canonicalCustomerId,
        input: {
          canonicalCustomerName: editForm.canonicalCustomerName || null,
          cisCode: editForm.cisCode || null,
          mgs: editForm.mgs || null,
          countryOfOperation: editForm.countryOfOperation || null,
          region: editForm.region || null,
        },
      },
    });
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(masters.map((m) => m.canonicalCustomerId)));
  const collapseAll = () => setExpandedIds(new Set());

  const totalAliases = masters.reduce((sum, m) => sum + (m.aliasMappings?.length || 0), 0);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Mappings</h2>
          <p className="text-gray-400 mt-1">Customer alias mappings grouped by canonical customer</p>
        </div>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={`${totalCount} masters`} color="primary" variant="outlined" size="small" />
          <Chip label={`${totalAliases} aliases`} color="success" variant="outlined" size="small" />
        </Stack>
      </motion.div>

      <Paper sx={{ p: 0 }}>
        {/* Toolbar */}
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField size="small" label="Search" placeholder="Name, CIS code, or alias..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              sx={{ flex: 1, minWidth: 200 }} />

            <Box sx={{ display: 'flex', bgcolor: 'background.default', borderRadius: 1, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              <IconButton size="small" onClick={expandAll} title="Expand All"
                sx={{ borderRadius: 0, px: 1.2, py: 0.8, color: 'text.secondary', '&:hover': { bgcolor: 'primary.900', color: 'primary.300' } }}>
                <ChevronDown size={15} />
              </IconButton>
              <Box sx={{ width: '1px', bgcolor: 'divider' }} />
              <IconButton size="small" onClick={collapseAll} title="Collapse All"
                sx={{ borderRadius: 0, px: 1.2, py: 0.8, color: 'text.secondary', '&:hover': { bgcolor: 'primary.900', color: 'primary.300' } }}>
                <ChevronRight size={15} />
              </IconButton>
            </Box>

            <IconButton size="small" onClick={() => refetch()} title="Refresh"
              sx={{ color: 'text.secondary', '&:hover': { color: 'primary.300' } }}>
              <RefreshCw size={15} />
            </IconButton>

            <Button size="small" variant="contained" startIcon={<Plus size={14} />}
              onClick={() => openCreate()}
              sx={{ textTransform: 'none', fontWeight: 600, px: 2 }}>
              New Mapping
            </Button>
            <Button size="small" variant="contained" color="success" disabled={pushingPg}
              startIcon={pushingPg ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              onClick={() => pushToPostgres()}
              sx={{ textTransform: 'none', fontWeight: 600, px: 2 }}>
              {pushingPg ? 'Pushing...' : 'Push to Postgres'}
            </Button>
          </Stack>
        </Box>

        {/* Master-detail table */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <Loader2 className="animate-spin text-primary-400" size={32} />
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
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.05em', width: 80 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.05em' }}>Canonical Customer Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.05em' }}>CIS Code</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.05em' }}>Ctry Of Op</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.05em' }}>MGS</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.05em' }}>Region</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.05em', width: 70 }}>Aliases</TableCell>
                  <TableCell sx={{ width: 50 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {masters.map((master) => {
                  const isExpanded = expandedIds.has(master.canonicalCustomerId);
                  const aliases = master.aliasMappings || [];
                  return (
                    <React.Fragment key={master.canonicalCustomerId}>
                      <TableRow hover onClick={() => toggleExpand(master.canonicalCustomerId)}
                        sx={{ cursor: 'pointer', '& td': { borderBottom: isExpanded ? 'none' : undefined } }}>
                        <TableCell sx={{ px: 1 }}>
                          <IconButton size="small">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </IconButton>
                        </TableCell>
                        <TableCell><Typography variant="body2" fontWeight={500} color="text.primary">{master.canonicalCustomerId}</Typography></TableCell>
                        <TableCell><Typography variant="body2" fontWeight={600} color="text.primary">{master.canonicalCustomerName}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color="text.secondary">{master.cisCode || '-'}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color="text.secondary">{master.countryOfOperation || '-'}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color="text.secondary">{master.mgs || '-'}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color="text.secondary">{master.region || '-'}</Typography></TableCell>
                        <TableCell><Chip label={aliases.length} size="small" color={aliases.length > 0 ? 'primary' : 'default'} variant="outlined" /></TableCell>
                        <TableCell sx={{ px: 0.5 }}>
                          <IconButton size="small" onClick={(e) => openEdit(master, e)} title="Edit customer"
                            sx={{ color: 'text.secondary', '&:hover': { color: 'primary.300' } }}>
                            <Pencil size={14} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={9} sx={{ py: 0, px: 0, borderBottom: isExpanded ? '1px solid' : 'none', borderColor: 'divider' }}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ mx: 4, my: 1.5, mb: 2 }}>
                              {aliases.length === 0 ? (
                                <Typography variant="body2" color="text.secondary" sx={{ py: 1, fontStyle: 'italic' }}>No alias mappings for this customer</Typography>
                              ) : (
                                <Table size="small" sx={{ bgcolor: 'rgba(168, 85, 247, 0.04)', borderRadius: 1 }}>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', color: 'text.secondary', py: 0.5 }}>ID</TableCell>
                                      <TableCell sx={{ fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', color: 'text.secondary', py: 0.5 }}>Original Customer Name</TableCell>
                                      <TableCell sx={{ fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', color: 'text.secondary', py: 0.5 }}>Cleaned Customer Name</TableCell>
                                      <TableCell sx={{ width: 60, py: 0.5 }} />
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {aliases.map((alias) => (
                                      <TableRow key={alias.id} hover>
                                        <TableCell sx={{ py: 0.75 }}><Typography variant="caption" color="text.secondary">{alias.id}</Typography></TableCell>
                                        <TableCell sx={{ py: 0.75 }}>
                                          <Stack direction="row" spacing={1} alignItems="center">
                                            <FileText size={12} className="text-gray-500" />
                                            <Typography variant="body2" color="text.primary">{alias.originalCustomerName}</Typography>
                                          </Stack>
                                        </TableCell>
                                        <TableCell sx={{ py: 0.75 }}><Typography variant="body2" color="text.secondary">{alias.cleanedCustomerName || '-'}</Typography></TableCell>
                                        <TableCell sx={{ py: 0.75 }}>
                                          <IconButton size="small" title="Delete alias"
                                            onClick={(e) => { e.stopPropagation(); setSelectedItem(alias); setDeleteDialogOpen(true); }}
                                            sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                                            <Trash2 size={13} />
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
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination component="div" count={totalCount} page={page}
          onPageChange={(_, p) => setPage(p)} rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50]} />
      </Paper>

      {/* Create Alias Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' } }}>
        <DialogTitle>Add Alias Mapping</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="Original Customer Name" fullWidth size="small" required
            value={form.originalCustomerName} onChange={(e) => setForm({ ...form, originalCustomerName: e.target.value })}
            helperText="The raw customer name variant to map" />
          <TextField label="Canonical Customer Name" fullWidth size="small"
            value={form.canonicalCustomerName} onChange={(e) => setForm({ ...form, canonicalCustomerName: e.target.value })} />
          <Stack direction="row" spacing={2}>
            <TextField label="CIS Code" fullWidth size="small" value={form.cisCode} onChange={(e) => setForm({ ...form, cisCode: e.target.value })} />
            <TextField label="MGS" fullWidth size="small" value={form.mgs} onChange={(e) => setForm({ ...form, mgs: e.target.value })} />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField label="Ctry Of Op" fullWidth size="small" value={form.countryOfOperation} onChange={(e) => setForm({ ...form, countryOfOperation: e.target.value })} />
            <TextField label="Region" fullWidth size="small" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleCreate} variant="contained" disabled={creating || !form.originalCustomerName.trim()}>
            {creating && <Loader2 size={16} className="animate-spin mr-2" />}
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' } }}>
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <Pencil size={18} />
            <span>Edit Customer</span>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="Canonical Customer ID" fullWidth size="small"
            value={editForm.canonicalCustomerId || ''} InputProps={{ readOnly: true }}
            sx={{ '& .MuiInputBase-input': { color: 'text.secondary' } }} />
          <TextField label="Canonical Customer Name" fullWidth size="small" autoFocus
            value={editForm.canonicalCustomerName} onChange={(e) => setEditForm({ ...editForm, canonicalCustomerName: e.target.value })} />
          <Stack direction="row" spacing={2}>
            <TextField label="CIS Code" fullWidth size="small"
              value={editForm.cisCode} onChange={(e) => setEditForm({ ...editForm, cisCode: e.target.value })} />
            <TextField label="MGS" fullWidth size="small"
              value={editForm.mgs} onChange={(e) => setEditForm({ ...editForm, mgs: e.target.value })} />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField label="Ctry Of Op" fullWidth size="small"
              value={editForm.countryOfOperation} onChange={(e) => setEditForm({ ...editForm, countryOfOperation: e.target.value })} />
            <TextField label="Region" fullWidth size="small"
              value={editForm.region} onChange={(e) => setEditForm({ ...editForm, region: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={() => setConfirmSaveOpen(true)} variant="contained"
            disabled={updating || !editForm.canonicalCustomerName.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Save Dialog */}
      <Dialog open={confirmSaveOpen} onClose={() => setConfirmSaveOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' } }}>
        <DialogTitle>Confirm Save</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Save changes to <strong>"{editForm.canonicalCustomerName}"</strong> (ID: {editForm.canonicalCustomerId})?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmSaveOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={() => { setConfirmSaveOpen(false); handleUpdate(); }} variant="contained" disabled={updating}>
            {updating && <Loader2 size={16} className="animate-spin mr-2" />}
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Alias Confirmation */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' } }}>
        <DialogTitle>Delete Alias Mapping</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Delete alias <strong>"{selectedItem?.originalCustomerName}"</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleDeleteAlias} color="error" variant="contained" disabled={deleting}>
            {deleting && <Loader2 size={16} className="animate-spin mr-2" />}
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Mappings;
