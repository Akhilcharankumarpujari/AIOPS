'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { Sliders, User, BellRing } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [apiUrl, setApiUrl] = useState('http://localhost:8000');
  const [notifyIncidents, setNotifyIncidents] = useState(true);
  const [notifyBuilds, setNotifyBuilds] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem('api_endpoint_override') || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      setApiUrl(savedUrl);
    }
  }, []);

  const handleSaveSettings = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('api_endpoint_override', apiUrl);
      toast('Success', 'Configuration settings saved successfully.', 'success');
      
      // Reload page to re-init Axios client with new base URL
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* ── PROFILE CARD ── */}
      <Card className="glass-panel text-white border-zinc-800">
        <CardHeader className="flex flex-row items-center space-x-3.5 border-b border-zinc-800/60">
          <div className="p-2 bg-purple-500/20 rounded-full border border-purple-500/30">
            <User className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <CardTitle className="text-md">User Account Profile</CardTitle>
            <span className="text-xs text-zinc-500 block">Personal identity information and role status</span>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4 text-xs text-zinc-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-zinc-500 block uppercase tracking-wider text-[10px]">Full Name</span>
              <span className="font-semibold text-zinc-200 block text-sm">{user?.full_name}</span>
            </div>
            <div className="space-y-1">
              <span className="text-zinc-500 block uppercase tracking-wider text-[10px]">Email Address</span>
              <span className="font-semibold text-zinc-200 block text-sm font-mono">{user?.email}</span>
            </div>
            <div className="space-y-1">
              <span className="text-zinc-500 block uppercase tracking-wider text-[10px]">System User ID</span>
              <span className="font-semibold text-zinc-400 block font-mono text-[10px]">{user?.id}</span>
            </div>
            <div className="space-y-1">
              <span className="text-zinc-500 block uppercase tracking-wider text-[10px]">Security Role</span>
              <div className="flex gap-1.5 mt-1">
                {user?.roles.map((r) => (
                  <span key={r.id} className="text-[10px] bg-purple-950/20 border border-purple-500/30 text-purple-400 rounded px-1.5 py-0.5 font-bold">
                    {r.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── API CONFIGURATION CARD ── */}
      <Card className="glass-panel text-white border-zinc-800">
        <CardHeader className="flex flex-row items-center space-x-3.5 border-b border-zinc-800/60">
          <div className="p-2 bg-indigo-500/20 rounded-full border border-indigo-500/30">
            <Sliders className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <CardTitle className="text-md">API Connection Settings</CardTitle>
            <span className="text-xs text-zinc-500 block">Configure the endpoints of the running FastAPI backend</span>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4 text-xs text-zinc-300">
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-semibold">Backend API Endpoint Gateway</label>
            <div className="flex gap-3">
              <Input
                placeholder="http://localhost:8000"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="bg-zinc-950/40 border-zinc-800 text-white font-mono text-xs flex-grow"
              />
              <Button
                className="bg-purple-600 hover:bg-purple-500 text-white"
                onClick={handleSaveSettings}
              >
                Save config
              </Button>
            </div>
            <span className="text-[10px] text-zinc-500 block mt-1">
              Saving config will restart the client interceptors and reload the viewport.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── NOTIFICATION PREFERENCES ── */}
      <Card className="glass-panel text-white border-zinc-800">
        <CardHeader className="flex flex-row items-center space-x-3.5 border-b border-zinc-800/60">
          <div className="p-2 bg-emerald-500/20 rounded-full border border-emerald-500/30">
            <BellRing className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <CardTitle className="text-md">Notification Channels</CardTitle>
            <span className="text-xs text-zinc-500 block">Manage incident notifications and pipeline webhook alerts</span>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4 text-xs text-zinc-300">
          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyIncidents}
                onChange={(e) => setNotifyIncidents(e.target.checked)}
                className="rounded border-zinc-800 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-zinc-300">Alert me immediately on Critical Incidents (bell indicator active)</span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyBuilds}
                onChange={(e) => setNotifyBuilds(e.target.checked)}
                className="rounded border-zinc-800 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-zinc-300">Email digest reports weekly for CI/CD build success/failures</span>
            </label>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
