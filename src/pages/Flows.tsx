import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Pause, Trash2, GitBranch, AlertCircle, BarChart2 } from 'lucide-react';
import { getFlows, deleteFlow, activateFlow, pauseFlow } from '../services/flowService';
import type { Flow } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-50 text-gray-700 border-gray-200',
  ACTIVE: 'bg-green-50 text-green-700 border-green-100',
  PAUSED: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  ARCHIVED: 'bg-red-50 text-red-700 border-red-100',
};

const Flows = () => {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Flows</h1>
          <p className="text-gray-500 mt-1">Build automated conversation sequences for your contacts.</p>
        </div>
        <Button onClick={() => navigate('/flows/new')}>
          <Plus className="w-4 h-4 mr-2" />
          New Flow
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <Card>
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whatsapp-teal mx-auto mb-4" />
            Loading flows...
          </div>
        ) : flows.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center">
            <div className="bg-gray-50 p-6 rounded-full mb-4">
              <GitBranch className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No flows yet</h3>
            <p className="text-gray-500 mt-1 max-w-sm">Create your first automated conversation flow.</p>
            <Button onClick={() => navigate('/flows/new')} className="mt-6">
              Create Flow
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-500">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Trigger</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {flows.filter(f => f.status !== 'ARCHIVED').map((flow) => (
                  <tr
                    key={flow.id}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/flows/${flow.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">{flow.name}</div>
                        {flow.description && (
                          <div className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{flow.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs rounded-full font-medium border ${statusColors[flow.status] || statusColors.DRAFT}`}>
                        {flow.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {flow.triggerType === 'KEYWORD' && flow.triggerKeywords ? (
                        <span className="text-xs">{flow.triggerKeywords}</span>
                      ) : (
                        <span className="text-gray-400 text-xs uppercase font-medium tracking-wide">
                          {flow.triggerType || 'None'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {flow.createdAt ? new Date(flow.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(flow)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          title={flow.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                        >
                          {flow.status === 'ACTIVE' ? (
                            <Pause className="w-4 h-4 text-yellow-600" />
                          ) : (
                            <Play className="w-4 h-4 text-green-600" />
                          )}
                        </button>
                        <button
                          onClick={() => navigate(`/flows/${flow.id}/analytics`)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Analytics"
                        >
                          <BarChart2 className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(flow)}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          title="Archive"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Flows;
