import { useState, useRef, useCallback } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, RowClassRules, ICellRendererParams } from 'ag-grid-community';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  TextField,
  LinearProgress,
  Stack,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Fade,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import StorageIcon from '@mui/icons-material/Storage';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import { useNotification } from '@core/context';
import { useResolveAlias, useBulkResolve, useEditMapping } from './hooks';
import { ConfidenceBadge } from './components/ConfidenceBadge';
import { GET_INVESTORS, PUSH_TO_DB } from './graphql';
import type { LoadedCustomer, BulkResultRow, ResolveResponse, CustomerMasterOption } from './types';
import styles from './ResolvePage.module.css';

import { themeQuartz } from 'ag-grid-community';

const NEEDS_EDIT = (row: { isResolved: boolean; confidenceScore: number | null }) =>
  !row.isResolved || (row.confidenceScore != null && row.confidenceScore <= 90);

const STEPS = ['Load Customers', 'Preview & Select', 'Resolution Results'];

const darkTheme = themeQuartz.withParams({
  backgroundColor: '#1c1532',
  foregroundColor: '#e2e8f0',
  headerBackgroundColor: '#261e40',
  headerForegroundColor: '#94a3b8',
  borderColor: 'rgba(82, 69, 119, 0.3)',
  rowHoverColor: 'rgba(168, 85, 247, 0.08)',
  selectedRowBackgroundColor: 'rgba(168, 85, 247, 0.12)',
  accentColor: '#a855f7',
  chromeBackgroundColor: '#1c1532',
});

