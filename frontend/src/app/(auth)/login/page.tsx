'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/toast-context';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast('Error', 'Please fill in all fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await login({ email, password });
      toast('Success', 'Successfully logged in', 'success');
      router.push('/dashboard');
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Invalid credentials';
      toast('Login Failed', errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="glass-panel text-white glow-active border-zinc-800">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-2">
          <div className="p-2 bg-purple-500/20 rounded-full border border-purple-500/30">
            <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">AIOps Portal</CardTitle>
        <CardDescription className="text-zinc-400">Sign in to monitor and manage your services</CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300">Email Address</label>
            <Input
              type="email"
              placeholder="admin@aiops.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-950/50 border-zinc-800 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-purple-500"
              disabled={submitting}
              required
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-zinc-300">Password</label>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-zinc-950/50 border-zinc-800 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-purple-500"
              disabled={submitting}
              required
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium"
            disabled={submitting}
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </Button>
          
          <div className="text-center text-xs text-zinc-400">
            Don't have an account?{' '}
            <Link href="/register" className="text-purple-400 hover:underline">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
