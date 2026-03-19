import { useState, useEffect } from 'react';
import { BarChart2, Users, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';
import { getFlowAnalytics } from '../../services/flowService';
import type { FlowAnalytics as FlowAnalyticsType } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

interface FlowAnalyticsProps {
  flowId: string;
}

const FlowAnalyticsView = ({ flowId }: FlowAnalyticsProps) => {
  const [analytics, setAnalytics] = useState<FlowAnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getFlowAnalytics(flowId);
        setAnalytics(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [flowId]);

  if (loading) return (
    <div className="p-8 text-center text-gray-500">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whatsapp-teal mx-auto mb-4" />
      Loading analytics...
    </div>
  );

  if (error) return (
    <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
      <AlertCircle className="w-5 h-5" />
      {error}
    </div>
  );

  if (!analytics) return null;

  const stats = [
    { label: 'Total', value: analytics.totalExecutions, icon: Users, color: 'text-gray-700 bg-gray-50' },
    { label: 'Completed', value: analytics.completed, icon: CheckCircle, color: 'text-green-700 bg-green-50' },
    { label: 'Active', value: analytics.active, icon: BarChart2, color: 'text-blue-700 bg-blue-50' },
    { label: 'Waiting', value: analytics.waiting, icon: Clock, color: 'text-amber-700 bg-amber-50' },
    { label: 'Failed', value: analytics.failed, icon: XCircle, color: 'text-red-700 bg-red-50' },
    { label: 'Timed Out', value: analytics.timedOut, icon: AlertCircle, color: 'text-orange-700 bg-orange-50' },
  ];

  const nodeEntries = Object.entries(analytics.contactsPerNode || {});
  const maxCount = Math.max(...nodeEntries.map(([, c]) => c), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{value}</div>
                  <div className="text-xs text-gray-500">{label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {nodeEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Contacts per Node</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {nodeEntries.map(([nodeId, count]) => (
                <div key={nodeId} className="flex items-center gap-3">
                  <div className="w-32 text-xs text-gray-600 truncate font-mono">{nodeId}</div>
                  <div className="flex-1">
                    <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-whatsapp-teal/70 rounded-full transition-all duration-500"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-700 w-10 text-right">{count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FlowAnalyticsView;
