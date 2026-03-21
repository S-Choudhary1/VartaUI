import React, { useEffect, useState } from 'react';
import { Building2, Users, MessageSquare, Send, GitBranch } from 'lucide-react';
import { getAdminStats } from '../../services/adminService';
import type { AdminStats } from '../../types';
import { Card, CardContent } from '../../components/ui/Card';

const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getAdminStats();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whatsapp-teal"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Clients', value: stats?.totalClients ?? 0, icon: Building2, bg: 'bg-blue-50', text: 'text-blue-600' },
    { label: 'Total Contacts', value: stats?.totalContacts ?? 0, icon: Users, bg: 'bg-purple-50', text: 'text-purple-600' },
    { label: 'Total Messages', value: stats?.totalMessages ?? 0, icon: MessageSquare, bg: 'bg-green-50', text: 'text-green-600' },
    { label: 'Total Campaigns', value: stats?.totalCampaigns ?? 0, icon: Send, bg: 'bg-orange-50', text: 'text-orange-600' },
    { label: 'Active Flows', value: stats?.activeFlows ?? 0, icon: GitBranch, bg: 'bg-teal-50', text: 'text-teal-600' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">System-wide overview across all tenants.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{card.label}</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">{card.value.toLocaleString()}</h3>
                  </div>
                  <div className={`p-3 rounded-xl ${card.bg}`}>
                    <Icon className={`w-6 h-6 ${card.text}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminDashboard;
