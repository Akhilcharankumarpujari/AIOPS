'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-white p-6 text-center space-y-4">
      <div className="p-4 bg-purple-500/10 rounded-full border border-purple-500/20 glow-active">
        <ShieldAlert className="h-10 w-10 text-purple-400" />
      </div>
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-100">404 - Page Not Found</h2>
        <p className="text-sm text-zinc-500 max-w-sm">
          The dashboard resource or endpoint you requested cannot be located in the current layout.
        </p>
      </div>
      <Link href="/dashboard">
        <Button className="bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs">
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
}
