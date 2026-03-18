import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Loader2, RefreshCw } from 'lucide-react';
import {
  Box, Paper, Typography, Button, TextField, Stack, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import toast from 'react-hot-toast';
import { cls } from '../styles/classes';

const API_BASE = '/api/v1';

const Mappings = () => {
  // CustomerAliasMapping state
  const [mappings, setMappings] = useState([]);
  const [mappingLoading, setMappingLoading] = useState(true);
  const [mappingSearch, setMappingSearch] = useState('');
  const [mappingPagination, setMappingPagination] = useState({ page: 0, pageSize: 25 });
  const [mappingTotal, setMappingTotal] = useState(0);

  // CustomerMaster state
  const [masters, setMasters] = useState([]);
  const [masterLoading, setMasterLoading] = useState(true);
  const [masterSearch, setMasterSearch] = useState('');
  const [masterPagination, setMasterPagination] = useState({ page: 0, pageSize: 25 });
  const [masterTotal, setMasterTotal] = useState(0);

  // Tab
  const [activeTab, setActiveTab] = useState('mappings');

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('create'); // create | edit
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ originalCustomerName: '', cleanedCustomerName: '', canonicalCustomerId: '' });

  // ─── Load CustomerAliasMapping ────────────────────────────────
  const loadMappings = useCallback(async () => {
    setMappingLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(mappingPagination.page + 1),
        pageSize: String(mappingPagination.pageSize),
      });
      if (mappingSearch) params.append('search', mappingSearch);
      const res = await fetch(`${API_BASE}/customer-alias-mappings?${params}`);
      const data = await res.json();
      setMappings(data.items || []);
      setMappingTotal(data.totalCount || 0);
    } catch {
      setMappings([]);
    } finally {
      setMappingLoading(false);
    }
  }, [mappingPagination, mappingSearch]);

  useEffect(() => { loadMappings(); }, [loadMappings]);

  // ─── Load CustomerMaster ──────────────────────────────────────
  const loadMasters = useCallback(async () => {
    setMasterLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(masterPagination.page + 1),
        pageSize: String(masterPagination.pageSize),
      });
      if (masterSearch) params.append('search', masterSearch);
      const res = await fetch(`${API_BASE}/customer-masters?${params}`);
      const data = await res.json();
      setMasters(data.items || []);
      setMasterTotal(data.totalCount || 0);
    } catch {
      setMasters([]);
    } finally {
      setMasterLoading(false);
    }
  }, [masterPagination, masterSearch]);

  useEffect(() => { loadMasters(); }, [loadMasters]);

  // ─── CRUD handlers ────────────────────────────────────────────
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
        }),
      });
      if (res.ok) { toast.success('Mapping created'); setDialogOpen(false); loadMappings(); }
      else toast.error('Failed to create');
    } catch { toast.error('Failed to create'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/customer-alias-mappings/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalCustomerName: form.originalCustomerName,
          cleanedCustomerName: form.cleanedCustomerName || null,
          canonicalCustomerId: form.canonicalCustomerId ? parseInt(form.canonicalCustomerId) : null,
        }),
      });
      if (res.ok) { toast.success('Mapping updated'); setDialogOpen(false); loadMappings(); }
      else toast.error('Failed to update');
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/customer-alias-mappings/${selectedItem.id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('Mapping deleted'); setDeleteDialogOpen(false); setSelectedItem(null); loadMappings(); }
      else toast.error('Failed to delete');
    } catch { toast.error('Failed to delete'); }
    finally { setSaving(false); }
  };

  const openCreate = () => {
    setForm({ originalCustomerName: '', cleanedCustomerName: '', canonicalCustomerId: '' });
    setDialogMode('create');
    setSelectedItem(null);
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setForm({
      originalCustomerName: row.originalCustomerName || '',
      cleanedCustomerName: row.cleanedCustomerName || '',
      canonicalCustomerId: row.canonicalCustomerId?.toString() || '',
    });
    setDialogMode('edit');
    setSelectedItem(row);
    setDialogOpen(true);
  };

  // ─── Mapping columns ─────────────────────────────────────────
  const mappingColumns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'originalCustomerName', headerName: 'Original Customer Name', flex: 1.5, minWidth: 250 },
    { field: 'cleanedCustomerName', headerName: 'Cleaned Customer Name', flex: 1.3, minWidth: 220,
      renderCell: (p) => p.value || <span style={{ color: '#64748b' }}>-</span> },
    { field: 'canonicalCustomerId', headerName: 'Canonical ID', width: 110 },
    {
      field: 'customerMaster', headerName: 'Canonical Customer Name', flex: 1.3, minWidth: 220,
      renderCell: (p) => p.value?.canonicalCustomerName || <span style={{ color: '#64748b' }}>-</span>,
    },
    {
      field: 'cisCode', headerName: 'CIS Code', width: 100,
      valueGetter: (value, row) => row.customerMaster?.cisCode || '-',
    },
    {
      field: 'actions', headerName: '', width: 100, sortable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5}>
          <button onClick={() => openEdit(p.row)} className="p-1.5 rounded text-gray-500 hover:text-primary-400 hover:bg-primary-500/10 transition-all">
            <Pencil size={14} />
          </button>
          <button onClick={() => { setSelectedItem(p.row); setDeleteDialogOpen(true); }} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <Trash2 size={14} />
          </button>
        </Stack>
      ),
    },
  ];

  // ─── Master columns ───────────────────────────────────────────
  const masterColumns = [
    { field: 'canonicalCustomerId', headerName: 'Canonical ID', width: 110 },
    { field: 'canonicalCustomerName', headerName: 'Canonical Customer Name', flex: 1.5, minWidth: 250 },
    { field: 'cisCode', headerName: 'CIS Code', width: 100 },
    { field: 'countryOfOperation', headerName: 'Ctry Of Op', flex: 1, minWidth: 130 },
    { field: 'mgs', headerName: 'MGS', width: 140 },
    { field: 'countryOfIncorporation', headerName: 'Ctry of Inc', flex: 1, minWidth: 130 },
    { field: 'region', headerName: 'Region', width: 130 },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Mappings</h2>
          <p className="text-gray-400 mt-1">Manage CustomerAliasMapping and CustomerMaster data</p>
        </div>
      </motion.div>

      {/* Tab toggle */}
      <div className="flex bg-surface-800 rounded-md border border-surface-500/30 p-1 w-fit">
        <button onClick={() => setActiveTab('mappings')}
          className={`px-5 py-2 rounded text-sm font-medium transition-all ${activeTab === 'mappings' ? 'bg-primary-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>
          CustomerAliasMapping
          <Chip label={mappingTotal} size="small" sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} color={activeTab === 'mappings' ? 'default' : 'primary'} variant="outlined" />
        </button>
        <button onClick={() => setActiveTab('masters')}
          className={`px-5 py-2 rounded text-sm font-medium transition-all ${activeTab === 'masters' ? 'bg-primary-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>
          CustomerMaster
          <Chip label={masterTotal} size="small" sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} color={activeTab === 'masters' ? 'default' : 'primary'} variant="outlined" />
        </button>
      </div>

      {/* CustomerAliasMapping Tab */}
      {activeTab === 'mappings' && (
        <Paper sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField size="small" fullWidth label="Search by original or cleaned name"
              value={mappingSearch} onChange={(e) => setMappingSearch(e.target.value)} />
            <Button size="small" variant="outlined" startIcon={<RefreshCw size={14} />} onClick={loadMappings} sx={{ whiteSpace: 'nowrap' }}>Refresh</Button>
            <Button size="small" variant="contained" startIcon={<Plus size={14} />} onClick={openCreate} sx={{ whiteSpace: 'nowrap' }}>New Mapping</Button>
          </Box>
          <Box sx={{ height: 550 }}>
            <DataGrid rows={mappings} columns={mappingColumns} loading={mappingLoading}
              rowCount={mappingTotal} paginationMode="server"
              paginationModel={mappingPagination} onPaginationModelChange={setMappingPagination}
              pageSizeOptions={[10, 25, 50]} density="compact" disableRowSelectionOnClick
              getRowId={(row) => row.id}
              sx={{ bgcolor: 'background.paper' }} />
          </Box>
        </Paper>
      )}

      {/* CustomerMaster Tab */}
      {activeTab === 'masters' && (
        <Paper sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField size="small" fullWidth label="Search by canonical name or CIS code"
              value={masterSearch} onChange={(e) => setMasterSearch(e.target.value)} />
            <Button size="small" variant="outlined" startIcon={<RefreshCw size={14} />} onClick={loadMasters} sx={{ whiteSpace: 'nowrap' }}>Refresh</Button>
          </Box>
          <Box sx={{ height: 550 }}>
            <DataGrid rows={masters} columns={masterColumns} loading={masterLoading}
              rowCount={masterTotal} paginationMode="server"
              paginationModel={masterPagination} onPaginationModelChange={setMasterPagination}
              pageSizeOptions={[10, 25, 50]} density="compact" disableRowSelectionOnClick
              getRowId={(row) => row.canonicalCustomerId}
              sx={{ bgcolor: 'background.paper' }} />
          </Box>
        </Paper>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' } }}>
        <DialogTitle>{dialogMode === 'create' ? 'Create Mapping' : 'Edit Mapping'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="Original Customer Name" fullWidth size="small" required
            value={form.originalCustomerName} onChange={(e) => setForm({ ...form, originalCustomerName: e.target.value })} />
          <TextField label="Cleaned Customer Name" fullWidth size="small"
            value={form.cleanedCustomerName} onChange={(e) => setForm({ ...form, cleanedCustomerName: e.target.value })} />
          <TextField label="Canonical Customer ID" fullWidth size="small" type="number"
            value={form.canonicalCustomerId} onChange={(e) => setForm({ ...form, canonicalCustomerId: e.target.value })} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={dialogMode === 'create' ? handleCreate : handleUpdate} variant="contained"
            disabled={saving || !form.originalCustomerName.trim()}>
            {saving && <Loader2 size={16} className="animate-spin mr-2" />}
            {dialogMode === 'create' ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' } }}>
        <DialogTitle>Delete Mapping</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Delete mapping for <strong>{selectedItem?.originalCustomerName}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin mr-2" />}
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Mappings;
