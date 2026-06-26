'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Cpu,
  Terminal,
  Activity,
  AlertTriangle,
  Settings as SettingsIcon,
  Play,
  Users,
  Brain,
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Bell
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: null },
  { href: '/k8s', label: 'Kubernetes', icon: ShieldCheck, permission: 'kubernetes:read' },
  { href: '/monitoring', label: 'Monitoring', icon: Cpu, permission: 'prometheus:read' },
  { href: '/logs', label: 'Logs Explorer', icon: Terminal, permission: 'loki:read' },
  { href: '/incidents', label: 'Incidents', icon: Activity, permission: 'incidents:read' },
  { href: '/ai', label: 'AI RCA Hub', icon: Brain, permission: 'ai:read' },
  { href: '/jenkins', label: 'Jenkins Build', icon: Play, permission: 'jenkins:read' },
  { href: '/alerts', label: 'Alertmanager', icon: AlertTriangle, permission: 'alerts:read' },
  { href: '/users', label: 'User Admin', icon: Users, permission: null }, // local simulator, always visible to see
  { href: '/settings', label: 'Settings', icon: SettingsIcon, permission: null },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout, hasPermission } = useAuth();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Handle local dark/light theme setting
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme as 'dark' | 'light');
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-white">
        {/* Animated glowing loader spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 border-zinc-800 animate-spin" />
          <div className="absolute inset-2 rounded-full border-4 border-b-indigo-500 border-zinc-800 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
        <p className="mt-4 text-sm text-zinc-400 font-medium">Securing session connection...</p>
      </div>
    );
  }

  // Filter navigation items by user permissions
  const filteredNavItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-300">
      
      {/* ── MOBILE SIDEBAR BACKDROP ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR NAV ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-45 flex w-64 flex-col border-r border-border bg-card transition-transform duration-300 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
              AIOPS CORE
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-zinc-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Sidebar Links */}
        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar User Footer */}
        <div className="p-4 border-t border-border bg-zinc-950/20">
          <div className="flex items-center justify-between">
            <div className="flex flex-col truncate pr-2">
              <span className="text-sm font-semibold truncate text-foreground">{user.full_name}</span>
              <span className="text-xs text-muted-foreground truncate">{user.roles[0]?.name || 'Viewer'}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md"
              onClick={logout}
              title="Sign Out"
            >
              <LogOut className="h-4.5 w-4.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        
        {/* Top Header Navbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/85 backdrop-blur-md px-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold capitalize text-foreground">
              {pathname.replace('/', '').replace('-', ' ') || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Theme switcher */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground rounded-full"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {/* Notification alert manager */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="text-muted-foreground hover:text-foreground rounded-full relative"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-card" />
              </Button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg border border-border bg-card p-4 shadow-xl z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-sm font-semibold">Active Incidents</span>
                    <span className="text-xs text-red-500 font-medium">1 Critical</span>
                  </div>
                  <div className="space-y-3 py-3 text-xs">
                    <div className="p-2.5 rounded bg-red-950/20 border-l-4 border-red-500">
                      <p className="font-semibold text-foreground">API Gateway Latency High</p>
                      <p className="text-muted-foreground mt-0.5">Response latency exceeds 2.5s limit in cluster-prod.</p>
                      <span className="text-[10px] text-zinc-500 mt-1 block">5 minutes ago</span>
                    </div>
                    <div className="p-2.5 rounded bg-amber-950/20 border-l-4 border-amber-500">
                      <p className="font-semibold text-foreground">Jenkins Agent Offline</p>
                      <p className="text-muted-foreground mt-0.5">Executor pool has lost communication with Jenkins Master.</p>
                      <span className="text-[10px] text-zinc-500 mt-1 block">22 minutes ago</span>
                    </div>
                  </div>
                  <Link
                    href="/incidents"
                    className="block text-center text-xs text-purple-400 font-semibold hover:underline pt-2 border-t border-border"
                    onClick={() => setNotificationsOpen(false)}
                  >
                    View All Incidents
                  </Link>
                </div>
              )}
            </div>

            {/* User Meta summary */}
            <div className="hidden sm:flex flex-col text-right pl-2 border-l border-border select-none">
              <span className="text-xs font-semibold text-foreground">{user.full_name}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{user.email}</span>
            </div>
          </div>
        </header>

        {/* Dashboard Main Content Body */}
        <main className="flex-grow p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
