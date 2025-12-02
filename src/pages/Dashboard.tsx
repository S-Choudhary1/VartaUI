import React, { useEffect, useState } from 'react';
import { Users, Send, CheckCircle, AlertCircle, ArrowUpRight } from 'lucide-react';
import { getDashboardStats } from '../services/dashboardService';
import type { DashboardStats } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  textColor: string;
  bgColor: string;
}

const StatCard = ({ title, value, icon: Icon, color, textColor, bgColor }: StatCardProps) => (
  <Card className="hover:shadow-md transition-shadow duration-200">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
      <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900 mt-2">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${bgColor}`}>
          <Icon className={`w-6 h-6 ${textColor}`} />
        </div>
      </div>
      <div className="mt-4 flex items-center text-sm">
         <span className="text-green-600 flex items-center font-medium">
           <ArrowUpRight className="w-4 h-4 mr-1" />
           +12%
         </span>
         <span className="text-gray-500 ml-2">from last month</span>
      </div>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

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

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whatsapp-teal"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/campaigns">
             <Button>Create Campaign</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Contacts" 
          value={stats?.totalContacts || 0} 
          icon={Users} 
          color="text-blue-600"
          textColor="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard 
          title="Active Campaigns" 
          value={stats?.activeCampaigns || 0} 
          icon={Send} 
          color="text-whatsapp-teal"
          textColor="text-whatsapp-teal"
          bgColor="bg-teal-50"
        />
        <StatCard 
          title="Messages Sent" 
          value={stats?.messagesSent || 0} 
          icon={CheckCircle} 
          color="text-green-600"
          textColor="text-green-600"
          bgColor="bg-green-50"
        />
        <StatCard 
          title="Failed Messages" 
          value={stats?.failedMessages || 0} 
          icon={AlertCircle} 
          color="text-red-600"
          textColor="text-red-600"
          bgColor="bg-red-50"
        />
      </div>

      {/* Recent Activity */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-gray-100 flex flex-row items-center justify-between">
          <CardTitle>Recent Campaigns</CardTitle>
          <Link to="/campaigns">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </CardHeader>
        
        {stats?.recentCampaigns && stats.recentCampaigns.length > 0 ? (
           <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 text-gray-500">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Campaign Name</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recentCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{campaign.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs rounded-full font-medium border ${
                        campaign.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-100' :
                        campaign.status === 'FAILED' ? 'bg-red-50 text-red-700 border-red-100' :
                        campaign.status === 'RUNNING' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        'bg-yellow-50 text-yellow-700 border-yellow-100'
                      }`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(campaign.createdAt).toLocaleDateString(undefined, { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <div className="w-full max-w-xs bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-whatsapp-teal h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${(campaign.totalContacts || 0) > 0 ? ((campaign.processedContacts || 0) / (campaign.totalContacts || 0)) * 100 : 0}%` }}
                          ></div>
                       </div>
                       <div className="text-xs text-gray-500 mt-1">
                         {campaign.processedContacts || 0} / {campaign.totalContacts || 0} contacts
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
               <Send className="w-8 h-8 text-gray-300" />
        </div>
            <h3 className="text-lg font-medium text-gray-900">No campaigns yet</h3>
            <p className="text-gray-500 mt-1 mb-6">Create your first campaign to get started.</p>
            <Link to="/campaigns">
              <Button>Create Campaign</Button>
            </Link>
      </div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
