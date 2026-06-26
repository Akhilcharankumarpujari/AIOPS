'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-white p-6 text-center space-y-4">
      <div className="p-4 bg-red-500/10 rounded-full border border-red-500/20">
        <ShieldAlert className="h-10 w-10 text-red-400" />
      </div>
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-100">500 - Application Error</h2>
        <p className="text-sm text-zinc-500 max-w-sm">
          An unhandled error occurred in the frontend application shell.
        </p>
        {error.message && (
          <pre className="p-3 mt-4 bg-zinc-950/80 border border-zinc-900 rounded text-[10px] text-zinc-400 font-mono select-all max-w-lg truncate">
            {error.message}
          </pre>
        )}
      </div>
      <div className="flex gap-3">
        <Button
          className="bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs"
          onClick={() => reset()}
        >
          Try Again
        </Button>
        <Button
          variant="outline"
          className="border-zinc-800 text-zinc-400 hover:text-white text-xs"
          onClick={() => (window.location.href = '/dashboard')}
        >
          Return Home
        </Button>
      </div>
    </div>
  );
}
