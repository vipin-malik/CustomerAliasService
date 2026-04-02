import { useState, useMemo, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams, RowClickedEvent } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
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
  Fade,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  CloudUpload,
  Description,
  Download,
} from '@mui/icons-material';
import { useMappings, useMappingMutations } from './hooks';
import type { CustomerMasterWithAliases, MappingFormState, EditMasterFormState, AliasMapping } from './types';
import styles from './MappingsPage.module.css';

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

  const masterGridRef = useRef<AgGridReact<CustomerMasterWithAliases>>(null);

  // Selected master for detail panel
  const [selectedMaster, setSelectedMaster] = useState<CustomerMasterWithAliases | null>(null);

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

  const openEdit = (master: CustomerMasterWithAliases) => {
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

  const totalAliases = masters.reduce((sum, m) => sum + (m.aliasMappings?.length || 0), 0);

  // Export to Excel (server-side CSV generation)
  const handleExport = useCallback(() => {
    const a = document.createElement('a');
    a.href = '/api/v1/export-mappings';
    a.download = 'customer-alias-mappings.csv';
    a.click();
  }, []);

  // AG Grid column defs for master table
  const masterColumnDefs = useMemo<ColDef<CustomerMasterWithAliases>[]>(
    () => [
      {
        field: 'canonicalCustomerId',
        headerName: 'ID',
        width: 80,
      },
      {
        field: 'canonicalCustomerName',
        headerName: 'Canonical Customer Name',
        flex: 1.5,
        minWidth: 220,
      },
      {
        field: 'cisCode',
        headerName: 'CIS Code',
        width: 110,
        cellRenderer: (params: ICellRendererParams<CustomerMasterWithAliases>) =>
          params.value || '-',
      },
      {
        field: 'countryOfOperation',
        headerName: 'Ctry Of Op',
        width: 110,
        cellRenderer: (params: ICellRendererParams<CustomerMasterWithAliases>) =>
          params.value || '-',
      },
      {
        field: 'mgs',
        headerName: 'MGS',
        width: 120,
        cellRenderer: (params: ICellRendererParams<CustomerMasterWithAliases>) =>
          params.value || '-',
      },
      {
        field: 'region',
        headerName: 'Region',
        width: 110,
        cellRenderer: (params: ICellRendererParams<CustomerMasterWithAliases>) =>
          params.value || '-',
      },
      {
        headerName: 'Aliases',
        width: 90,
        valueGetter: (params) => params.data?.aliasMappings?.length ?? 0,
        cellRenderer: (params: ICellRendererParams<CustomerMasterWithAliases>) => {
          const count = params.value ?? 0;
          return (
            <Chip
              label={count}
              size="small"
              color={count > 0 ? 'primary' : 'default'}
              variant="outlined"
            />
          );
        },
      },
      {
        headerName: '',
        width: 60,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<CustomerMasterWithAliases>) => {
          if (!params.data) return null;
          return (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                openEdit(params.data!);
              }}
              title="Edit customer"
              sx={{ color: 'text.secondary', '&:hover': { color: 'primary.300' } }}
            >
              <Edit sx={{ fontSize: 14 }} />
            </IconButton>
          );
        },
      },
    ],
    [],
  );

  // Alias detail column defs
  const aliasColumnDefs = useMemo<ColDef<AliasMapping>[]>(
    () => [
      {
        field: 'id',
        headerName: 'ID',
        width: 80,
      },
      {
        field: 'originalCustomerName',
        headerName: 'Original Customer Name',
        flex: 1.5,
        minWidth: 220,
        cellRenderer: (params: ICellRendererParams<AliasMapping>) => {
          if (!params.data) return null;
          return (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ height: '100%' }}>
              <Description sx={{ fontSize: 12, color: 'text.secondary' }} />
              <span>{params.value}</span>
            </Stack>
          );
        },
      },
      {
        field: 'cleanedCustomerName',
        headerName: 'Cleaned Customer Name',
        flex: 1.2,
        minWidth: 180,
        cellRenderer: (params: ICellRendererParams<AliasMapping>) =>
          params.value || '-',
      },
      {
        headerName: '',
        width: 60,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<AliasMapping>) => {
          if (!params.data) return null;
          return (
            <IconButton
              size="small"
              title="Delete alias"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedItem(params.data!);
                setDeleteDialogOpen(true);
              }}
              sx={{
                color: 'text.secondary',
                '&:hover': { color: 'error.main' },
              }}
            >
              <Delete sx={{ fontSize: 13 }} />
            </IconButton>
          );
        },
      },
    ],
    [],
  );

  const handleRowClicked = useCallback(
    (event: RowClickedEvent<CustomerMasterWithAliases>) => {
      if (!event.data) return;
      setSelectedMaster((prev) =>
        prev?.canonicalCustomerId === event.data!.canonicalCustomerId ? null : event.data!,
      );
    },
    [],
  );

  // Keep selected master in sync with data refreshes
  const currentSelectedMaster = useMemo(() => {
    if (!selectedMaster) return null;
    return masters.find((m) => m.canonicalCustomerId === selectedMaster.canonicalCustomerId) ?? null;
  }, [masters, selectedMaster]);

  const selectedAliases = currentSelectedMaster?.aliasMappings ?? [];

  const handlePageChange = useCallback(
    (event: { newPage: number; newPageSize: number }) => {
      if (event.newPageSize !== pageSize) {
        setPageSize(event.newPageSize);
        setPage(0);
      } else if (event.newPage !== page) {
        setPage(event.newPage);
      }
    },
    [page, pageSize, setPage, setPageSize],
  );

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

        {/* Master AG Grid */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={32} />
          </Box>
        ) : masters.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography color="text.secondary">No mappings found</Typography>
          </Box>
        ) : (
          <div className={styles.gridContainer}>
            <AgGridReact<CustomerMasterWithAliases>
              ref={masterGridRef}
              theme={darkTheme}
              rowData={masters}
              columnDefs={masterColumnDefs}
              pagination
              paginationPageSize={pageSize}
              paginationPageSizeSelector={[10, 25, 50]}
              suppressPaginationPanel={false}
              onRowClicked={handleRowClicked}
              getRowId={(params) => String(params.data.canonicalCustomerId)}
              rowSelection="single"
              suppressRowClickSelection
            />
          </div>
        )}
      </Paper>

      {/* Detail Panel: Aliases for Selected Master */}
      {currentSelectedMaster && (
        <Fade in>
          <Paper sx={{ p: 0 }}>
            <Box
              sx={{
                p: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                  Aliases for: {currentSelectedMaster.canonicalCustomerName}
                </Typography>
                <Chip
                  label={`ID: ${currentSelectedMaster.canonicalCustomerId}`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`${selectedAliases.length} alias${selectedAliases.length !== 1 ? 'es' : ''}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Stack>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Add sx={{ fontSize: 14 }} />}
                onClick={() => openCreate(currentSelectedMaster)}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Add Alias
              </Button>
            </Box>

            {selectedAliases.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No alias mappings for this customer
                </Typography>
              </Box>
            ) : (
              <div className={styles.detailGridContainer}>
                <AgGridReact<AliasMapping>
                  theme={darkTheme}
                  rowData={selectedAliases}
                  columnDefs={aliasColumnDefs}
                  domLayout="autoHeight"
                  getRowId={(params) => String(params.data.id)}
                />
              </div>
            )}
          </Paper>
        </Fade>
      )}

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