const ResolvePage = () => {
  const { showSuccess, showError } = useNotification();

  // ---- Single resolution ----
  const [singleName, setSingleName] = useState('');
  const { resolveOne, singleResult, singleLoading, setSingleResult } = useResolveAlias();

  // ---- Bulk state ----
  const [loadedCustomers, setLoadedCustomers] = useState<LoadedCustomer[]>([]);
  const [dbSearch, setDbSearch] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const previewGridRef = useRef<AgGridReact<LoadedCustomer>>(null);
  const resultsGridRef = useRef<AgGridReact<BulkResultRow>>(null);

  const { bulkResults, setBulkResults, bulkProgress, bulkLoading, handleBulkResolve, cancelBulkResolve } = useBulkResolve();

  // ---- Edit mapping ----
  const editMapping = useEditMapping({
    onSingleReResolved: (resolved) => setSingleResult(resolved),
    onBulkRowReResolved: (rowId, resolved) => {
      setBulkResults((prev) =>
        prev.map((r) =>
          r.id === rowId
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
            : r,
        ),
      );
    },
  });

  // ---- Load investors from DB ----
  const [loadInvestors, { loading: loadLoading }] = useLazyQuery(GET_INVESTORS, {
    onCompleted: (data) => {
      const customers: LoadedCustomer[] = (data.investors?.items || []).map(
        (inv: Record<string, unknown>, idx: number) => ({
          id: (inv.id as number) || idx + 1,
          name: (inv.name as string) || '',
          cisCode: (inv.cisCode as string) || '',
          tranche: (inv.tranche as string) || '',
          loanType: (inv.source as string) || '',
          seniority: (inv.seniority as string) || '',
          currency: (inv.currency as string) || '',
          country: (inv.country as string) || '',
          industry: (inv.industry as string) || '',
        }),
      );
      setLoadedCustomers(customers);
      setActiveStep(1);
      setBulkResults([]);
    },
    onError: () => setLoadedCustomers([]),
  });

  // ---- Push to DB mutation ----
  const [pushToDbMutation, { loading: pushing }] = useMutation(PUSH_TO_DB);

  // ---- Single resolve handler ----
  const handleSingleResolve = () => {
    if (!singleName.trim()) return;
    setSingleResult(null);
    resolveOne({ variables: { aliasName: singleName.trim(), assetClass: null } });
  };

  // ---- Load from DB ----
  const handleLoadFromDb = () => {
    loadInvestors({ variables: { page: 1, pageSize: 10000, search: dbSearch || null } });
  };

  // ---- Bulk text input ----
  const handleBulkTextInput = (text: string) => {
    const names = text
      .split(/[\n,;]+/)
      .map((n) => n.trim())
      .filter(Boolean);
    const customers: LoadedCustomer[] = names.map((name, idx) => ({
      id: idx + 1,
      name,
      cisCode: '-',
      tranche: '-',
      loanType: '-',
      seniority: '-',
      currency: '-',
      country: '-',
      industry: '-',
    }));
    setLoadedCustomers(customers);
    setActiveStep(1);
    setBulkResults([]);
  };

  // ---- File upload ----
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string | undefined;
      if (!text) return;
      let names: string[] = [];
      if (file.name.endsWith('.csv')) {
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length === 0) return;
        const cols = lines[0].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const nameColIdx = cols.findIndex((c) => {
          const cl = c.toLowerCase();
          return cl.includes('name') || cl.includes('customer') || cl.includes('obligor');
        });
        if (nameColIdx >= 0) {
          names = lines
            .slice(1)
            .map((line) => {
              const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
              return parts[nameColIdx] || '';
            })
            .filter(Boolean);
        } else {
          names = lines
            .slice(1)
            .map((line) => line.split(',')[0]?.trim().replace(/^"|"$/g, '') || '')
            .filter(Boolean);
        }
      } else {
        names = text
          .split(/[\n\r]+/)
          .map((n) => n.trim())
          .filter(Boolean);
      }
      if (names.length === 0) {
        showError('No customer names found in file');
        return;
      }
      const customers: LoadedCustomer[] = names.map((name, idx) => ({
        id: idx + 1,
        name,
        cisCode: '-',
        tranche: '-',
        loanType: '-',
        seniority: '-',
        currency: '-',
        country: '-',
        industry: '-',
      }));
      setLoadedCustomers(customers);
      setActiveStep(1);
      setBulkResults([]);
      showSuccess(`Loaded ${names.length} customer names from ${file.name}`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ---- Start bulk resolve via AG Grid selection ----
  const handleStartBulkResolve = () => {
    const selected = previewGridRef.current?.api?.getSelectedRows() || [];
    if (selected.length === 0) return;
    setActiveStep(2);
    handleBulkResolve(selected);
  };

  // ---- Export CSV ----
  const handleExportResults = () => {
    if (bulkResults.length === 0) return;
    const csv = [
      'Original Name,Cleaned Name,Canonical ID,Canonical Name,CIS Code,MGS,Ctry Of Op,Region,Resolved,Confidence,Matched Alias',
      ...bulkResults.map((r) =>
        [
          `"${r.originalName || ''}"`,
          `"${r.cleanedName || ''}"`,
          r.canonicalCustomerId || '',
          `"${r.canonicalName || ''}"`,
          `"${r.cisCode || ''}"`,
          `"${r.mgs || ''}"`,
          `"${r.ctryOfOp || ''}"`,
          `"${r.region || ''}"`,
          r.isResolved ? 'Yes' : 'No',
          r.confidenceScore || '',
          `"${r.matchedAlias || ''}"`,
        ].join(','),
      ),
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resolution-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Save to SQL Server ----
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
      showSuccess(
        `Saved to SQL Server: ${d.mappingsCreated} created, ${d.mappingsUpdated} updated, ${d.mastersCreated} masters created`,
      );
      if (d.errors?.length > 0) {
        d.errors.forEach((err: string) => showError(err));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Push failed';
      showError(message);
    }
  };

  // ---- Reset ----
  const handleReset = () => {
    setLoadedCustomers([]);
    setBulkResults([]);
    setActiveStep(0);
  };

  // ---- AG Grid: auto-select all rows after data loads ----
  const onPreviewGridReady = useCallback(() => {
    setTimeout(() => {
      previewGridRef.current?.api?.selectAll();
    }, 0);
  }, []);

  const selectedCount = previewGridRef.current?.api?.getSelectedRows().length ?? loadedCustomers.length;

  const resolvedCount = bulkResults.filter((r) => r.isResolved && r.confidenceScore !== null && r.confidenceScore > 90).length;
  const needsAttentionCount = bulkResults.filter((r) => NEEDS_EDIT(r)).length;
  const singleNeedsEdit = singleResult ? NEEDS_EDIT(singleResult) : false;

  // ---- AG Grid column defs ----
  const customerColumnDefs: ColDef<LoadedCustomer>[] = [
    { field: 'name', headerName: 'Customer Name', flex: 1.5, minWidth: 200, headerCheckboxSelection: true, checkboxSelection: true },
    { field: 'cisCode', headerName: 'CIS Code', width: 110 },
    { field: 'tranche', headerName: 'Tranche', width: 130 },
    { field: 'loanType', headerName: 'Loan Type', width: 100 },
    { field: 'seniority', headerName: 'Seniority', width: 120 },
    { field: 'currency', headerName: 'Currency', width: 90 },
    { field: 'country', headerName: 'Country', flex: 1, minWidth: 130 },
    { field: 'industry', headerName: 'Industry', flex: 1, minWidth: 140 },
  ];

  const resultColumnDefs: ColDef<BulkResultRow>[] = [
    { field: 'originalName', headerName: 'Original Customer Name', flex: 1.5, minWidth: 220 },
    {
      field: 'cleanedName',
      headerName: 'Cleaned Customer Name',
      flex: 1.2,
      minWidth: 180,
      cellRenderer: (params: ICellRendererParams<BulkResultRow>) =>
        params.value || '-',
    },
    {
      field: 'canonicalCustomerId',
      headerName: 'Canonical ID',
      width: 95,
      cellRenderer: (params: ICellRendererParams<BulkResultRow>) =>
        params.value || '-',
    },
    {
      field: 'canonicalName',
      headerName: 'Canonical Customer Name',
      flex: 1.2,
      minWidth: 180,
      cellRenderer: (params: ICellRendererParams<BulkResultRow>) =>
        params.value || '-',
    },
    {
      field: 'cisCode',
      headerName: 'CIS Code',
      width: 90,
      cellRenderer: (params: ICellRendererParams<BulkResultRow>) =>
        params.value || '-',
    },
    {
      field: 'mgs',
      headerName: 'MGS',
      width: 120,
      cellRenderer: (params: ICellRendererParams<BulkResultRow>) =>
        params.value || '-',
    },
    {
      field: 'ctryOfOp',
      headerName: 'Ctry Of Op',
      width: 110,
      cellRenderer: (params: ICellRendererParams<BulkResultRow>) =>
        params.value || '-',
    },
    {
      field: 'region',
      headerName: 'Region',
      width: 110,
      cellRenderer: (params: ICellRendererParams<BulkResultRow>) =>
        params.value || '-',
    },
    {
      field: 'isResolved',
      headerName: 'Status',
      width: 130,
      cellRenderer: (params: ICellRendererParams<BulkResultRow>) => {
        if (!params.data) return null;
        return <ConfidenceBadge score={params.data.confidenceScore} isResolved={params.data.isResolved} />;
      },
    },
    {
      field: 'confidenceScore',
      headerName: 'Confidence',
      width: 95,
      cellRenderer: (params: ICellRendererParams<BulkResultRow>) =>
        params.value ? `${params.value}%` : '-',
    },
    {
      headerName: '',
      width: 70,
      sortable: false,
      cellRenderer: (params: ICellRendererParams<BulkResultRow>) => {
        if (!params.data || !NEEDS_EDIT(params.data)) return null;
        const row = params.data;
        return (
          <Button
            size="small"
            variant="outlined"
            color="warning"
            sx={{ minWidth: 0, px: 1, py: 0.5 }}
            onClick={() =>
              editMapping.openEditDialog(row.originalName, row.cleanedName, row.canonicalCustomerId, 'bulk', row, {
                canonicalCustomerName: row.canonicalName || undefined,
                cisCode: row.cisCode || undefined,
                mgs: row.mgs || undefined,
                countryOfOperation: row.ctryOfOp || undefined,
                region: row.region || undefined,
              })
            }
          >
            <EditIcon fontSize="small" />
          </Button>
        );
      },
    },
  ];

  const resultRowClassRules: RowClassRules<BulkResultRow> = {
    'needs-edit-row': (params) => (params.data ? NEEDS_EDIT(params.data) : false),
  };

  return (
    <div className={styles.page}>
      {/* Page header */}
      <Fade in timeout={400}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Resolve Customer Names
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Map original customer names to cleaned and canonical names
          </Typography>
        </Box>
      </Fade>

      {/* ── Single Resolution ── */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: 'text.primary' }}>
          Single Resolution
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            size="small"
            fullWidth
            label="Enter customer name or alias"
            value={singleName}
            onChange={(e) => setSingleName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSingleResolve()}
          />
          <Button
            variant="contained"
            onClick={handleSingleResolve}
            disabled={singleLoading || !singleName.trim()}
            startIcon={singleLoading ? <CircularProgress size={16} /> : <SearchIcon />}
            sx={{ whiteSpace: 'nowrap', minWidth: 120 }}
          >
            Resolve
          </Button>
        </Stack>

        {singleResult && (
          <Fade in timeout={300}>
            <Box
              sx={{
                mt: 2,
                p: 2,
                bgcolor: 'background.default',
                borderRadius: 2,
                border: '1px solid',
                borderColor: singleNeedsEdit ? 'warning.main' : 'divider',
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                {singleResult.isResolved ? (
                  <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                ) : (
                  <WarningIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                )}
                <Typography fontWeight={600} color="text.primary">
                  {singleResult.isResolved ? 'Resolved' : 'Not Resolved'}
                </Typography>
                <ConfidenceBadge score={singleResult.confidenceScore} isResolved={singleResult.isResolved} />
                {singleNeedsEdit && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    startIcon={<EditIcon fontSize="small" />}
                    onClick={() =>
                      editMapping.openEditDialog(
                        singleResult.customerName || singleName,
                        singleResult.commonName,
                        singleResult.canonicalCustomerId,
                        'single',
                        null,
                        {
                          canonicalCustomerName: singleResult.canonicalCustomerName || undefined,
                          cisCode: singleResult.cisCode || undefined,
                          mgs: singleResult.mgs || undefined,
                          countryOfOperation: singleResult.country || undefined,
                          region: singleResult.region || undefined,
                        },
                      )
                    }
                  >
                    Edit Mapping
                  </Button>
                )}
              </Stack>

              {singleResult.isResolved && (
                <Box className={styles.detailsGrid}>
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
                <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
                  {singleResult.error}
                </Typography>
              )}

              {singleResult.potentialMatches && singleResult.potentialMatches.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                    Potential Matches:
                  </Typography>
                  {singleResult.potentialMatches.map((pm, i) => (
                    <Stack key={i} direction="row" spacing={2} sx={{ mt: 0.5 }}>
                      <Typography variant="body2" color="text.primary">{pm.commonName}</Typography>
                      <Typography variant="body2" color="text.secondary">via {pm.matchedAlias}</Typography>
                      <ConfidenceBadge score={pm.confidenceScore} isResolved />
                    </Stack>
                  ))}
                </Box>
              )}
            </Box>
          </Fade>
        )}
      </Paper>

      {/* ── Bulk Resolution ── */}
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} color="text.primary">
            Bulk Resolution
          </Typography>
          {activeStep > 0 && (
            <Button size="small" variant="outlined" color="secondary" onClick={handleReset}>
              Start Over
            </Button>
          )}
        </Stack>

        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 0: Load Customers */}
        {activeStep === 0 && (
          <Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
              <TextField
                size="small"
                fullWidth
                label="Filter by customer name"
                value={dbSearch}
                onChange={(e) => setDbSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoadFromDb()}
              />
              <Button
                variant="contained"
                onClick={handleLoadFromDb}
                disabled={loadLoading}
                startIcon={loadLoading ? <CircularProgress size={16} /> : <StorageIcon />}
                sx={{ whiteSpace: 'nowrap', minWidth: 200 }}
              >
                Load from Database
              </Button>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadFileIcon />}
                sx={{ whiteSpace: 'nowrap', cursor: 'pointer' }}
              >
                Upload File (CSV / TXT)
                <input
                  type="file"
                  accept=".csv,.txt,.text"
                  onChange={handleFileUpload}
                  onClick={(e) => {
                    (e.target as HTMLInputElement).value = '';
                  }}
                  className={styles.hiddenInput}
                />
              </Button>
              <Button
                variant="outlined"
                onClick={() => setShowBulkInput(!showBulkInput)}
                startIcon={showBulkInput ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Paste Names
              </Button>
            </Stack>
            {showBulkInput && (
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={5}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                  placeholder="Paste customer names (one per line, or comma/semicolon separated)..."
                />
                <Box>
                  <Button
                    variant="contained"
                    size="small"
                    disabled={!bulkText.trim()}
                    onClick={() => handleBulkTextInput(bulkText)}
                  >
                    Load Names
                  </Button>
                </Box>
              </Stack>
            )}
          </Box>
        )}

        {/* Step 1: Preview & Select */}
        {activeStep === 1 && loadedCustomers.length > 0 && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Chip
                  label={`${loadedCustomers.length.toLocaleString()} customers loaded`}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
                <Chip
                  label={`${selectedCount.toLocaleString()} selected`}
                  color={selectedCount > 0 ? 'success' : 'default'}
                  variant="outlined"
                  size="small"
                />
              </Stack>
              <Button
                variant="contained"
                onClick={handleStartBulkResolve}
                disabled={bulkLoading || selectedCount === 0}
                startIcon={bulkLoading ? <CircularProgress size={16} /> : <PlayArrowIcon />}
              >
                Resolve {selectedCount.toLocaleString()} Selected
              </Button>
            </Stack>
            <div className={styles.gridContainer}>
              <AgGridReact<LoadedCustomer>
                ref={previewGridRef}
                theme={darkTheme}
                rowData={loadedCustomers}
                columnDefs={customerColumnDefs}
                rowSelection="multiple"
                pagination
                paginationPageSize={25}
                onFirstDataRendered={onPreviewGridReady}
                suppressRowClickSelection
              />
            </div>
          </Box>
        )}

        {/* Step 2: Resolution Results */}
        {activeStep === 2 && (
          <Box>
            {bulkLoading && (
              <Box sx={{ mb: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {bulkProgress.phase || 'Resolving...'}
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      {bulkProgress.current.toLocaleString()} / {bulkProgress.total.toLocaleString()}
                      {' '}({bulkProgress.total > 0 ? Math.round((bulkProgress.current / bulkProgress.total) * 100) : 0}%)
                    </Typography>
                    <Button size="small" variant="outlined" color="error" onClick={cancelBulkResolve}>
                      Cancel
                    </Button>
                  </Stack>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={bulkProgress.total ? (bulkProgress.current / bulkProgress.total) * 100 : 0}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            )}

            {bulkResults.length > 0 && !bulkLoading && (
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ mb: 2 }}>
                <Chip
                  label={`${bulkResults.length.toLocaleString()} total`}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
                <Chip
                  icon={<CheckCircleIcon fontSize="small" />}
                  label={`${resolvedCount.toLocaleString()} resolved (>90%)`}
                  color="success"
                  variant="outlined"
                  size="small"
                />
                <Chip
                  icon={<EditIcon fontSize="small" />}
                  label={`${needsAttentionCount.toLocaleString()} needs attention`}
                  color="warning"
                  variant="outlined"
                  size="small"
                />
                <Box sx={{ flexGrow: 1 }} />
                <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportResults}>
                  Export CSV
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  disabled={pushing}
                  startIcon={pushing ? <CircularProgress size={14} /> : <SaveIcon />}
                  onClick={handleSaveToSqlServer}
                >
                  {pushing ? 'Saving...' : 'Save to SQL Server'}
                </Button>
              </Stack>
            )}

            {bulkResults.length > 0 && (
              <div className={styles.gridContainer}>
                <AgGridReact<BulkResultRow>
                  ref={resultsGridRef}
                  theme={darkTheme}
                  rowData={bulkResults}
                  columnDefs={resultColumnDefs}
                  pagination
                  paginationPageSize={25}
                  rowClassRules={resultRowClassRules}
                />
              </div>
            )}
          </Box>
        )}
      </Paper>

      {/* ── Edit Mapping Dialog ── */}
      <Dialog
        open={editMapping.editOpen}
        onClose={() => editMapping.setEditOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' } }}
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <EditIcon fontSize="small" />
            <span>Edit Customer Alias Mapping</span>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
          <TextField
            label="Original Customer Name"
            fullWidth
            size="small"
            disabled
            value={editMapping.editForm.originalCustomerName}
          />
          <TextField
            label="Cleaned Customer Name"
            fullWidth
            size="small"
            disabled
            value={editMapping.editForm.cleanedCustomerName}
            helperText="The normalized/cleaned version of the customer name"
          />
          <Autocomplete<CustomerMasterOption, false, false, true>
            freeSolo
            options={editMapping.masterOptions}
            getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.canonicalCustomerName || '')}
            inputValue={editMapping.editForm.canonicalCustomerName}
            loading={editMapping.masterLoading}
            onInputChange={(_, val, reason) => {
              if (reason === 'input') {
                editMapping.setEditForm({ ...editMapping.editForm, canonicalCustomerName: val, canonicalCustomerId: '' });
                editMapping.loadMasters(val);
              }
            }}
            onChange={(_, val) => {
              if (val && typeof val !== 'string') {
                editMapping.setEditForm({
                  ...editMapping.editForm,
                  canonicalCustomerId: val.canonicalCustomerId.toString(),
                  canonicalCustomerName: val.canonicalCustomerName || '',
                  cisCode: val.cisCode || '',
                  mgs: val.mgs || '',
                  countryOfOperation: val.countryOfOperation || '',
                  region: val.region || '',
                });
              } else if (typeof val === 'string') {
                editMapping.setEditForm({ ...editMapping.editForm, canonicalCustomerName: val, canonicalCustomerId: '' });
              }
            }}
            filterOptions={(options, state) => {
              const filtered = options.filter((o) =>
                o.canonicalCustomerName?.toLowerCase().includes(state.inputValue.toLowerCase()),
              );
              if (
                state.inputValue &&
                !filtered.some((o) => o.canonicalCustomerName?.toLowerCase() === state.inputValue.toLowerCase())
              ) {
                filtered.push({
                  isNew: true,
                  canonicalCustomerName: state.inputValue,
                  canonicalCustomerId: 0,
                  cisCode: null,
                  countryOfOperation: null,
                  mgs: null,
                  region: null,
                });
              }
              return filtered;
            }}
            renderOption={(props, opt) => {
              const { key, ...rest } = props;
              if (opt.isNew) {
                return (
                  <li key="new" {...rest}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'success.main' }}>
                      <AddIcon fontSize="small" />
                      <Typography variant="body2" fontWeight={500}>
                        Add &quot;{opt.canonicalCustomerName}&quot; as new customer
                      </Typography>
                    </Stack>
                  </li>
                );
              }
              return (
                <li key={key} {...rest}>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {opt.canonicalCustomerName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {opt.canonicalCustomerId} | {opt.cisCode || '-'} | {opt.countryOfOperation || '-'} |{' '}
                      {opt.mgs || '-'}
                    </Typography>
                  </Box>
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Canonical Customer Name"
                size="small"
                helperText={
                  editMapping.editForm.canonicalCustomerId
                    ? `Linked to existing customer (ID: ${editMapping.editForm.canonicalCustomerId})`
                    : editMapping.editForm.canonicalCustomerName
                      ? 'New customer will be created'
                      : 'Type to search or add new'
                }
              />
            )}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="CIS Code"
              fullWidth
              size="small"
              value={editMapping.editForm.cisCode}
              onChange={(e) => editMapping.setEditForm({ ...editMapping.editForm, cisCode: e.target.value })}
            />
            <TextField
              label="MGS"
              fullWidth
              size="small"
              value={editMapping.editForm.mgs}
              onChange={(e) => editMapping.setEditForm({ ...editMapping.editForm, mgs: e.target.value })}
            />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Ctry Of Op"
              fullWidth
              size="small"
              value={editMapping.editForm.countryOfOperation}
              onChange={(e) => editMapping.setEditForm({ ...editMapping.editForm, countryOfOperation: e.target.value })}
            />
            <TextField
              label="Region"
              fullWidth
              size="small"
              value={editMapping.editForm.region}
              onChange={(e) => editMapping.setEditForm({ ...editMapping.editForm, region: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => editMapping.setEditOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={() => editMapping.setConfirmSaveOpen(true)}
            variant="contained"
            color="warning"
            disabled={editMapping.editSaving || !editMapping.editForm.originalCustomerName.trim()}
            startIcon={<SaveIcon />}
          >
            Save Mapping
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirm Save Dialog ── */}
      <Dialog
        open={editMapping.confirmSaveOpen}
        onClose={() => editMapping.setConfirmSaveOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' } }}
      >
        <DialogTitle>Confirm Save</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Save alias mapping for <strong>&quot;{editMapping.editForm.originalCustomerName}&quot;</strong>
            {editMapping.editForm.canonicalCustomerName && (
              <>
                {' '}
                to <strong>&quot;{editMapping.editForm.canonicalCustomerName}&quot;</strong>
              </>
            )}
            ?
          </Typography>
          {!editMapping.editForm.canonicalCustomerId && editMapping.editForm.canonicalCustomerName && (
            <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
              A new canonical customer will be created.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => editMapping.setConfirmSaveOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={() => {
              editMapping.setConfirmSaveOpen(false);
              editMapping.handleSaveMapping();
            }}
            variant="contained"
            disabled={editMapping.editSaving}
            startIcon={editMapping.editSaving ? <CircularProgress size={16} /> : <SaveIcon />}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ResolvePage;
