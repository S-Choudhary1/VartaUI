import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  LayoutDashboard,
  Users,
  MessageSquareText,
  Send,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Shield,
  Building2,
  Settings,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../components/ui/Button';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';

const DashboardLayout = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [clientLoading, setClientLoading] = useState(false);
  const [clientError, setClientError] = useState('');
  const [clientData, setClientData] = useState<ClientDto | null>(null);

  interface ClientDto {
    id: string;
    name: string;
    phoneNumberId: string;
    wabaId: string;
    language?: string;
    onboardingStatus?: string;
    businessName?: string;
    verifiedName?: string;
    qualityRating?: string;
    messagingLimitTier?: string;
    phoneStatus?: string;
    businessVerificationStatus?: string;
    accountReviewStatus?: string;
    billingStatus?: string;
    provisioningError?: string;
    tokenExpiresAt?: string;
    lastSyncedAt?: string;
    createdAt: string;
  }

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isImpersonating = !!localStorage.getItem('impersonatedClientId');

  const mainNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/contacts', label: 'Contacts', icon: Users },
    { path: '/campaigns', label: 'Campaigns', icon: Send },
    { path: '/flows', label: 'Flows', icon: GitBranch },
    { path: '/templates', label: 'Templates', icon: FileText },
    { path: '/messages', label: 'Quick Send', icon: MessageSquareText },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const adminNavItems = isSuperAdmin
    ? [
        { path: '/admin', label: 'Admin Dashboard', icon: Shield },
        { path: '/admin/clients', label: 'Clients', icon: Building2 },
      ]
    : [];

  const navItems = [
    ...mainNavItems,
    ...adminNavItems,
  ];

  const handleLogout = () => {
    localStorage.removeItem('impersonatedClientId');
    logout();
    navigate('/login');
  };

  const handleExitImpersonation = () => {
    localStorage.removeItem('impersonatedClientId');
    navigate('/admin/clients');
    window.location.reload();
  };

  const handleOpenProfile = async () => {
    setIsProfileOpen(true);
    setClientError('');

    if (!user?.clientId) {
      setClientData(null);
      setClientError('Client ID is not available for this user.');
      return;
    }

    setClientLoading(true);
    try {
      const response = await api.get<ClientDto>(`/clients/${user.clientId}`);
      setClientData(response.data);
    } catch (error) {
      setClientData(null);
      setClientError(error instanceof Error ? error.message : 'Failed to load client details.');
    } finally {
      setClientLoading(false);
    }
  };

  const handleCloseProfile = () => {
    setIsProfileOpen(false);
  };

  const currentPageLabel = navItems.find(i => i.path === location.pathname)?.label || 'Dashboard';

  return (
    <div className="flex h-screen bg-gray-50/80">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 bg-[#fafafa] border-r border-gray-200/80 transition-all duration-300 ease-in-out flex flex-col',
          sidebarOpen ? 'w-[260px]' : 'w-[72px]',
          mobileMenuOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200/60">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-[#008069] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg leading-none">V</span>
            </div>
            {(sidebarOpen || mobileMenuOpen) && (
              <span className="text-lg font-semibold text-gray-900 tracking-tight whitespace-nowrap">
                VartaAI
              </span>
            )}
          </div>
          {/* Mobile Close */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {/* Main section */}
          <div className="space-y-0.5">
            {(sidebarOpen || mobileMenuOpen) && (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Main
              </p>
            )}
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center rounded-lg transition-all duration-150 group relative',
                    sidebarOpen || mobileMenuOpen ? 'px-3 py-2.5' : 'justify-center py-2.5 px-0',
                    isActive
                      ? 'text-[#008069]'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/80'
                  )}
                >
                  {/* Active left accent */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#008069] rounded-r-full" />
                  )}
                  <Icon
                    className={cn(
                      'w-[18px] h-[18px] flex-shrink-0 transition-colors',
                      isActive ? 'text-[#008069]' : 'text-gray-400 group-hover:text-gray-600'
                    )}
                  />
                  <span
                    className={cn(
                      'ml-3 text-[13px] transition-all duration-200 whitespace-nowrap',
                      isActive ? 'font-semibold' : 'font-medium',
                      !sidebarOpen && !mobileMenuOpen && 'opacity-0 w-0 overflow-hidden ml-0'
                    )}
                  >
                    {item.label}
                  </span>

                  {/* Tooltip for collapsed sidebar */}
                  {!sidebarOpen && !mobileMenuOpen && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg transition-opacity duration-150">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Admin section */}
          {adminNavItems.length > 0 && (
            <div className="space-y-0.5">
              {(sidebarOpen || mobileMenuOpen) && (
                <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Administration
                </p>
              )}
              {!sidebarOpen && !mobileMenuOpen && (
                <div className="mx-auto w-6 border-t border-gray-200/80 mb-2" />
              )}
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center rounded-lg transition-all duration-150 group relative',
                      sidebarOpen || mobileMenuOpen ? 'px-3 py-2.5' : 'justify-center py-2.5 px-0',
                      isActive
                        ? 'text-[#008069]'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/80'
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#008069] rounded-r-full" />
                    )}
                    <Icon
                      className={cn(
                        'w-[18px] h-[18px] flex-shrink-0 transition-colors',
                        isActive ? 'text-[#008069]' : 'text-gray-400 group-hover:text-gray-600'
                      )}
                    />
                    <span
                      className={cn(
                        'ml-3 text-[13px] transition-all duration-200 whitespace-nowrap',
                        isActive ? 'font-semibold' : 'font-medium',
                        !sidebarOpen && !mobileMenuOpen && 'opacity-0 w-0 overflow-hidden ml-0'
                      )}
                    >
                      {item.label}
                    </span>
                    {!sidebarOpen && !mobileMenuOpen && (
                      <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg transition-opacity duration-150">
                        {item.label}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-gray-200/60 p-3 space-y-2">
          {/* Collapse toggle - desktop only */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex items-center justify-center w-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 rounded-lg transition-colors"
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {/* User info */}
          {(sidebarOpen || mobileMenuOpen) && (
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar name={user?.username || 'User'} size="sm" className="ring-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-gray-900 truncate">
                  {user?.username || 'User'}
                </p>
                <p className="text-[11px] text-gray-400 uppercase tracking-wider">
                  {user?.role || 'Admin'}
                </p>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center w-full py-2 text-gray-500 hover:text-red-600 hover:bg-red-50/80 rounded-lg transition-all duration-150 group',
              sidebarOpen || mobileMenuOpen ? 'px-3' : 'justify-center px-0'
            )}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0 transition-colors group-hover:text-red-600" />
            <span
              className={cn(
                'ml-3 text-[13px] font-medium transition-all duration-200 whitespace-nowrap',
                !sidebarOpen && !mobileMenuOpen && 'opacity-0 w-0 overflow-hidden ml-0'
              )}
            >
              Logout
            </span>
            {!sidebarOpen && !mobileMenuOpen && (
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg transition-opacity duration-150">
                Logout
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden w-full">
        {/* Impersonation Banner */}
        {isImpersonating && (
          <div className="bg-amber-50 border-b border-amber-200/60 text-amber-800 px-4 py-2 flex items-center justify-between z-40">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="font-medium">Impersonation active</span>
              <span className="text-amber-600 hidden sm:inline">
                -- Data shown belongs to the impersonated tenant.
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExitImpersonation}
              className="border-amber-300 text-amber-800 hover:bg-amber-100 text-xs"
            >
              Exit
            </Button>
          </div>
        )}

        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-200/80 flex items-center justify-between px-4 sm:px-6 z-30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-sm">
              <span className="text-gray-400 font-medium">VartaAI</span>
              <span className="text-gray-300">/</span>
              <span className="text-gray-900 font-semibold">{currentPageLabel}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenProfile}
            className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Avatar name={user?.username || 'User'} size="sm" className="ring-0" />
          </button>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Profile Modal */}
      <Modal
        open={isProfileOpen}
        onClose={handleCloseProfile}
        title="Profile"
        description="Your account and client details"
        size="md"
        footer={
          <Button variant="outline" onClick={handleCloseProfile}>
            Close
          </Button>
        }
      >
        <div className="space-y-5">
          {/* User section */}
          <div className="flex items-center gap-4 p-4 bg-gray-50/80 rounded-xl">
            <Avatar name={user?.username || 'User'} size="lg" className="ring-0" />
            <div className="min-w-0">
              <p className="text-base font-semibold text-gray-900">{user?.username || 'N/A'}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={isSuperAdmin ? 'info' : 'default'} size="sm">
                  {user?.role || 'N/A'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-0.5">User ID</p>
              <p className="text-gray-900 font-mono text-xs">{user?.id || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-0.5">Client ID</p>
              <p className="text-gray-900 font-mono text-xs">{user?.clientId || 'N/A'}</p>
            </div>
          </div>

          {/* Client details */}
          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Client Details</h4>
            {clientLoading ? (
              <div className="flex items-center gap-2 py-3 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-200 border-t-[#008069] rounded-full animate-spin" />
                Loading client details...
              </div>
            ) : clientError ? (
              <p className="text-sm text-red-600 py-2">{clientError}</p>
            ) : clientData ? (
              <div className="space-y-4">
                {/* Connection */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <ProfileField label="Name" value={clientData.name} />
                  <ProfileField label="Business Name" value={clientData.businessName} />
                  <ProfileField label="WABA ID" value={clientData.wabaId} mono />
                  <ProfileField label="Phone Number ID" value={clientData.phoneNumberId} mono />
                  <ProfileField label="Verified Name" value={clientData.verifiedName} />
                  <ProfileField label="Language" value={clientData.language} />
                </div>

                {/* Health & Status */}
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Health & Status</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-xs text-gray-500">Onboarding</span>
                      <Badge variant={clientData.onboardingStatus === 'READY' ? 'success' : clientData.onboardingStatus === 'FAILED' ? 'danger' : 'warning'} size="sm" dot>
                        {clientData.onboardingStatus || 'N/A'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-xs text-gray-500">Quality</span>
                      <Badge variant={clientData.qualityRating === 'GREEN' ? 'success' : clientData.qualityRating === 'YELLOW' ? 'warning' : clientData.qualityRating === 'RED' ? 'danger' : 'default'} size="sm">
                        {clientData.qualityRating || '--'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-xs text-gray-500">Msg Limit</span>
                      <span className="text-xs font-semibold text-gray-700">{clientData.messagingLimitTier || '--'}</span>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-xs text-gray-500">Phone</span>
                      <span className={cn('text-xs font-semibold', clientData.phoneStatus === 'CONNECTED' ? 'text-emerald-600' : clientData.phoneStatus === 'FLAGGED' ? 'text-red-600' : 'text-gray-700')}>
                        {clientData.phoneStatus || '--'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Verification & Billing */}
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Verification & Billing</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Business Verification</span>
                      <Badge variant={clientData.businessVerificationStatus === 'verified' ? 'success' : clientData.businessVerificationStatus === 'rejected' ? 'danger' : 'warning'} size="sm">
                        {clientData.businessVerificationStatus || 'Not Verified'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Account Review</span>
                      <span className="text-sm text-gray-700">{clientData.accountReviewStatus || '--'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Billing</span>
                      <Badge variant={clientData.billingStatus === 'ACTIVE' ? 'success' : clientData.billingStatus === 'NO_PAYMENT_METHOD' ? 'danger' : 'default'} size="sm">
                        {clientData.billingStatus || 'Not Set'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="border-t border-gray-100 pt-3">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <ProfileField label="Created" value={clientData.createdAt ? new Date(clientData.createdAt).toLocaleString() : 'N/A'} />
                    <ProfileField label="Last Synced" value={clientData.lastSyncedAt ? new Date(clientData.lastSyncedAt).toLocaleString() : '--'} />
                    <ProfileField label="Token Expires" value={clientData.tokenExpiresAt ? new Date(clientData.tokenExpiresAt).toLocaleDateString() : '--'} />
                    <ProfileField label="Client ID" value={clientData.id} mono />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-2">No client details found.</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

const ProfileField = ({ label, value, mono }: { label: string; value?: string; mono?: boolean }) => (
  <div>
    <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-0.5">{label}</p>
    <p className={cn('text-gray-900', mono && 'font-mono text-xs')}>{value || '--'}</p>
  </div>
);

export default DashboardLayout;
