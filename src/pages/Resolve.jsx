import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Play, Loader2, CheckCircle, AlertTriangle,
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
import { resolveAlias, resolveAliasesBulk } from '../services/apiClient';
import { getCustomers } from '../services/customerApiClient';

const NEEDS_EDIT = (row) => !row.isResolved || (row.confidenceScore != null && row.confidenceScore <= 90);

const Resolve = () => {
  const [singleName, setSingleName] = useState('');
  const [singleResult, setSingleResult] = useState(null);
  const [singleLoading, setSingleLoading] = useState(false);

  const [loadedCustomers, setLoadedCustomers] = useState([]);
  const [loadLoading, setLoadLoading] = useState(false);
  const [dbSearch, setDbSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState({ type: 'include', ids: new Set() });

  const [bulkResults, setBulkResults] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [pushing, setPushing] = useState(false);

  const [showBulkInput, setShowBulkInput] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null); // row being edited (bulk) or null (single)
  const [editSource, setEditSource] = useState('single'); // 'single' | 'bulk'
  const [editForm, setEditForm] = useState({
    originalCustomerName: '',
    cleanedCustomerName: '',
    canonicalCustomerId: '',
    canonicalCustomerName: '',
    cisCode: '',
    mgs: '',
    countryOfOperation: '',
    region: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [masterOptions, setMasterOptions] = useState([]);
  const [masterLoading, setMasterLoading] = useState(false);

  const getSelectedCount = () => {
    if (!selectedIds.ids) return 0;
    return selectedIds.type === 'include'
      ? selectedIds.ids.size
      : loadedCustomers.length - selectedIds.ids.size;
  };
  const selectedCount = getSelectedCount();

  // Load master options for autocomplete
  const loadMasters = async (search) => {
    setMasterLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '50' });
      if (search) params.append('search', search);
      const res = await fetch(`/api/v1/customer-masters?${params}`);
      const data = await res.json();
      setMasterOptions(data.items || []);
    } catch { setMasterOptions([]); }
    finally { setMasterLoading(false); }
  };

  useEffect(() => { loadMasters(''); }, []);

  // ─── Open edit dialog ─────────────────────────────────────────
  const openEditDialog = (originalName, cleanedName, canonicalId, source, row, extra = {}) => {
    setEditForm({
      originalCustomerName: originalName || '',
      cleanedCustomerName: cleanedName || '',
      canonicalCustomerId: canonicalId?.toString() || '',
      canonicalCustomerName: extra.canonicalCustomerName || '',
      cisCode: extra.cisCode || '',
      mgs: extra.mgs || '',
      countryOfOperation: extra.countryOfOperation || '',
      region: extra.region || '',
    });
    setEditSource(source);
    setEditRow(row);
    setEditOpen(true);
  };

  // ─── Save mapping ─────────────────────────────────────────────
  const handleSaveMapping = async () => {
    if (!editForm.originalCustomerName.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch('/api/v1/customer-alias-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalCustomerName: editForm.originalCustomerName.trim(),
          cleanedCustomerName: editForm.cleanedCustomerName.trim() || null,
          canonicalCustomerId: editForm.canonicalCustomerId ? parseInt(editForm.canonicalCustomerId) : null,
          canonicalCustomerName: editForm.canonicalCustomerName.trim() || null,
          cisCode: editForm.cisCode.trim() || null,
          mgs: editForm.mgs.trim() || null,
          countryOfOperation: editForm.countryOfOperation.trim() || null,
          region: editForm.region.trim() || null,
        }),
      });

      if (res.ok) {
        toast.success('Mapping saved');
        setEditOpen(false);

        // Re-resolve the name to update the result
        const resolved = await resolveAlias(editForm.originalCustomerName.trim(), '');

        if (editSource === 'single') {
          setSingleResult(resolved);
        } else if (editSource === 'bulk' && editRow) {
          setBulkResults((prev) =>
            prev.map((r) =>
              r.id === editRow.id
                ? {
                    ...r,
                    cleanedName: resolved.commonName || null,
                    canonicalCustomerId: resolved.canonicalCustomerId || null,
                    canonicalName: resolved.canonicalCustomerName || null,
                    cisCode: resolved.cisCode || null,
                    mgs: resolved.mgs || null,
                    ctryOfOp: resolved.country || null,
                    region: resolved.region || null,
                    isResolved: resolved.isResolved,
                    confidenceScore: resolved.confidenceScore,
                    matchedAlias: resolved.matchedAlias || null,
                  }
                : r
            )
          );
        }
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to save mapping');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setEditSaving(false);
    }
  };

  // ─── Single resolve ───────────────────────────────────────────
  const handleSingleResolve = async () => {
    if (!singleName.trim()) return;
    setSingleLoading(true);
    setSingleResult(null);
    try {
      const result = await resolveAlias(singleName.trim(), '');
      setSingleResult(result);
    } catch (err) {
      setSingleResult({ isResolved: false, error: err.message });
    } finally {
      setSingleLoading(false);
    }
  };

  // ─── Load from DB ─────────────────────────────────────────────
  const handleLoadFromDb = async () => {
    setLoadLoading(true);
    try {
      const result = await getCustomers({ page: 1, pageSize: 10000, search: dbSearch || undefined });
      const customers = (result.items || []).map((inv, idx) => ({
        id: inv.id || idx + 1, name: inv.name || '',
        cisCode: inv.cisCode || '', tranche: inv.tranche || '',
        loanType: inv.source || '', seniority: inv.seniority || '',
        currency: inv.currency || '', country: inv.country || '', industry: inv.industry || '',
      }));
      setLoadedCustomers(customers);
      setSelectedIds({ type: 'include', ids: new Set(customers.map((i) => i.id)) });
      setActiveStep(1);
      setBulkResults([]);
    } catch { setLoadedCustomers([]); }
    finally { setLoadLoading(false); }
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

  // ─── Bulk resolve ─────────────────────────────────────────────
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
      const aliases = names.map((n) => ({ aliasName: n, assetClass: '' }));
      const bulkData = await resolveAliasesBulk(aliases);
      if (Array.isArray(bulkData)) {
        setBulkResults(bulkData.map((r, i) => ({
          id: i + 1, originalName: names[i],
          cleanedName: r.commonName || null,
          canonicalCustomerId: r.canonicalCustomerId || null,
          canonicalName: r.canonicalCustomerName || null,
          mgs: r.mgs || null, cisCode: r.cisCode || null,
          ctryOfOp: r.country || null, region: r.region || null,
          isResolved: r.isResolved, confidenceScore: r.confidenceScore,
          matchedAlias: r.matchedAlias || null,
        })));
        setBulkProgress({ current: names.length, total: names.length });
        setBulkLoading(false);
        return;
      }
    } catch { /* fall through */ }

    const results = [];
    const batchSize = 5;
    for (let i = 0; i < names.length; i += batchSize) {
      const batch = names.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(batch.map((name) => resolveAlias(name, '')));
      batchResults.forEach((r, idx) => {
        const d = r.status === 'fulfilled' ? r.value : { isResolved: false };
        results.push({
          id: results.length + 1, originalName: batch[idx],
          cleanedName: d.commonName || null,
          canonicalCustomerId: d.canonicalCustomerId || null,
          canonicalName: d.canonicalCustomerName || null,
          mgs: d.mgs || null, cisCode: d.cisCode || null,
          ctryOfOp: d.country || null, region: d.region || null,
          isResolved: d.isResolved, confidenceScore: d.confidenceScore,
          matchedAlias: d.matchedAlias || null,
        });
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
        [
          `"${r.originalName || ''}"`, `"${r.cleanedName || ''}"`,
          r.canonicalCustomerId || '', `"${r.canonicalName || ''}"`,
          `"${r.cisCode || ''}"`, `"${r.mgs || ''}"`,
          `"${r.ctryOfOp || ''}"`, `"${r.region || ''}"`,
          r.isResolved ? 'Yes' : 'No', r.confidenceScore || '', `"${r.matchedAlias || ''}"`,
        ].join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resolution-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Save to SQL Server (primary) ──────────────────────────────
  const handleSaveToSqlServer = async () => {
    if (bulkResults.length === 0) return;
    setPushing(true);
    try {
      const records = bulkResults.map((r) => ({
        originalCustomerName: r.originalName,
        cleanedCustomerName: r.cleanedName || r.originalName,
        canonicalCustomerId: r.canonicalCustomerId || null,
        canonicalCustomerName: r.canonicalName || null,
        cisCode: r.cisCode || null,
        countryOfOperation: r.ctryOfOp || null,
        region: r.region || null,
        mgs: r.mgs || null,
      }));

      const res = await fetch('/api/v1/push-to-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(
          `Saved to SQL Server: ${data.mappingsCreated} created, ${data.mappingsUpdated} updated, ${data.mastersCreated} masters created`
        );
        if (data.errors?.length > 0) data.errors.forEach((e) => toast.error(e));
      } else {
        toast.error('Failed to save to SQL Server');
      }
    } catch (err) {
      toast.error(err.message || 'Push failed');
    } finally {
      setPushing(false);
    }
  };

  // ─── Push SQL Server → Postgres ────────────────────────────────
  const [pushingPg, setPushingPg] = useState(false);

  const handlePushToPostgres = async () => {
    setPushingPg(true);
    try {
      const res = await fetch('/api/v1/push-to-postgres', { method: 'POST' });
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

  // ─── Upload file ──────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result;
      if (!text) return;

      let names = [];

      if (file.name.endsWith('.csv')) {
        // Parse CSV — try to find a column with "name", "customer", or "obligor" in header
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length === 0) return;

        const header = lines[0].toLowerCase();
        const cols = lines[0].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const nameColIdx = cols.findIndex((c) => {
          const cl = c.toLowerCase();
          return cl.includes('name') || cl.includes('customer') || cl.includes('obligor');
        });

        if (nameColIdx >= 0) {
          // Use the identified column
          names = lines.slice(1).map((line) => {
            const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
            return parts[nameColIdx] || '';
          }).filter(Boolean);
        } else {
          // No header match — use first column
          names = lines.slice(1).map((line) => {
            const parts = line.split(',');
            return parts[0]?.trim().replace(/^"|"$/g, '') || '';
          }).filter(Boolean);
        }
      } else {
        // Plain text — one name per line
        names = text.split(/[\n\r]+/).map((n) => n.trim()).filter(Boolean);
      }

      if (names.length === 0) {
        toast.error('No customer names found in file');
        return;
      }

      const customers = names.map((name, idx) => ({
        id: idx + 1, name, cisCode: '-', tranche: '-', loanType: '-',
        seniority: '-', currency: '-', country: '-', industry: '-',
      }));
      setLoadedCustomers(customers);
      setSelectedIds({ type: 'include', ids: new Set(customers.map((i) => i.id)) });
      setActiveStep(1);
      setBulkResults([]);
      toast.success(`Loaded ${names.length} customer names from ${file.name}`);
    };

    reader.readAsText(file);
    // Reset input so same file can be re-uploaded
    e.target.value = '';
  };

  const handleReset = () => {
    setLoadedCustomers([]);
    setSelectedIds({ type: 'include', ids: new Set() });
    setBulkResults([]);
    setActiveStep(0);
    setBulkProgress({ current: 0, total: 0 });
  };

  const resolvedCount = bulkResults.filter((r) => r.isResolved && r.confidenceScore > 90).length;
  const needsAttentionCount = bulkResults.filter((r) => NEEDS_EDIT(r)).length;

  // ─── Column definitions ───────────────────────────────────────
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
    { field: 'canonicalCustomerId', headerName: 'Canonical ID', width: 95,
      renderCell: (p) => p.value || '-' },
    { field: 'canonicalName', headerName: 'Canonical Customer Name', flex: 1.2, minWidth: 180,
      renderCell: (p) => p.value || <span style={{ color: '#64748b' }}>-</span> },
    { field: 'cisCode', headerName: 'CIS Code', width: 90, renderCell: (p) => p.value || '-' },
    { field: 'mgs', headerName: 'MGS', width: 120, renderCell: (p) => p.value || '-' },
    { field: 'ctryOfOp', headerName: 'Ctry Of Op', width: 110, renderCell: (p) => p.value || '-' },
    { field: 'region', headerName: 'Region', width: 110, renderCell: (p) => p.value || '-' },
    { field: 'isResolved', headerName: 'Status', width: 130,
      renderCell: (p) => <ConfidenceBadge score={p.row.confidenceScore} isResolved={p.value} /> },
    { field: 'confidenceScore', headerName: 'Confidence', width: 95,
      renderCell: (p) => p.value ? `${p.value}%` : '-' },
    {
      field: 'edit', headerName: '', width: 70, sortable: false,
      renderCell: (p) => {
        if (!NEEDS_EDIT(p.row)) return null;
        return (
          <Button size="small" variant="outlined" color="warning"
            sx={{ minWidth: 0, px: 1, py: 0.5 }}
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
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: 'text.primary' }}>
          Single Resolution
        </Typography>
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
                  <Button size="small" variant="outlined" color="warning"
                    startIcon={<Pencil size={14} />}
                    onClick={() => openEditDialog(
                      singleResult.customerName || singleName,
                      singleResult.commonName,
                      singleResult.canonicalCustomerId,
                      'single', null, {
                        canonicalCustomerName: singleResult.canonicalCustomerName,
                        cisCode: singleResult.cisCode,
                        mgs: singleResult.mgs,
                        countryOfOperation: singleResult.country,
                        region: singleResult.region,
                      }
                    )}>
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
          {activeStep > 0 && (
            <Button size="small" variant="outlined" color="secondary" onClick={handleReset}>Start Over</Button>
          )}
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
              <Button variant="outlined" component="label"
                startIcon={<FileUp size={16} />}
                sx={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>
                Upload File (CSV / TXT)
                <input
                  type="file"
                  accept=".csv,.txt,.text"
                  onChange={handleFileUpload}
                  onClick={(e) => { e.target.value = ''; }}
                  style={{
                    clip: 'rect(0 0 0 0)',
                    clipPath: 'inset(50%)',
                    height: 1,
                    overflow: 'hidden',
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    whiteSpace: 'nowrap',
                    width: 1,
                  }}
                />
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
                <Button size="small" variant="contained" color="success" disabled={pushingPg}
                  startIcon={pushingPg ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  onClick={handlePushToPostgres}>
                  {pushingPg ? 'Pushing...' : 'Push to Postgres'}
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
                  sx={{
                    bgcolor: 'background.paper',
                    '& .needs-edit-row': { bgcolor: 'rgba(234, 179, 8, 0.08)' },
                  }} />
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* Edit Mapping Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' } }}>
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <Pencil size={18} />
            <span>Edit Customer Alias Mapping</span>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
          <TextField label="Original Customer Name" fullWidth size="small"
            value={editForm.originalCustomerName}
            onChange={(e) => setEditForm({ ...editForm, originalCustomerName: e.target.value })}
            InputProps={{ readOnly: true }}
            sx={{ '& .MuiInputBase-input': { color: 'text.secondary' } }} />

          <TextField label="Cleaned Customer Name" fullWidth size="small"
            value={editForm.cleanedCustomerName}
            onChange={(e) => setEditForm({ ...editForm, cleanedCustomerName: e.target.value })}
            helperText="The normalized/cleaned version of the customer name" />

          <Autocomplete
            options={masterOptions}
            getOptionLabel={(opt) => typeof opt === 'string' ? opt : `${opt.canonicalCustomerId} - ${opt.canonicalCustomerName || ''}`}
            loading={masterLoading}
            onInputChange={(_, val) => loadMasters(val)}
            onChange={(_, val) => {
              if (val && typeof val !== 'string') {
                setEditForm({
                  ...editForm,
                  canonicalCustomerId: val.canonicalCustomerId.toString(),
                  cleanedCustomerName: editForm.cleanedCustomerName || val.canonicalCustomerName || '',
                  canonicalCustomerName: val.canonicalCustomerName || '',
                  cisCode: val.cisCode || '',
                  mgs: val.mgs || '',
                  countryOfOperation: val.countryOfOperation || '',
                  region: val.region || '',
                });
              }
            }}
            renderOption={(props, opt) => {
              const { key, ...rest } = props;
              return (
                <li key={key} {...rest}>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>{opt.canonicalCustomerId} - {opt.canonicalCustomerName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {opt.cisCode} | {opt.countryOfOperation} | {opt.mgs}
                    </Typography>
                  </Box>
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField {...params} label="Canonical Customer (search to link)" size="small"
                helperText={editForm.canonicalCustomerId ? `Selected ID: ${editForm.canonicalCustomerId}` : 'Search and select a canonical customer'} />
            )}
          />

          <TextField label="Canonical Customer ID" fullWidth size="small" type="number"
            value={editForm.canonicalCustomerId}
            onChange={(e) => setEditForm({ ...editForm, canonicalCustomerId: e.target.value })}
            helperText="Leave empty to auto-assign a new Canonical Customer ID" />

          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mt: 1 }}>
            Customer Master Details
          </Typography>

          <TextField label="Canonical Customer Name" fullWidth size="small"
            value={editForm.canonicalCustomerName}
            onChange={(e) => setEditForm({ ...editForm, canonicalCustomerName: e.target.value })} />

          <Stack direction="row" spacing={2}>
            <TextField label="CIS Code" fullWidth size="small"
              value={editForm.cisCode}
              onChange={(e) => setEditForm({ ...editForm, cisCode: e.target.value })} />
            <TextField label="MGS" fullWidth size="small"
              value={editForm.mgs}
              onChange={(e) => setEditForm({ ...editForm, mgs: e.target.value })} />
          </Stack>

          <Stack direction="row" spacing={2}>
            <TextField label="Ctry Of Op" fullWidth size="small"
              value={editForm.countryOfOperation}
              onChange={(e) => setEditForm({ ...editForm, countryOfOperation: e.target.value })} />
            <TextField label="Region" fullWidth size="small"
              value={editForm.region}
              onChange={(e) => setEditForm({ ...editForm, region: e.target.value })} />
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
