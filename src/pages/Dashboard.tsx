import React, { useEffect, useState } from 'react';
import { Users, Send, CheckCircle, AlertCircle, Wifi, Megaphone, ArrowRight, Zap, BarChart3 } from 'lucide-react';
import { getDashboardStats } from '../services/dashboardService';
import { getWhatsAppStatus } from '../services/whatsappService';
import type { DashboardStats, WhatsAppStatus } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EmbeddedSignup from '../components/whatsapp/EmbeddedSignup';

const META_APP_ID = '3093323707495695';
const META_CONFIG_ID = '1494192019089832';

const statusVariant = (status: string): 'success' | 'danger' | 'info' | 'warning' => {
  switch (status) {
    case 'COMPLETED': return 'success';
    case 'FAILED': return 'danger';
    case 'RUNNING': return 'info';
    default: return 'warning';
  }
};

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [waStatus, setWaStatus] = useState<WhatsAppStatus | null>(null);
  const [showSignup, setShowSignup] = useState(false);

  const isSuperAdminWithoutClient = user?.role === 'SUPER_ADMIN' && !user?.clientId && !localStorage.getItem('impersonatedClientId');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchWaStatus = async () => {
      if (isSuperAdminWithoutClient) return;
      try {
        const data = await getWhatsAppStatus();
        setWaStatus(data);
      } catch {
        // Silently fail — banner just won't show
      }
    };

    fetchStats();
    fetchWaStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008069]"></div>
      </div>
    );
  }

  const handleOnboardSuccess = (newStatus: WhatsAppStatus) => {
    setWaStatus(newStatus);
    setShowSignup(false);
  };

  return (
    <div className="space-y-8">
      {/* WhatsApp Connection Banner */}
      {waStatus && !waStatus.connected && !isSuperAdminWithoutClient && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-amber-100/40 to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 rounded-xl shrink-0">
                <Wifi className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">WhatsApp Not Connected</h3>
                <p className="text-sm text-gray-600 mt-0.5">Connect your WhatsApp Business Account to start sending messages and campaigns.</p>
              </div>
            </div>
            <Button onClick={() => setShowSignup(true)} className="shrink-0">
              Connect WhatsApp
            </Button>
          </div>
        </div>
      )}

      {showSignup && (
        <EmbeddedSignup
          onClose={() => setShowSignup(false)}
          onSuccess={handleOnboardSuccess}
          appId={META_APP_ID}
          configId={META_CONFIG_ID}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back! Here's an overview of your account.</p>
        </div>
        <Link to="/campaigns">
          <Button className="gap-2">
            <Megaphone className="w-4 h-4" />
            Create Campaign
          </Button>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Contacts"
          value={stats?.totalContacts || 0}
          icon={Users}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          trend={{ value: '+12%', positive: true }}
        />
        <StatCard
          title="Active Campaigns"
          value={stats?.activeCampaigns || 0}
          icon={Send}
          iconBg="bg-[#008069]/10"
          iconColor="text-[#008069]"
          trend={{ value: '+8%', positive: true }}
        />
        <StatCard
          title="Messages Sent"
          value={stats?.messagesSent || 0}
          icon={CheckCircle}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          trend={{ value: '+24%', positive: true }}
        />
        <StatCard
          title="Failed Messages"
          value={stats?.failedMessages || 0}
          icon={AlertCircle}
          iconBg="bg-red-50"
          iconColor="text-red-600"
          trend={stats?.failedMessages ? { value: String(stats.failedMessages), positive: false } : undefined}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/contacts" className="group">
          <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100/80 bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200">
            <div className="p-2.5 rounded-xl bg-blue-50 group-hover:scale-110 transition-transform duration-200">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Manage Contacts</p>
              <p className="text-xs text-gray-500">Add or import contacts</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all duration-200" />
          </div>
        </Link>
        <Link to="/campaigns" className="group">
          <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100/80 bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200">
            <div className="p-2.5 rounded-xl bg-[#008069]/10 group-hover:scale-110 transition-transform duration-200">
              <Zap className="w-5 h-5 text-[#008069]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">New Campaign</p>
              <p className="text-xs text-gray-500">Launch a broadcast</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all duration-200" />
          </div>
        </Link>
        <Link to="/templates" className="group">
          <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100/80 bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200">
            <div className="p-2.5 rounded-xl bg-violet-50 group-hover:scale-110 transition-transform duration-200">
              <BarChart3 className="w-5 h-5 text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Templates</p>
              <p className="text-xs text-gray-500">View message templates</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all duration-200" />
          </div>
        </Link>
      </div>

      {/* Recent Campaigns */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Campaigns</CardTitle>
          <Link to="/campaigns">
            <Button variant="ghost" size="sm" className="gap-1.5">
              View All
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </CardHeader>

        {stats?.recentCampaigns && stats.recentCampaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100/80">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.recentCampaigns.map((campaign) => {
                  const total = campaign.totalContacts || 0;
                  const processed = campaign.processedContacts || 0;
                  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;

                  return (
                    <tr key={campaign.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{campaign.name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={statusVariant(campaign.status)} dot>
                          {campaign.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(campaign.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#008069] rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-500 tabular-nums w-16 text-right">
                            {processed}/{total}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Send}
            title="No campaigns yet"
            description="Create your first campaign to start reaching your contacts."
            action={
              <Link to="/campaigns">
                <Button>Create Campaign</Button>
              </Link>
            }
          />
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
