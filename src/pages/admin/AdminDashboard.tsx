import React, { useEffect, useState } from 'react';
import { Building2, Users, MessageSquare, Send, GitBranch, BarChart3 } from 'lucide-react';
import { getAdminStats } from '../../services/adminService';
import type { AdminStats } from '../../types';
import { StatCard } from '../../components/ui/StatCard';

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
    {
      title: 'Total Clients',
      value: (stats?.totalClients ?? 0).toLocaleString(),
      icon: Building2,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Total Contacts',
      value: (stats?.totalContacts ?? 0).toLocaleString(),
      icon: Users,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Total Messages',
      value: (stats?.totalMessages ?? 0).toLocaleString(),
      icon: MessageSquare,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
    },
    {
      title: 'Total Campaigns',
      value: (stats?.totalCampaigns ?? 0).toLocaleString(),
      icon: Send,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      title: 'Active Flows',
      value: (stats?.activeFlows ?? 0).toLocaleString(),
      icon: GitBranch,
      iconBg: 'bg-[#008069]/10',
      iconColor: 'text-[#008069]',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#008069] to-[#006e5a]">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">System-wide overview across all tenants</p>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        {statCards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
            iconBg={card.iconBg}
            iconColor={card.iconColor}
          />
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
