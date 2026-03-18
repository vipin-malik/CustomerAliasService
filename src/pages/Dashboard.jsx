import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Database, Users, Globe, ArrowRight, Search,
  TrendingUp, FileText, Layers, MapPin,
} from 'lucide-react';
import { Box, Paper, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import StatsCard from '../components/StatsCard';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalMappings: 0, totalMasters: 0,
    countries: 0, regions: 0, mgsCount: 0,
  });
  const [recentMappings, setRecentMappings] = useState([]);
  const [topCountries, setTopCountries] = useState([]);
  const [topMgs, setTopMgs] = useState([]);
  const [topRegions, setTopRegions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboardData(); }, []);

  const loadDashboardData = async () => {
    try {
      const [mapRes, masterRes] = await Promise.all([
        fetch('/api/v1/customer-alias-mappings?page=1&pageSize=100').then((r) => r.json()),
        fetch('/api/v1/customer-masters?page=1&pageSize=100').then((r) => r.json()),
      ]);

      const mappings = mapRes.items || [];
      const masters = masterRes.items || [];

      // Stats from CustomerMaster
      const countries = new Set(masters.map((m) => m.countryOfOperation).filter(Boolean));
      const regions = new Set(masters.map((m) => m.region).filter(Boolean));
      const mgsSet = new Set(masters.map((m) => m.mgs).filter(Boolean));

      setStats({
        totalMappings: mapRes.totalCount || mappings.length,
        totalMasters: masterRes.totalCount || masters.length,
        countries: countries.size,
        regions: regions.size,
        mgsCount: mgsSet.size,
      });

      // Recent mappings (first 10)
      setRecentMappings(mappings.slice(0, 10).map((m) => ({
        id: m.id,
        originalCustomerName: m.originalCustomerName,
        cleanedCustomerName: m.cleanedCustomerName || '-',
        canonicalCustomerName: m.customerMaster?.canonicalCustomerName || '-',
        cisCode: m.customerMaster?.cisCode || '-',
        ctryOfOp: m.customerMaster?.countryOfOperation || '-',
        mgs: m.customerMaster?.mgs || '-',
      })));

      // Top countries (from CustomerMaster.countryOfOperation)
      const countryMap = {};
      masters.forEach((m) => {
        if (m.countryOfOperation) countryMap[m.countryOfOperation] = (countryMap[m.countryOfOperation] || 0) + 1;
      });
      setTopCountries(Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count })));

      // Top MGS (from CustomerMaster.mgs)
      const mgsMap = {};
      masters.forEach((m) => {
        if (m.mgs) mgsMap[m.mgs] = (mgsMap[m.mgs] || 0) + 1;
      });
      setTopMgs(Object.entries(mgsMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count })));

      // Top regions (from CustomerMaster.region)
      const regionMap = {};
      masters.forEach((m) => {
        if (m.region) regionMap[m.region] = (regionMap[m.region] || 0) + 1;
      });
      setTopRegions(Object.entries(regionMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count })));

    } catch { /* API not available */ }
    finally { setLoading(false); }
  };

  const mappingColumns = [
    { field: 'originalCustomerName', headerName: 'Original Customer Name', flex: 1.5, minWidth: 220 },
    { field: 'cleanedCustomerName', headerName: 'Cleaned Customer Name', flex: 1.3, minWidth: 200 },
    { field: 'canonicalCustomerName', headerName: 'Canonical Customer Name', flex: 1.3, minWidth: 200 },
    { field: 'cisCode', headerName: 'CIS Code', width: 100 },
    { field: 'ctryOfOp', headerName: 'Ctry Of Op', width: 130 },
    { field: 'mgs', headerName: 'MGS', width: 150 },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-gray-100">Dashboard</h2>
        <p className="text-gray-400 mt-1">Overview of CustomerAliasMapping and CustomerMaster data</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatsCard title="Alias Mappings" value={loading ? '...' : stats.totalMappings.toLocaleString()} icon={FileText} color="primary" subtitle="CustomerAliasMapping" />
        <StatsCard title="Canonical Masters" value={loading ? '...' : stats.totalMasters.toLocaleString()} icon={Layers} color="green" subtitle="CustomerMaster" />
        <StatsCard title="Countries" value={loading ? '...' : stats.countries.toLocaleString()} icon={Globe} color="yellow" subtitle="Ctry Of Op" />
        <StatsCard title="Regions" value={loading ? '...' : stats.regions.toLocaleString()} icon={MapPin} color="purple" subtitle="Distinct regions" />
        <StatsCard title="MGS Sectors" value={loading ? '...' : stats.mgsCount.toLocaleString()} icon={TrendingUp} color="primary" subtitle="Market group sectors" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/resolve" className="bg-surface-800 rounded-lg border border-surface-500/30 p-6 flex items-center justify-between group hover:border-primary-500/40 transition-all">
          <div>
            <h3 className="font-semibold text-gray-100">Resolve Customer Names</h3>
            <p className="text-sm text-gray-400 mt-1">Map original names to cleaned &amp; canonical names via CustomerAliasMapping</p>
          </div>
          <div className="flex items-center gap-2 text-primary-400 group-hover:translate-x-1 transition-transform">
            <Search size={20} /><ArrowRight size={18} />
          </div>
        </Link>
        <Link to="/mappings" className="bg-surface-800 rounded-lg border border-surface-500/30 p-6 flex items-center justify-between group hover:border-primary-500/40 transition-all">
          <div>
            <h3 className="font-semibold text-gray-100">Manage Mappings</h3>
            <p className="text-sm text-gray-400 mt-1">View and edit CustomerAliasMapping &amp; CustomerMaster tables</p>
          </div>
          <div className="flex items-center gap-2 text-primary-400 group-hover:translate-x-1 transition-transform">
            <Database size={20} /><ArrowRight size={18} />
          </div>
        </Link>
      </div>

      {/* Charts: Top Countries, MGS, Regions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Paper sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} color="text.primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Globe size={16} /> Ctry Of Op
          </Typography>
          <div className="space-y-2">
            {topCountries.map((c) => (
              <div key={c.name} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{c.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-surface-600 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(c.count / (topCountries[0]?.count || 1)) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-4 text-right">{c.count}</span>
                </div>
              </div>
            ))}
            {topCountries.length === 0 && !loading && <span className="text-sm text-gray-500">No data</span>}
          </div>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} color="text.primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp size={16} /> MGS
          </Typography>
          <div className="space-y-2">
            {topMgs.map((m) => (
              <div key={m.name} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{m.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-surface-600 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-500 rounded-full" style={{ width: `${(m.count / (topMgs[0]?.count || 1)) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-4 text-right">{m.count}</span>
                </div>
              </div>
            ))}
            {topMgs.length === 0 && !loading && <span className="text-sm text-gray-500">No data</span>}
          </div>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} color="text.primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <MapPin size={16} /> Region
          </Typography>
          <div className="space-y-2">
            {topRegions.map((r) => (
              <div key={r.name} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{r.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-surface-600 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${(r.count / (topRegions[0]?.count || 1)) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-4 text-right">{r.count}</span>
                </div>
              </div>
            ))}
            {topRegions.length === 0 && !loading && <span className="text-sm text-gray-500">No data</span>}
          </div>
        </Paper>
      </div>

      {/* Recent Mappings */}
      <Paper sx={{ p: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={600} color="text.primary">Recent Customer Alias Mappings</Typography>
          <Link to="/mappings" className="text-sm text-primary-400 hover:text-primary-300 font-medium">View all</Link>
        </Box>
        <Box sx={{ height: 380 }}>
          <DataGrid rows={recentMappings} columns={mappingColumns} loading={loading}
            pageSizeOptions={[10]} density="compact" disableRowSelectionOnClick hideFooter
            sx={{ bgcolor: 'background.paper' }} />
        </Box>
      </Paper>
    </div>
  );
};

export default Dashboard;
