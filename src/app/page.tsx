'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ComputerDesktopIcon, 
  SignalIcon, 
  ShieldCheckIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { getSophosEndpointData, type SophosEndpoint } from '@/lib/sophos-api';
import { invoke } from '@tauri-apps/api/core';

interface Endpoint {
  id: string;
  hostname: string;
  os: {
    name: string;
    version?: string;
  };
  type: string;
  online: boolean;
  health: {
    overall: string;
  };
  group: {
    name: string;
  };
  ipAddresses: string[];
  lastSeen?: string;
}

interface DashboardStats {
  totalEndpoints: number;
  onlineEndpoints: number;
  offlineEndpoints: number;
  healthyEndpoints: number;
  warningEndpoints: number;
  criticalEndpoints: number;
  osCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  groupCounts: Record<string, number>;
}

export default function SophosDashboard() {
  const router = useRouter();
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [healthFilter, setHealthFilter] = useState<'all' | 'good' | 'warning' | 'critical'>('all');
  const [osFilter, setOsFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<'api' | 'mock'>('mock');
  const [isClearing, setIsClearing] = useState(false);



  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading endpoint data...');
      
      // Get data using the Sophos API utility
      // In production, you would pass actual credentials:
      // const credentials = {
      //   clientId: process.env.NEXT_PUBLIC_SOPHOS_CLIENT_ID!,
      //   clientSecret: process.env.NEXT_PUBLIC_SOPHOS_CLIENT_SECRET!,
      //   tenantId: process.env.NEXT_PUBLIC_SOPHOS_TENANT_ID!
      // };
      
      const result = await getSophosEndpointData();
      
      if (result.success) {
        // Deduplicate endpoints by ID to avoid React key conflicts
        const uniqueEndpoints = result.data.reduce((acc, endpoint) => {
          const existing = acc.find(e => e.id === endpoint.id);
          if (!existing) {
            acc.push(endpoint);
          } else {
            console.warn(`Duplicate endpoint found: ${endpoint.id} (${endpoint.hostname})`);
          }
          return acc;
        }, [] as typeof result.data);

        setEndpoints(uniqueEndpoints);
        setLastUpdated(new Date());
        setDataSource(result.source);
        console.log(`Loaded ${uniqueEndpoints.length} unique endpoints from ${result.source} (${result.data.length - uniqueEndpoints.length} duplicates removed)`);
        
        // Debug: Check IP addresses
        console.log('Sample endpoint IP data:', uniqueEndpoints.slice(0, 3).map(ep => ({
          hostname: ep.hostname,
          ipAddresses: ep.ipAddresses,
          ipType: typeof ep.ipAddresses,
          ipLength: ep.ipAddresses?.length
        })));
        
        // Calculate stats from the loaded endpoints
        const loadedEndpoints = result.data;
        const totalEndpoints = loadedEndpoints.length;
        const onlineEndpoints = loadedEndpoints.filter((e: Endpoint) => e.online).length;
        const offlineEndpoints = totalEndpoints - onlineEndpoints;
        
        const healthCounts = loadedEndpoints.reduce((acc: { healthy: number; warning: number; critical: number }, endpoint: Endpoint) => {
          const health = endpoint.health.overall;
          if (health === 'good') acc.healthy++;
          else if (health === 'warning') acc.warning++;
          else if (health === 'critical') acc.critical++;
          return acc;
        }, { healthy: 0, warning: 0, critical: 0 });

        const osCounts = loadedEndpoints.reduce((acc: Record<string, number>, endpoint: Endpoint) => {
          const osName = endpoint.os.name;
          acc[osName] = (acc[osName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const typeCounts = loadedEndpoints.reduce((acc: Record<string, number>, endpoint: Endpoint) => {
          acc[endpoint.type] = (acc[endpoint.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const groupCounts = loadedEndpoints.reduce((acc: Record<string, number>, endpoint: Endpoint) => {
          const groupName = endpoint.group.name;
          acc[groupName] = (acc[groupName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        setStats({
          totalEndpoints,
          onlineEndpoints,
          offlineEndpoints,
          healthyEndpoints: healthCounts.healthy,
          warningEndpoints: healthCounts.warning,
          criticalEndpoints: healthCounts.critical,
          osCounts,
          typeCounts,
          groupCounts
        });
      } else {
        throw new Error(result.error || 'Failed to load endpoint data');
      }
        
      } catch (err) {
        setError('Failed to fetch endpoint data');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

  const clearCache = async () => {
    try {
      setIsClearing(true);
      await invoke<string>('clear_cache');
      console.log('Cache cleared successfully');
      // Optionally refresh data after clearing cache
      await fetchData();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setIsClearing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredEndpoints = endpoints.filter(endpoint => {
    const matchesSearch = endpoint.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         endpoint.os.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         endpoint.group.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'online' && endpoint.online) ||
                         (statusFilter === 'offline' && !endpoint.online);
    
    const matchesHealth = healthFilter === 'all' || endpoint.health.overall === healthFilter;
    
    const matchesOs = osFilter === 'all' || endpoint.os.name === osFilter;
    
    const matchesType = typeFilter === 'all' || endpoint.type === typeFilter;
    
    const matchesGroup = groupFilter === 'all' || endpoint.group.name === groupFilter;
    
    return matchesSearch && matchesStatus && matchesHealth && matchesOs && matchesType && matchesGroup;
  });

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'good':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (online: boolean) => {
    return online ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Online
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Offline
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Sophos dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">ShoreAgents Sophos Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                <div>Last updated: {lastUpdated ? lastUpdated.toLocaleString() : 'Never'}</div>
                <div className="flex items-center mt-1">
                  <span className="mr-2">Data source:</span>
                  {dataSource === 'api' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Sophos API
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Mock Data
                    </span>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ComputerDesktopIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Endpoints</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats?.totalEndpoints || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <SignalIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Online</dt>
                    <dd className="text-lg font-medium text-green-600">{stats?.onlineEndpoints || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircleIcon className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Offline</dt>
                    <dd className="text-lg font-medium text-red-600">{stats?.offlineEndpoints || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Warnings</dt>
                    <dd className="text-lg font-medium text-yellow-600">{stats?.warningEndpoints || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Data Management */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Data Management</h3>
                <p className="text-sm text-gray-500">Refresh data or manage cache</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-6 rounded-md text-sm font-medium transition-colors flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    'Refresh Data'
                  )}
                </button>
                <button
                  onClick={clearCache}
                  disabled={isClearing || loading}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-2 px-6 rounded-md text-sm font-medium transition-colors flex items-center"
                >
                  {isClearing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Clearing...
                    </>
                  ) : (
                    'Clear Cache'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Groups */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Groups</h3>
            <div className="max-h-64 overflow-y-auto space-y-1 pr-2">
              {/* All Groups at the top */}
              <div
                className={`flex justify-between items-center group px-2 py-1 rounded ${
                  groupFilter === 'all' ? 'bg-[#F4FBE8]' : ''
                }`}
              >
                <button
                  onClick={() => setGroupFilter('all')}
                  className={`text-sm truncate mr-2 transition-colors text-left ${
                    groupFilter === 'all'
                      ? 'text-[#5A7A08] font-medium'
                      : 'text-gray-600 hover:text-[#7EAC0B]'
                  }`}
                  style={{ textDecoration: 'none' }}
                >
                  All Groups
                </button>
                <span className="text-sm font-medium text-gray-900 flex-shrink-0">
                  {stats?.totalEndpoints || 0}
                </span>
              </div>
              {/* No Group second */}
              {stats?.groupCounts && Object.keys(stats.groupCounts).includes('No Group') && (
                <div
                  className={`flex justify-between items-center group px-2 py-1 rounded ${
                    groupFilter === 'No Group' ? 'bg-[#F4FBE8]' : ''
                  }`}
                >
                  <button
                    onClick={() => setGroupFilter('No Group')}
                    className={`text-sm truncate mr-2 transition-colors text-left ${
                      groupFilter === 'No Group'
                        ? 'text-[#5A7A08] font-medium'
                        : 'text-gray-600 hover:text-[#7EAC0B]'
                    }`}
                    style={{ textDecoration: 'none' }}
                  >
                    No Group
                  </button>
                  <span className="text-sm font-medium text-gray-900 flex-shrink-0">
                    {stats.groupCounts['No Group']}
                  </span>
                </div>
              )}
              {/* Separator after All Groups and No Group */}
              <hr className="my-2 border-gray-200" />
              {/* The rest, sorted alphabetically, excluding All Groups and No Group */}
              {Object.entries(stats?.groupCounts || {})
                .filter(([group]) => group !== 'No Group')
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([group, count]) =>
                  group !== 'No Group' ? (
                    <div
                      key={group}
                      className={`flex justify-between items-center group px-2 py-1 rounded ${
                        groupFilter === group ? 'bg-[#F4FBE8]' : ''
                      }`}
                    >
                      <button
                        onClick={() => {
                          setGroupFilter(group);
                          document.getElementById('endpoints-table')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className={`text-sm truncate mr-2 transition-colors text-left ${
                          groupFilter === group
                            ? 'text-[#5A7A08] font-medium'
                            : 'text-gray-600 hover:text-[#7EAC0B]'
                        }`}
                        style={{ textDecoration: 'none' }}
                      >
                        {group}
                      </button>
                      <span className="text-sm font-medium text-gray-900 flex-shrink-0">{count}</span>
                    </div>
                  ) : null
                )}
            </div>
          </div>
        </div>

        {/* Endpoints with Filters */}
        <div id="endpoints-table" className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Endpoints ({filteredEndpoints.length})
                {groupFilter !== 'all' && (
                  <span className="ml-2 text-sm font-normal text-blue-600">
                    • Filtered by group: {groupFilter}
                  </span>
                )}
              </h3>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setHealthFilter('all');
                  setOsFilter('all');
                  setTypeFilter('all');
                  // Note: groupFilter is now managed by the Groups card, not cleared here
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-md text-sm font-medium transition-colors"
              >
                Clear Search & Filters
              </button>
            </div>

            {/* Search Row */}
            <div className="mb-4">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search endpoints..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="os" className="block text-sm font-medium text-gray-700 mb-1">
                  Operating System
                </label>
                <select
                  id="os"
                  value={osFilter}
                  onChange={(e) => setOsFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All OS</option>
                  {Object.keys(stats?.osCounts || {}).map(os => (
                    <option key={os} value={os}>{os}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  id="type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  {Object.keys(stats?.typeCounts || {}).map(type => (
                    <option key={type} value={type} className="capitalize">{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
              </div>

              <div>
                <label htmlFor="health" className="block text-sm font-medium text-gray-700 mb-1">
                  Health
                </label>
                <select
                  id="health"
                  value={healthFilter}
                  onChange={(e) => setHealthFilter(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Health</option>
                  <option value="good">Good</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>


            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hostname
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operating System
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Health
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEndpoints.map((endpoint, index) => (
                  <tr key={`${endpoint.id}-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {endpoint.hostname}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {endpoint.os.name} {endpoint.os.version}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {endpoint.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(endpoint.online)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getHealthIcon(endpoint.health.overall)}
                        <span className="ml-2 text-sm text-gray-500 capitalize">
                          {endpoint.health.overall}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {endpoint.group.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {endpoint.ipAddresses && endpoint.ipAddresses.length > 0 ? (
                        <div>
                          <span className="font-mono">{endpoint.ipAddresses[0]}</span>
                          {endpoint.ipAddresses.length > 1 && (
                            <span className="text-xs text-gray-400 ml-1">
                              +{endpoint.ipAddresses.length - 1}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No IP</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredEndpoints.length === 0 && (
            <div className="text-center py-12">
              <ComputerDesktopIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No endpoints found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
