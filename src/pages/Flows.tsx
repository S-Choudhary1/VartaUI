import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Pause, Trash2, GitBranch, AlertCircle, BarChart2, Pencil, Layers, Calendar } from 'lucide-react';
import { getFlows, deleteFlow, activateFlow, pauseFlow } from '../services/flowService';
import type { Flow } from '../types';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { SearchBar } from '../components/ui/SearchBar';

const statusBadgeVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' => {
  switch (status) {
    case 'ACTIVE': return 'success';
    case 'PAUSED': return 'warning';
    case 'ARCHIVED': return 'danger';
    default: return 'default';
  }
};

const triggerBadgeVariant = (type?: string): 'info' | 'warning' | 'default' => {
  switch (type) {
    case 'KEYWORD': return 'info';
    case 'CAMPAIGN': return 'warning';
    default: return 'default';
  }
};

const getStepCount = (flow: Flow): number => {
  if (!flow.definitionJson) return 0;
  try {
    const def = JSON.parse(flow.definitionJson);
    return Array.isArray(def.nodes) ? def.nodes.length : 0;
  } catch {
    return 0;
  }
};

const Flows = () => {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchFlows = async () => {
    setLoading(true);
    try {
      const data = await getFlows();
      setFlows(data);
    } catch (err) {
      console.error('Failed to fetch flows', err);
      setError('Failed to load flows.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFlows(); }, []);

  const handleToggleStatus = async (flow: Flow) => {
    try {
      if (flow.status === 'ACTIVE') {
        await pauseFlow(flow.id);
      } else {
        await activateFlow(flow.id);
      }
      fetchFlows();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update flow status.');
    }
  };

  const handleDelete = async (flow: Flow) => {
    if (!confirm(`Archive flow "${flow.name}"?`)) return;
    try {
      await deleteFlow(flow.id);
      fetchFlows();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete flow.');
    }
  };

  const visibleFlows = flows
    .filter(f => f.status !== 'ARCHIVED')
    .filter(f => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        f.name.toLowerCase().includes(q) ||
        (f.description || '').toLowerCase().includes(q) ||
        (f.triggerType || '').toLowerCase().includes(q)
      );
    });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Flows</h1>
          <p className="text-sm text-gray-500 mt-1">Build automated conversation sequences for your contacts.</p>
        </div>
        <Button onClick={() => navigate('/flows/new')} size="md">
          <Plus className="w-4 h-4" />
          Create Flow
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2.5 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600 text-xs font-medium">Dismiss</button>
        </div>
      )}

      {/* Search */}
      {!loading && flows.filter(f => f.status !== 'ARCHIVED').length > 0 && (
        <SearchBar
          placeholder="Search flows by name, description, or trigger..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      )}

      {/* Content */}
      {loading ? (
        <div className="py-24 text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008069] mx-auto mb-4" />
          <p className="text-sm">Loading flows...</p>
        </div>
      ) : visibleFlows.length === 0 && !search ? (
        <Card>
          <EmptyState
            icon={GitBranch}
            title="No flows yet"
            description="Create your first automated conversation flow to engage contacts."
            action={
              <Button onClick={() => navigate('/flows/new')}>
                <Plus className="w-4 h-4" />
                Create Flow
              </Button>
            }
          />
        </Card>
      ) : visibleFlows.length === 0 && search ? (
        <Card>
          <EmptyState
            icon={GitBranch}
            title="No matching flows"
            description={`No flows found matching "${search}". Try a different search term.`}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleFlows.map((flow) => {
            const stepCount = getStepCount(flow);
            return (
              <Card
                key={flow.id}
                className="group relative hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer"
                onClick={() => navigate(`/flows/${flow.id}`)}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{flow.name}</h3>
                      {flow.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{flow.description}</p>
                      )}
                    </div>
                    <Badge variant={statusBadgeVariant(flow.status)} dot>
                      {flow.status}
                    </Badge>
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant={triggerBadgeVariant(flow.triggerType)} size="sm">
                      {flow.triggerType === 'KEYWORD' && flow.triggerKeywords
                        ? `Keyword: ${flow.triggerKeywords}`
                        : flow.triggerType || 'No trigger'}
                    </Badge>
                    {stepCount > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Layers className="w-3 h-3" />
                        {stepCount} {stepCount === 1 ? 'step' : 'steps'}
                      </div>
                    )}
                  </div>

                  {/* Footer row */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {flow.createdAt ? new Date(flow.createdAt).toLocaleDateString() : '-'}
                    </div>

                    {/* Action buttons - visible on hover */}
                    <div
                      className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => navigate(`/flows/${flow.id}`)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(flow)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title={flow.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                      >
                        {flow.status === 'ACTIVE' ? (
                          <Pause className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </button>
                      <button
                        onClick={() => navigate(`/flows/${flow.id}/analytics`)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Analytics"
                      >
                        <BarChart2 className="w-3.5 h-3.5 text-blue-500" />
                      </button>
                      <button
                        onClick={() => handleDelete(flow)}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Archive"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Flows;
