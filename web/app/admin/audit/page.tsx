'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import AdminRouteGuard from '@/components/AdminRouteGuard';

interface AuditLog {
  id: number;
  actor_id?: number;
  actor_role?: string;
  actor_email?: string;
  actor_name?: string;
  action: string;
  entity: string;
  entity_id?: number;
  before?: any;
  after?: any;
  changes?: any;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  request_id?: string;
  status: string;
  error_message?: string;
  audit_metadata?: any;
  created_at: string;
}

interface AuditStats {
  total_events: number;
  events_today: number;
  events_this_week: number;
  events_this_month: number;
  failed_events: number;
  top_actions: Array<{ action: string; count: number }>;
  top_entities: Array<{ entity: string; count: number }>;
  top_actors: Array<{ actor: string; count: number }>;
}

interface FilterState {
  actor_id?: number;
  action?: string;
  entity?: string;
  entity_id?: number;
  status?: string;
  ip_address?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 50;
  
  // Filters
  const [filters, setFilters] = useState<FilterState>({});
  const [showFilters, setShowFilters] = useState(false);
  
  // Available options for filters
  const [actions, setActions] = useState<Array<{ value: string; label: string }>>([]);
  const [entities, setEntities] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    fetchAuditLogs();
    fetchAuditStats();
    fetchFilterOptions();
  }, [currentPage, filters]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: perPage.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        )
      });

      const response = await fetch(`/api/admin/audit/logs?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditStats = async () => {
    try {
      const response = await fetch('/api/admin/audit/stats', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch audit stats:', err);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const [actionsResponse, entitiesResponse] = await Promise.all([
        fetch('/api/admin/audit/actions', { credentials: 'include' }),
        fetch('/api/admin/audit/entities', { credentials: 'include' })
      ]);

      if (actionsResponse.ok) {
        const actionsData = await actionsResponse.json();
        setActions(actionsData);
      }

      if (entitiesResponse.ok) {
        const entitiesData = await entitiesResponse.json();
        setEntities(entitiesData);
      }
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case 'SUCCESS':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'FAILURE':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'PARTIAL':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getActionBadge = (action: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded";
    const actionColors: Record<string, string> = {
      'LOGIN': 'bg-blue-100 text-blue-800',
      'LOGOUT': 'bg-gray-100 text-gray-800',
      'CREATE': 'bg-green-100 text-green-800',
      'UPDATE': 'bg-yellow-100 text-yellow-800',
      'DELETE': 'bg-red-100 text-red-800',
      'ORDER_STATUS_CHANGE': 'bg-purple-100 text-purple-800',
      'PAYMENT_STATUS_CHANGE': 'bg-indigo-100 text-indigo-800'
    };
    
    const colorClass = actionColors[action] || 'bg-gray-100 text-gray-800';
    return `${baseClasses} ${colorClass}`;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm:ss');
  };

  const viewLogDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetails(true);
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maroon-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-red-800">Error</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <AdminRouteGuard>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600">Monitor all system activities and user actions</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 bg-maroon-600 text-white rounded-lg hover:bg-maroon-700"
        >
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-500">Total Events</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.total_events.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-500">Today</h3>
            <p className="text-2xl font-bold text-blue-600">{stats.events_today.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-500">This Week</h3>
            <p className="text-2xl font-bold text-green-600">{stats.events_this_week.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-500">This Month</h3>
            <p className="text-2xl font-bold text-purple-600">{stats.events_this_month.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-500">Failed Events</h3>
            <p className="text-2xl font-bold text-red-600">{stats.failed_events.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                value={filters.action || ''}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
              >
                <option value="">All Actions</option>
                {actions.map(action => (
                  <option key={action.value} value={action.value}>{action.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entity</label>
              <select
                value={filters.entity || ''}
                onChange={(e) => handleFilterChange('entity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
              >
                <option value="">All Entities</option>
                {entities.map(entity => (
                  <option key={entity.value} value={entity.value}>{entity.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
              >
                <option value="">All Statuses</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILURE">Failure</option>
                <option value="PARTIAL">Partial</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search logs..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-maroon-500 focus:border-maroon-500"
              />
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Clear Filters
            </button>
            <div className="text-sm text-gray-500">
              Showing {logs.length} of {total.toLocaleString()} results
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {log.actor_name || log.actor_email || 'System'}
                    </div>
                    <div className="text-sm text-gray-500">{log.actor_role}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getActionBadge(log.action)}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.entity}</div>
                    {log.entity_id && (
                      <div className="text-sm text-gray-500">ID: {log.entity_id}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadge(log.status)}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.ip_address || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => viewLogDetails(log)}
                      className="text-maroon-600 hover:text-maroon-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing page {currentPage} of {totalPages} ({total.toLocaleString()} total results)
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Log Details Modal */}
      {showDetails && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Audit Log Details</h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900">Basic Information</h3>
                    <dl className="mt-2 space-y-1">
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">ID:</dt>
                        <dd className="text-sm text-gray-900">{selectedLog.id}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Timestamp:</dt>
                        <dd className="text-sm text-gray-900">{formatDate(selectedLog.created_at)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Action:</dt>
                        <dd className="text-sm text-gray-900">
                          <span className={getActionBadge(selectedLog.action)}>
                            {selectedLog.action}
                          </span>
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Entity:</dt>
                        <dd className="text-sm text-gray-900">{selectedLog.entity}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Status:</dt>
                        <dd className="text-sm text-gray-900">
                          <span className={getStatusBadge(selectedLog.status)}>
                            {selectedLog.status}
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900">Actor Information</h3>
                    <dl className="mt-2 space-y-1">
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Name:</dt>
                        <dd className="text-sm text-gray-900">{selectedLog.actor_name || '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Email:</dt>
                        <dd className="text-sm text-gray-900">{selectedLog.actor_email || '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Role:</dt>
                        <dd className="text-sm text-gray-900">{selectedLog.actor_role || '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">IP Address:</dt>
                        <dd className="text-sm text-gray-900">{selectedLog.ip_address || '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Session ID:</dt>
                        <dd className="text-sm text-gray-900 font-mono text-xs">{selectedLog.session_id || '-'}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
                
                {selectedLog.error_message && (
                  <div>
                    <h3 className="font-medium text-gray-900 text-red-600">Error Message</h3>
                    <p className="mt-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                      {selectedLog.error_message}
                    </p>
                  </div>
                )}
                
                {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900">Changes</h3>
                    <pre className="mt-2 text-sm bg-gray-50 p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(selectedLog.changes, null, 2)}
                    </pre>
                  </div>
                )}
                
                {selectedLog.before && (
                  <div>
                    <h3 className="font-medium text-gray-900">Before State</h3>
                    <pre className="mt-2 text-sm bg-gray-50 p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(selectedLog.before, null, 2)}
                    </pre>
                  </div>
                )}
                
                {selectedLog.after && (
                  <div>
                    <h3 className="font-medium text-gray-900">After State</h3>
                    <pre className="mt-2 text-sm bg-gray-50 p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(selectedLog.after, null, 2)}
                    </pre>
                  </div>
                )}
                
                {selectedLog.audit_metadata && Object.keys(selectedLog.audit_metadata).length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900">Metadata</h3>
                    <pre className="mt-2 text-sm bg-gray-50 p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(selectedLog.audit_metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminRouteGuard>
  );
}
