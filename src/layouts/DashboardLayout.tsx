import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  ChevronRight
} from 'lucide-react';
import { cn } from '../components/ui/Button';

const DashboardLayout = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/contacts', label: 'Contacts', icon: Users },
    { path: '/campaigns', label: 'Campaigns', icon: Send },
    { path: '/templates', label: 'Templates', icon: FileText },
    { path: '/messages', label: 'Quick Send', icon: MessageSquareText },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transition-all duration-300 flex flex-col shadow-lg lg:shadow-none",
          sidebarOpen ? "w-64" : "w-20",
          mobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          <div className="flex items-center gap-2 overflow-hidden">
             <div className="w-8 h-8 rounded-lg bg-whatsapp-teal flex items-center justify-center flex-shrink-0">
               <span className="text-white font-bold text-lg">V</span>
             </div>
             {(sidebarOpen || mobileMenuOpen) && (
               <span className="text-xl font-bold text-gray-900 tracking-tight whitespace-nowrap">VartaAI</span>
          )}
          </div>
          {/* Mobile Close Button */}
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1 hover:bg-gray-100 rounded-md"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <nav className="flex-1 py-6 space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group relative overflow-hidden",
                  isActive 
                    ? "bg-whatsapp-teal/10 text-whatsapp-teal font-semibold" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className={cn("w-5 h-5 flex-shrink-0 transition-colors", isActive ? "text-whatsapp-teal" : "text-gray-400 group-hover:text-gray-600")} />
                <span className={cn(
                  "ml-3 transition-all duration-200 whitespace-nowrap",
                  !sidebarOpen && !mobileMenuOpen && "opacity-0 w-0 overflow-hidden"
                )}>
                  {item.label}
                </span>
                
                {!sidebarOpen && !mobileMenuOpen && (
                   <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                     {item.label}
                   </div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
           <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex items-center justify-center w-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg mb-2 transition-colors"
          >
            {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>

          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center w-full px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors group overflow-hidden",
              !sidebarOpen && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className={cn(
              "ml-3 transition-all duration-200 whitespace-nowrap",
               !sidebarOpen && !mobileMenuOpen && "opacity-0 w-0 overflow-hidden"
            )}>
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50/50 w-full">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shadow-sm z-30">
          <div className="flex items-center gap-4">
          <button 
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-600"
          >
            <Menu className="w-6 h-6" />
          </button>
            <h2 className="text-lg font-semibold text-gray-800 hidden sm:block">
               {navItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
            </h2>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-end hidden md:flex">
              <span className="text-sm font-medium text-gray-900">
                {user?.username || 'User'}
              </span>
              <span className="text-xs text-gray-500 uppercase tracking-wider">
                {user?.role || 'Admin'}
            </span>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-whatsapp-teal to-whatsapp-teal-dark rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md ring-2 ring-white">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          <div className="max-w-7xl mx-auto">
          <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
