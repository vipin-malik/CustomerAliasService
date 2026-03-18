import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Download } from 'lucide-react';
import { Box, Paper, TextField, Button, Stack, Chip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { getCustomers } from '../services/customerApiClient';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCustomers({
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        search: search || undefined,
      });
      setCustomers((result.items || []).map((c, idx) => ({ ...c, id: c.id || idx + 1 })));
      setTotalCount(result.totalCount || 0);
    } catch {
      setCustomers([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [search, paginationModel]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const handleExport = () => {
    if (customers.length === 0) return;
    const headers = ['name', 'cisCode', 'tranche', 'source', 'seniority', 'currency', 'country', 'industry', 'createdAt'];
    const csv = [
      headers.join(','),
      ...customers.map((row) =>
        headers.map((h) => {
          const val = row[h] ?? '';
          return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
        }).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    { field: 'name', headerName: 'Customer Name', flex: 1.5, minWidth: 200 },
    { field: 'cisCode', headerName: 'CIS Code', width: 110 },
    { field: 'tranche', headerName: 'Tranche', width: 130 },
    { field: 'source', headerName: 'Loan Type', width: 100 },
    { field: 'seniority', headerName: 'Seniority', width: 120 },
    { field: 'currency', headerName: 'Currency', width: 90 },
    { field: 'country', headerName: 'Country', flex: 1, minWidth: 130 },
    { field: 'industry', headerName: 'Industry', flex: 1, minWidth: 140 },
    {
      field: 'createdAt', headerName: 'As of Date', width: 120,
      renderCell: (params) => params.value ? new Date(params.value).toLocaleDateString() : '-',
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Customers</h2>
          <p className="text-gray-400 mt-1">Customer data loaded from PostgreSQL</p>
        </div>
        <Stack direction="row" spacing={1}>
          <Chip label={`${totalCount.toLocaleString()} total`} color="primary" variant="outlined" size="small" />
          <Button size="small" variant="outlined" startIcon={<RefreshCw size={14} />} onClick={loadCustomers}>Refresh</Button>
          <Button size="small" variant="outlined" startIcon={<Download size={14} />} onClick={handleExport}>Export</Button>
        </Stack>
      </motion.div>

      <Paper sx={{ p: 0 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField size="small" fullWidth label="Search by customer name" value={search} onChange={(e) => setSearch(e.target.value)} />
        </Box>
        <Box sx={{ height: 600 }}>
          <DataGrid rows={customers} columns={columns} rowCount={totalCount} loading={loading}
            paginationMode="server" paginationModel={paginationModel} onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 25, 50, 100]} density="compact" disableRowSelectionOnClick
            sx={{ bgcolor: 'background.paper', '& .MuiDataGrid-virtualScroller': { minHeight: 200 } }} />
        </Box>
      </Paper>
    </div>
  );
};

export default Customers;
