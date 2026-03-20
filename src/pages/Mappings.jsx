import React, { useState, useEffect, useCallback } from 'react';
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

const API_BASE = '/api/v1';

const Mappings = () => {
  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Expanded rows
  const [expandedIds, setExpandedIds] = useState(new Set());

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    originalCustomerName: '', cleanedCustomerName: '', canonicalCustomerId: '',
    canonicalCustomerName: '', cisCode: '', mgs: '', countryOfOperation: '', region: '',
  });

  // Push to Postgres
  const [pushingPg, setPushingPg] = useState(false);

  const handlePushToPostgres = async () => {
    setPushingPg(true);
    try {
      const res = await fetch(`${API_BASE}/push-to-postgres`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        toast.success(
          `Pushed to Postgres: ${data.mastersCreated} masters created, ${data.mastersUpdated} updated, ${data.mappingsCreated} mappings created, ${data.mappingsUpdated} updated`
        );
        if (data.errors?.length > 0) data.errors.forEach((e) => toast.error(e));
      } else {
        toast.error('Failed to push to Postgres');
      }
    } catch (err) {
      toast.error(err.message || 'Push to Postgres failed');
    } finally {
      setPushingPg(false);
    }
  };

  // ─── Load data ────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page + 1), pageSize: String(pageSize) });
      if (search) params.append('search', search);
      const res = await fetch(`${API_BASE}/customer-masters-with-aliases?${params}`);
      const data = await res.json();
      setMasters(data.items || []);
      setTotalCount(data.totalCount || 0);
    } catch {
      setMasters([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Expand / collapse ────────────────────────────────────────
  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(masters.map((m) => m.canonicalCustomerId)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // ─── CRUD ─────────────────────────────────────────────────────
  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/customer-alias-mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalCustomerName: form.originalCustomerName,
          cleanedCustomerName: form.cleanedCustomerName || null,
          canonicalCustomerId: form.canonicalCustomerId ? parseInt(form.canonicalCustomerId) : null,
          canonicalCustomerName: form.canonicalCustomerName || null,
          cisCode: form.cisCode || null,
          mgs: form.mgs || null,
          countryOfOperation: form.countryOfOperation || null,
          region: form.region || null,
        }),
      });
      if (res.ok) { toast.success('Mapping created'); setDialogOpen(false); loadData(); }
      else toast.error('Failed to create');
    } catch { toast.error('Failed to create'); }
    finally { setSaving(false); }
  };

  const handleDeleteAlias = async () => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/customer-alias-mappings/${selectedItem.id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('Alias mapping deleted'); setDeleteDialogOpen(false); setSelectedItem(null); loadData(); }
      else toast.error('Failed to delete');
    } catch { toast.error('Failed to delete'); }
    finally { setSaving(false); }
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
    setDialogMode('create');
    setDialogOpen(true);
  };

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

            <IconButton size="small" onClick={loadData} title="Refresh"
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
              onClick={handlePushToPostgres}
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
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.05em' }}>
                    Canonical ID
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.05em' }}>
                    Canonical Customer Name
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.05em' }}>
                    CIS Code
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.05em' }}>
                    Ctry Of Op
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.05em' }}>
                    MGS
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.05em' }}>
                    Region
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.05em', width: 90 }}>
                    Aliases
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {masters.map((master) => {
                  const isExpanded = expandedIds.has(master.canonicalCustomerId);
                  const aliases = master.aliasMappings || [];
                  return (
                    <React.Fragment key={master.canonicalCustomerId}>
                      {/* Master row */}
                      <TableRow
                        hover
                        onClick={() => toggleExpand(master.canonicalCustomerId)}
                        sx={{ cursor: 'pointer', '& td': { borderBottom: isExpanded ? 'none' : undefined } }}
                      >
                        <TableCell sx={{ px: 1 }}>
                          <IconButton size="small">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500} color="text.primary">{master.canonicalCustomerId}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} color="text.primary">{master.canonicalCustomerName}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{master.cisCode || '-'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{master.countryOfOperation || '-'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{master.mgs || '-'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{master.region || '-'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={aliases.length} size="small" color={aliases.length > 0 ? 'primary' : 'default'} variant="outlined" />
                        </TableCell>
                      </TableRow>

                      {/* Expanded child rows */}
                      <TableRow>
                        <TableCell colSpan={8} sx={{ py: 0, px: 0, borderBottom: isExpanded ? '1px solid' : 'none', borderColor: 'divider' }}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ mx: 4, my: 1.5, mb: 2 }}>
                              {aliases.length === 0 ? (
                                <Typography variant="body2" color="text.secondary" sx={{ py: 1, fontStyle: 'italic' }}>
                                  No alias mappings for this customer
                                </Typography>
                              ) : (
                                <Table size="small" sx={{ bgcolor: 'rgba(99, 102, 241, 0.04)', borderRadius: 1 }}>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', color: 'text.secondary', py: 0.5 }}>
                                        ID
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', color: 'text.secondary', py: 0.5 }}>
                                        Original Customer Name
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', color: 'text.secondary', py: 0.5 }}>
                                        Cleaned Customer Name
                                      </TableCell>
                                      <TableCell sx={{ width: 60, py: 0.5 }} />
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {aliases.map((alias) => (
                                      <TableRow key={alias.id} hover>
                                        <TableCell sx={{ py: 0.75 }}>
                                          <Typography variant="caption" color="text.secondary">{alias.id}</Typography>
                                        </TableCell>
                                        <TableCell sx={{ py: 0.75 }}>
                                          <Stack direction="row" spacing={1} alignItems="center">
                                            <FileText size={12} className="text-gray-500" />
                                            <Typography variant="body2" color="text.primary">{alias.originalCustomerName}</Typography>
                                          </Stack>
                                        </TableCell>
                                        <TableCell sx={{ py: 0.75 }}>
                                          <Typography variant="body2" color="text.secondary">{alias.cleanedCustomerName || '-'}</Typography>
                                        </TableCell>
                                        <TableCell sx={{ py: 0.75 }}>
                                          <IconButton size="small" title="Delete alias"
                                            onClick={() => { setSelectedItem(alias); setDeleteDialogOpen(true); }}
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

        {/* Pagination */}
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50]}
        />
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
            <TextField label="CIS Code" fullWidth size="small"
              value={form.cisCode} onChange={(e) => setForm({ ...form, cisCode: e.target.value })} />
            <TextField label="MGS" fullWidth size="small"
              value={form.mgs} onChange={(e) => setForm({ ...form, mgs: e.target.value })} />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField label="Ctry Of Op" fullWidth size="small"
              value={form.countryOfOperation} onChange={(e) => setForm({ ...form, countryOfOperation: e.target.value })} />
            <TextField label="Region" fullWidth size="small"
              value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleCreate} variant="contained" disabled={saving || !form.originalCustomerName.trim()}>
            {saving && <Loader2 size={16} className="animate-spin mr-2" />}
            Create
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
          <Button onClick={handleDeleteAlias} color="error" variant="contained" disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin mr-2" />}
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Mappings;
