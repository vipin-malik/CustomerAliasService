import React, { useState, useEffect } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client';
import { motion } from 'framer-motion';
import {
  Search, Play, Loader2, CheckCircle, AlertTriangle, Plus,
  Download, ChevronDown, ChevronUp, Database, Pencil, Save, Upload, FileUp,
} from 'lucide-react';
import {
  Box, Paper, Typography, Chip, Button, TextField,
  LinearProgress, Stack, Stepper, Step, StepLabel,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Autocomplete,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import toast from 'react-hot-toast';
import ConfidenceBadge from '../components/ConfidenceBadge';
import {
  RESOLVE_ALIAS, RESOLVE_ALIASES_BULK, GET_INVESTORS,
  GET_CUSTOMER_MASTERS, CREATE_CUSTOMER_ALIAS_MAPPING, PUSH_TO_DB,
} from '../services/graphqlClient';

const NEEDS_EDIT = (row) => !row.isResolved || (row.confidenceScore != null && row.confidenceScore <= 90);

const mapBulkResult = (r, i, name) => ({
  id: i + 1, originalName: name,
  cleanedName: r.commonName || null,
  canonicalCustomerId: r.canonicalCustomerId || null,
  canonicalName: r.canonicalCustomerName || null,
  mgs: r.mgs || null, cisCode: r.cisCode || null,
  ctryOfOp: r.country || null, region: r.region || null,
  isResolved: r.isResolved, confidenceScore: r.confidenceScore,
  matchedAlias: r.matchedAlias || null,
});

const Resolve = () => {
  const [singleName, setSingleName] = useState('');
  const [singleResult, setSingleResult] = useState(null);

  const [loadedCustomers, setLoadedCustomers] = useState([]);
  const [dbSearch, setDbSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState({ type: 'include', ids: new Set() });

  const [bulkResults, setBulkResults] = useState([]);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkLoading, setBulkLoading] = useState(false);

  const [showBulkInput, setShowBulkInput] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editSource, setEditSource] = useState('single');
  const [editForm, setEditForm] = useState({
    originalCustomerName: '', cleanedCustomerName: '', canonicalCustomerId: '',
    canonicalCustomerName: '', cisCode: '', mgs: '', countryOfOperation: '', region: '',
  });
  const [masterOptions, setMasterOptions] = useState([]);

  // ─── Apollo lazy queries ───────────────────────────────────────
  const [resolveOne, { loading: singleLoading }] = useLazyQuery(RESOLVE_ALIAS, {
    onCompleted: (data) => setSingleResult(data.resolveAlias),
    onError: (err) => setSingleResult({ isResolved: false, error: err.message }),
  });

  const [resolveBulk] = useLazyQuery(RESOLVE_ALIASES_BULK);

  const [loadInvestors, { loading: loadLoading }] = useLazyQuery(GET_INVESTORS, {
    onCompleted: (data) => {
      const customers = (data.investors?.items || []).map((inv, idx) => ({
        id: inv.id || idx + 1, name: inv.name || '',
        cisCode: inv.cisCode || '', tranche: inv.tranche || '',
        loanType: inv.source || '', seniority: inv.seniority || '',
        currency: inv.currency || '', country: inv.country || '', industry: inv.industry || '',
      }));
      setLoadedCustomers(customers);
      setSelectedIds({ type: 'include', ids: new Set(customers.map((i) => i.id)) });
      setActiveStep(1);
      setBulkResults([]);
    },
    onError: () => setLoadedCustomers([]),
  });

  const [fetchMasters, { loading: masterLoading }] = useLazyQuery(GET_CUSTOMER_MASTERS, {
    onCompleted: (data) => setMasterOptions(data.customerMasters?.items || []),
    onError: () => setMasterOptions([]),
  });

  // ─── Apollo mutations ─────────────────────────────────────────
  const [createMapping, { loading: editSaving }] = useMutation(CREATE_CUSTOMER_ALIAS_MAPPING);
  const [pushToDbMutation, { loading: pushing }] = useMutation(PUSH_TO_DB);

  // ─── Initial load of master options ────────────────────────────
  useEffect(() => { fetchMasters({ variables: { page: 1, pageSize: 50, search: null } }); }, [fetchMasters]);

  const loadMasters = (search) => {
    fetchMasters({ variables: { page: 1, pageSize: 50, search: search || null } });
  };

  const getSelectedCount = () => {
    if (!selectedIds.ids) return 0;
    return selectedIds.type === 'include' ? selectedIds.ids.size : loadedCustomers.length - selectedIds.ids.size;
  };
  const selectedCount = getSelectedCount();

  // ─── Open edit dialog ──────────────────────────────────────────
  const openEditDialog = (originalName, cleanedName, canonicalId, source, row, extra = {}) => {
    setEditForm({
      originalCustomerName: originalName || '', cleanedCustomerName: cleanedName || '',
      canonicalCustomerId: canonicalId?.toString() || '', canonicalCustomerName: extra.canonicalCustomerName || '',
      cisCode: extra.cisCode || '', mgs: extra.mgs || '',
      countryOfOperation: extra.countryOfOperation || '', region: extra.region || '',
    });
    setEditSource(source);
    setEditRow(row);
    setEditOpen(true);
  };

  // ─── Save mapping ─────────────────────────────────────────────
  const handleSaveMapping = async () => {
    if (!editForm.originalCustomerName.trim()) return;
    try {
      await createMapping({
        variables: {
          input: {
            originalCustomerName: editForm.originalCustomerName.trim(),
            cleanedCustomerName: editForm.cleanedCustomerName.trim() || null,
            canonicalCustomerId: editForm.canonicalCustomerId ? parseInt(editForm.canonicalCustomerId) : null,
            canonicalCustomerName: editForm.canonicalCustomerName.trim() || null,
            cisCode: editForm.cisCode.trim() || null,
            mgs: editForm.mgs.trim() || null,
            countryOfOperation: editForm.countryOfOperation.trim() || null,
            region: editForm.region.trim() || null,
          },
        },
      });
      toast.success('Mapping saved');
      setEditOpen(false);

      // Re-resolve to update result
      const { data } = await resolveOne({ variables: { aliasName: editForm.originalCustomerName.trim(), assetClass: null } });
      const resolved = data?.resolveAlias;
      if (!resolved) return;

      if (editSource === 'single') {
        setSingleResult(resolved);
      } else if (editSource === 'bulk' && editRow) {
        setBulkResults((prev) => prev.map((r) =>
          r.id === editRow.id ? {
            ...r, cleanedName: resolved.commonName || null,
            canonicalCustomerId: resolved.canonicalCustomerId || null,
            canonicalName: resolved.canonicalCustomerName || null,
            cisCode: resolved.cisCode || null, mgs: resolved.mgs || null,
            ctryOfOp: resolved.country || null, region: resolved.region || null,
            isResolved: resolved.isResolved, confidenceScore: resolved.confidenceScore,
            matchedAlias: resolved.matchedAlias || null,
          } : r
        ));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    }
  };

  // ─── Single resolve ────────────────────────────────────────────
  const handleSingleResolve = () => {
    if (!singleName.trim()) return;
    setSingleResult(null);
    resolveOne({ variables: { aliasName: singleName.trim(), assetClass: null } });
  };

  // ─── Load from DB ──────────────────────────────────────────────
  const handleLoadFromDb = () => {
    loadInvestors({ variables: { page: 1, pageSize: 10000, search: dbSearch || null } });
  };

  const handleBulkTextInput = (text) => {
    const names = text.split(/[\n,;]+/).map((n) => n.trim()).filter(Boolean);
    const customers = names.map((name, idx) => ({
      id: idx + 1, name, cisCode: '-', tranche: '-', loanType: '-',
      seniority: '-', currency: '-', country: '-', industry: '-',
    }));
    setLoadedCustomers(customers);
    setSelectedIds({ type: 'include', ids: new Set(customers.map((i) => i.id)) });
    setActiveStep(1);
    setBulkResults([]);
  };

  // ─── Bulk resolve ──────────────────────────────────────────────
  const handleBulkResolve = async () => {
    const selectedSet = selectedIds.ids || new Set();
    const selectedCustomers = selectedIds.type === 'include'
      ? loadedCustomers.filter((i) => selectedSet.has(i.id))
      : loadedCustomers.filter((i) => !selectedSet.has(i.id));
    if (selectedCustomers.length === 0) return;

    setBulkLoading(true);
    setBulkResults([]);
    setBulkProgress({ current: 0, total: selectedCustomers.length });
    setActiveStep(2);

    const names = selectedCustomers.map((i) => i.name);
    try {
      const { data } = await resolveBulk({ variables: { aliases: names.map((n) => ({ aliasName: n })) } });
      const bulkData = data?.resolveAliasesBulk;
      if (Array.isArray(bulkData)) {
        setBulkResults(bulkData.map((r, i) => mapBulkResult(r, i, names[i])));
        setBulkProgress({ current: names.length, total: names.length });
        setBulkLoading(false);
        return;
      }
    } catch { /* fall through to individual resolve */ }

    const results = [];
    const batchSize = 5;
    for (let i = 0; i < names.length; i += batchSize) {
      const batch = names.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map((name) => resolveOne({ variables: { aliasName: name, assetClass: null } }))
      );
      batchResults.forEach((r, idx) => {
        const d = r.status === 'fulfilled' ? r.value?.data?.resolveAlias : null;
        results.push(mapBulkResult(d || { isResolved: false }, results.length, batch[idx]));
      });
      setBulkProgress({ current: Math.min(i + batchSize, names.length), total: names.length });
      setBulkResults([...results]);
    }
    setBulkLoading(false);
  };

  const handleExportResults = () => {
    if (bulkResults.length === 0) return;
    const csv = [
      'Original Name,Cleaned Name,Canonical ID,Canonical Name,CIS Code,MGS,Ctry Of Op,Region,Resolved,Confidence,Matched Alias',
      ...bulkResults.map((r) =>
        [`"${r.originalName || ''}"`, `"${r.cleanedName || ''}"`, r.canonicalCustomerId || '',
          `"${r.canonicalName || ''}"`, `"${r.cisCode || ''}"`, `"${r.mgs || ''}"`,
          `"${r.ctryOfOp || ''}"`, `"${r.region || ''}"`,
          r.isResolved ? 'Yes' : 'No', r.confidenceScore || '', `"${r.matchedAlias || ''}"`,
        ].join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'resolution-results.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Save to SQL Server ────────────────────────────────────────
  const handleSaveToSqlServer = async () => {
    if (bulkResults.length === 0) return;
    try {
      const { data } = await pushToDbMutation({
        variables: {
          records: bulkResults.map((r) => ({
            originalCustomerName: r.originalName,
            cleanedCustomerName: r.cleanedName || r.originalName,
            canonicalCustomerId: r.canonicalCustomerId || null,
            canonicalCustomerName: r.canonicalName || null,
            cisCode: r.cisCode || null,
            countryOfOperation: r.ctryOfOp || null,
            region: r.region || null,
            mgs: r.mgs || null,
          })),
        },
      });
      const d = data.pushToDb;
      toast.success(`Saved to SQL Server: ${d.mappingsCreated} created, ${d.mappingsUpdated} updated, ${d.mastersCreated} masters created`);
      if (d.errors?.length > 0) d.errors.forEach((e) => toast.error(e));
    } catch (err) {
      toast.error(err.message || 'Push failed');
    }
  };

  // ─── Upload file ───────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result;
      if (!text) return;
      let names = [];
      if (file.name.endsWith('.csv')) {
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length === 0) return;
        const cols = lines[0].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const nameColIdx = cols.findIndex((c) => {
          const cl = c.toLowerCase();
          return cl.includes('name') || cl.includes('customer') || cl.includes('obligor');
        });
        if (nameColIdx >= 0) {
          names = lines.slice(1).map((line) => {
            const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
            return parts[nameColIdx] || '';
          }).filter(Boolean);
        } else {
          names = lines.slice(1).map((line) => line.split(',')[0]?.trim().replace(/^"|"$/g, '') || '').filter(Boolean);
        }
      } else {
        names = text.split(/[\n\r]+/).map((n) => n.trim()).filter(Boolean);
      }
      if (names.length === 0) { toast.error('No customer names found in file'); return; }
      const customers = names.map((name, idx) => ({
        id: idx + 1, name, cisCode: '-', tranche: '-', loanType: '-',
        seniority: '-', currency: '-', country: '-', industry: '-',
      }));
      setLoadedCustomers(customers);
      setSelectedIds({ type: 'include', ids: new Set(customers.map((i) => i.id)) });
      setActiveStep(1); setBulkResults([]);
      toast.success(`Loaded ${names.length} customer names from ${file.name}`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleReset = () => {
    setLoadedCustomers([]); setSelectedIds({ type: 'include', ids: new Set() });
    setBulkResults([]); setActiveStep(0); setBulkProgress({ current: 0, total: 0 });
  };

  const resolvedCount = bulkResults.filter((r) => r.isResolved && r.confidenceScore > 90).length;
  const needsAttentionCount = bulkResults.filter((r) => NEEDS_EDIT(r)).length;

  const customerColumns = [
    { field: 'name', headerName: 'Customer Name', flex: 1.5, minWidth: 200 },
    { field: 'cisCode', headerName: 'CIS Code', width: 110 },
    { field: 'tranche', headerName: 'Tranche', width: 130 },
    { field: 'loanType', headerName: 'Loan Type', width: 100 },
    { field: 'seniority', headerName: 'Seniority', width: 120 },
    { field: 'currency', headerName: 'Currency', width: 90 },
    { field: 'country', headerName: 'Country', flex: 1, minWidth: 130 },
    { field: 'industry', headerName: 'Industry', flex: 1, minWidth: 140 },
  ];

  const resultColumns = [
    { field: 'originalName', headerName: 'Original Customer Name', flex: 1.5, minWidth: 220 },
    { field: 'cleanedName', headerName: 'Cleaned Customer Name', flex: 1.2, minWidth: 180,
      renderCell: (p) => p.value || <span style={{ color: '#64748b' }}>-</span> },
    { field: 'canonicalCustomerId', headerName: 'Canonical ID', width: 95, renderCell: (p) => p.value || '-' },
    { field: 'canonicalName', headerName: 'Canonical Customer Name', flex: 1.2, minWidth: 180,
      renderCell: (p) => p.value || <span style={{ color: '#64748b' }}>-</span> },
    { field: 'cisCode', headerName: 'CIS Code', width: 90, renderCell: (p) => p.value || '-' },
    { field: 'mgs', headerName: 'MGS', width: 120, renderCell: (p) => p.value || '-' },
    { field: 'ctryOfOp', headerName: 'Ctry Of Op', width: 110, renderCell: (p) => p.value || '-' },
    { field: 'region', headerName: 'Region', width: 110, renderCell: (p) => p.value || '-' },
    { field: 'isResolved', headerName: 'Status', width: 130,
      renderCell: (p) => <ConfidenceBadge score={p.row.confidenceScore} isResolved={p.value} /> },
    { field: 'confidenceScore', headerName: 'Confidence', width: 95, renderCell: (p) => p.value ? `${p.value}%` : '-' },
    {
      field: 'edit', headerName: '', width: 70, sortable: false,
      renderCell: (p) => {
        if (!NEEDS_EDIT(p.row)) return null;
        return (
          <Button size="small" variant="outlined" color="warning" sx={{ minWidth: 0, px: 1, py: 0.5 }}
            onClick={() => openEditDialog(p.row.originalName, p.row.cleanedName, p.row.canonicalCustomerId, 'bulk', p.row, {
              canonicalCustomerName: p.row.canonicalName, cisCode: p.row.cisCode, mgs: p.row.mgs,
              countryOfOperation: p.row.ctryOfOp, region: p.row.region,
            })}>
            <Pencil size={14} />
          </Button>
        );
      },
    },
  ];

  const steps = ['Load Customers', 'Preview & Select', 'Resolution Results'];
  const singleNeedsEdit = singleResult && NEEDS_EDIT(singleResult);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-gray-100">Resolve Customer Names</h2>
        <p className="text-gray-400 mt-1">Map original customer names to cleaned and canonical names</p>
      </motion.div>

      {/* Single Resolution */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: 'text.primary' }}>Single Resolution</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField size="small" fullWidth label="Enter customer name or alias"
            value={singleName} onChange={(e) => setSingleName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSingleResolve()} />
          <Button variant="contained" onClick={handleSingleResolve}
            disabled={singleLoading || !singleName.trim()}
            startIcon={singleLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            sx={{ whiteSpace: 'nowrap', minWidth: 120 }}>
            Resolve
          </Button>
        </Stack>

        {singleResult && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 2, border: '1px solid',
              borderColor: singleNeedsEdit ? 'warning.main' : 'divider' }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                {singleResult.isResolved
                  ? <CheckCircle className="text-green-400" size={20} />
                  : <AlertTriangle className="text-yellow-400" size={20} />}
                <Typography fontWeight={600} color="text.primary">
                  {singleResult.isResolved ? 'Resolved' : 'Not Resolved'}
                </Typography>
                <ConfidenceBadge score={singleResult.confidenceScore} isResolved={singleResult.isResolved} />
                {singleNeedsEdit && (
                  <Button size="small" variant="outlined" color="warning" startIcon={<Pencil size={14} />}
                    onClick={() => openEditDialog(
                      singleResult.customerName || singleName, singleResult.commonName,
                      singleResult.canonicalCustomerId, 'single', null, {
                        canonicalCustomerName: singleResult.canonicalCustomerName,
                        cisCode: singleResult.cisCode, mgs: singleResult.mgs,
                        countryOfOperation: singleResult.country, region: singleResult.region,
                      })}>
                    Edit Mapping
                  </Button>
                )}
              </Stack>
              {singleResult.isResolved && (
                <Box sx={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '4px 16px', mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">Cleaned Name:</Typography>
                  <Typography variant="body2" color="text.primary" fontWeight={500}>{singleResult.commonName}</Typography>
                  <Typography variant="body2" color="text.secondary">Canonical Customer ID:</Typography>
                  <Typography variant="body2" color="text.primary" fontWeight={500}>{singleResult.canonicalCustomerId ?? '-'}</Typography>
                  <Typography variant="body2" color="text.secondary">Canonical Customer Name:</Typography>
                  <Typography variant="body2" color="text.primary" fontWeight={500}>{singleResult.canonicalCustomerName || '-'}</Typography>
                  <Typography variant="body2" color="text.secondary">CIS Code:</Typography>
                  <Typography variant="body2" color="text.primary">{singleResult.cisCode || '-'}</Typography>
                  <Typography variant="body2" color="text.secondary">MGS:</Typography>
                  <Typography variant="body2" color="text.primary">{singleResult.mgs || '-'}</Typography>
                  <Typography variant="body2" color="text.secondary">Ctry Of Op:</Typography>
                  <Typography variant="body2" color="text.primary">{singleResult.country || '-'}</Typography>
                  <Typography variant="body2" color="text.secondary">Region:</Typography>
                  <Typography variant="body2" color="text.primary">{singleResult.region || '-'}</Typography>
                  <Typography variant="body2" color="text.secondary">Matched Alias:</Typography>
                  <Typography variant="body2" color="text.primary">{singleResult.matchedAlias || '-'}</Typography>
                </Box>
              )}
              {!singleResult.isResolved && !singleNeedsEdit && singleResult.error && (
                <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>{singleResult.error}</Typography>
              )}
              {singleResult.potentialMatches?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary">Potential Matches:</Typography>
                  {singleResult.potentialMatches.map((pm, i) => (
                    <Stack key={i} direction="row" spacing={2} sx={{ mt: 0.5 }}>
                      <Typography variant="body2" color="text.primary">{pm.commonName}</Typography>
                      <Typography variant="body2" color="text.secondary">via {pm.matchedAlias}</Typography>
                      <ConfidenceBadge score={pm.confidenceScore} isResolved={true} />
                    </Stack>
                  ))}
                </Box>
              )}
            </Box>
          </motion.div>
        )}
      </Paper>

      {/* Bulk Resolution */}
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} color="text.primary">Bulk Resolution</Typography>
          {activeStep > 0 && <Button size="small" variant="outlined" color="secondary" onClick={handleReset}>Start Over</Button>}
        </Stack>

        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (<Step key={label}><StepLabel>{label}</StepLabel></Step>))}
        </Stepper>

        {activeStep === 0 && (
          <Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
              <TextField size="small" fullWidth label="Filter by customer name" value={dbSearch}
                onChange={(e) => setDbSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLoadFromDb()} />
              <Button variant="contained" onClick={handleLoadFromDb} disabled={loadLoading}
                startIcon={loadLoading ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                sx={{ whiteSpace: 'nowrap', minWidth: 200 }}>Load from Database</Button>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button variant="outlined" component="label" startIcon={<FileUp size={16} />} sx={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>
                Upload File (CSV / TXT)
                <input type="file" accept=".csv,.txt,.text" onChange={handleFileUpload} onClick={(e) => { e.target.value = ''; }}
                  style={{ clip: 'rect(0 0 0 0)', clipPath: 'inset(50%)', height: 1, overflow: 'hidden', position: 'absolute', bottom: 0, left: 0, whiteSpace: 'nowrap', width: 1 }} />
              </Button>
              <Button variant="outlined" onClick={() => setShowBulkInput(!showBulkInput)}
                startIcon={showBulkInput ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                sx={{ whiteSpace: 'nowrap' }}>Paste Names</Button>
            </Stack>
            {showBulkInput && (
              <TextField fullWidth multiline rows={5} sx={{ mt: 2, fontFamily: 'monospace', fontSize: '0.75rem' }}
                placeholder="Paste customer names (one per line, or comma/semicolon separated)..."
                onChange={(e) => handleBulkTextInput(e.target.value)} />
            )}
          </Box>
        )}

        {activeStep === 1 && loadedCustomers.length > 0 && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Chip label={`${loadedCustomers.length} customers loaded`} color="primary" variant="outlined" size="small" />
                <Chip label={`${selectedCount} selected`} color={selectedCount > 0 ? 'success' : 'default'} variant="outlined" size="small" />
              </Stack>
              <Button variant="contained" onClick={handleBulkResolve} disabled={bulkLoading || selectedCount === 0}
                startIcon={bulkLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}>
                Resolve {selectedCount} Selected
              </Button>
            </Stack>
            <Box sx={{ height: 500 }}>
              <DataGrid rows={loadedCustomers} columns={customerColumns} checkboxSelection
                rowSelectionModel={selectedIds} onRowSelectionModelChange={(sel) => setSelectedIds(sel)}
                pageSizeOptions={[10, 25, 50, 100]}
                initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                density="compact" sx={{ bgcolor: 'background.paper' }} />
            </Box>
          </Box>
        )}

        {activeStep === 2 && (
          <Box>
            {bulkLoading && (
              <Box sx={{ mb: 3 }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Resolving...</Typography>
                  <Typography variant="body2" color="text.secondary">{bulkProgress.current} / {bulkProgress.total}</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={bulkProgress.total ? (bulkProgress.current / bulkProgress.total) * 100 : 0} sx={{ height: 8, borderRadius: 4 }} />
              </Box>
            )}
            {bulkResults.length > 0 && !bulkLoading && (
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Chip icon={<CheckCircle size={14} />} label={`${resolvedCount} resolved (>90%)`} color="success" variant="outlined" size="small" />
                <Chip icon={<Pencil size={14} />} label={`${needsAttentionCount} needs attention`} color="warning" variant="outlined" size="small" />
                <Box sx={{ flexGrow: 1 }} />
                <Button size="small" variant="outlined" startIcon={<Download size={14} />} onClick={handleExportResults}>Export CSV</Button>
                <Button size="small" variant="contained" color="primary" disabled={pushing}
                  startIcon={pushing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  onClick={handleSaveToSqlServer}>
                  {pushing ? 'Saving...' : 'Save to SQL Server'}
                </Button>
              </Stack>
            )}
            {bulkResults.length > 0 && (
              <Box sx={{ height: 500 }}>
                <DataGrid rows={bulkResults} columns={resultColumns}
                  pageSizeOptions={[10, 25, 50, 100]}
                  initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                  density="compact"
                  getRowClassName={(p) => NEEDS_EDIT(p.row) ? 'needs-edit-row' : ''}
                  sx={{ bgcolor: 'background.paper', '& .needs-edit-row': { bgcolor: 'rgba(234, 179, 8, 0.08)' } }} />
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* Edit Mapping Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' } }}>
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center"><Pencil size={18} /><span>Edit Customer Alias Mapping</span></Stack>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
          <TextField label="Original Customer Name" fullWidth size="small"
            value={editForm.originalCustomerName} onChange={(e) => setEditForm({ ...editForm, originalCustomerName: e.target.value })}
            InputProps={{ readOnly: true }} sx={{ '& .MuiInputBase-input': { color: 'text.secondary' } }} />
          <TextField label="Cleaned Customer Name" fullWidth size="small"
            value={editForm.cleanedCustomerName} onChange={(e) => setEditForm({ ...editForm, cleanedCustomerName: e.target.value })}
            helperText="The normalized/cleaned version of the customer name" />
          <Autocomplete freeSolo options={masterOptions}
            getOptionLabel={(opt) => typeof opt === 'string' ? opt : opt.canonicalCustomerName || ''}
            inputValue={editForm.canonicalCustomerName} loading={masterLoading}
            onInputChange={(_, val, reason) => {
              if (reason === 'input') {
                setEditForm({ ...editForm, canonicalCustomerName: val, canonicalCustomerId: '' });
                loadMasters(val);
              }
            }}
            onChange={(_, val) => {
              if (val && typeof val !== 'string') {
                setEditForm({ ...editForm, canonicalCustomerId: val.canonicalCustomerId.toString(),
                  canonicalCustomerName: val.canonicalCustomerName || '', cisCode: val.cisCode || '',
                  mgs: val.mgs || '', countryOfOperation: val.countryOfOperation || '', region: val.region || '' });
              } else if (typeof val === 'string') {
                setEditForm({ ...editForm, canonicalCustomerName: val, canonicalCustomerId: '' });
              }
            }}
            filterOptions={(options, state) => {
              const filtered = options.filter((o) => o.canonicalCustomerName?.toLowerCase().includes(state.inputValue.toLowerCase()));
              if (state.inputValue && !filtered.some((o) => o.canonicalCustomerName?.toLowerCase() === state.inputValue.toLowerCase())) {
                filtered.push({ isNew: true, canonicalCustomerName: state.inputValue, canonicalCustomerId: 0 });
              }
              return filtered;
            }}
            renderOption={(props, opt) => {
              const { key, ...rest } = props;
              if (opt.isNew) return (<li key="new" {...rest}><Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'success.main' }}><Plus size={14} /><Typography variant="body2" fontWeight={500}>Add "{opt.canonicalCustomerName}" as new customer</Typography></Stack></li>);
              return (<li key={key} {...rest}><Box><Typography variant="body2" fontWeight={500}>{opt.canonicalCustomerName}</Typography><Typography variant="caption" color="text.secondary">ID: {opt.canonicalCustomerId} | {opt.cisCode || '-'} | {opt.countryOfOperation || '-'} | {opt.mgs || '-'}</Typography></Box></li>);
            }}
            renderInput={(params) => (
              <TextField {...params} label="Canonical Customer Name" size="small"
                helperText={editForm.canonicalCustomerId ? `Linked to existing customer (ID: ${editForm.canonicalCustomerId})` : editForm.canonicalCustomerName ? 'New customer will be created' : 'Type to search or add new'} />
            )}
          />
          <Stack direction="row" spacing={2}>
            <TextField label="CIS Code" fullWidth size="small" value={editForm.cisCode} onChange={(e) => setEditForm({ ...editForm, cisCode: e.target.value })} />
            <TextField label="MGS" fullWidth size="small" value={editForm.mgs} onChange={(e) => setEditForm({ ...editForm, mgs: e.target.value })} />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField label="Ctry Of Op" fullWidth size="small" value={editForm.countryOfOperation} onChange={(e) => setEditForm({ ...editForm, countryOfOperation: e.target.value })} />
            <TextField label="Region" fullWidth size="small" value={editForm.region} onChange={(e) => setEditForm({ ...editForm, region: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleSaveMapping} variant="contained" color="warning"
            disabled={editSaving || !editForm.originalCustomerName.trim()}
            startIcon={editSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}>
            Save Mapping
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Resolve;
