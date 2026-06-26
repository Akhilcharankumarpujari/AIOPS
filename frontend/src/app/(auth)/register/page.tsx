'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/toast-context';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName || !password || !confirmPassword) {
      toast('Error', 'Please fill in all fields', 'error');
      return;
    }

    if (password.length < 8) {
      toast('Error', 'Password must be at least 8 characters long', 'error');
      return;
    }

    if (password !== confirmPassword) {
      toast('Error', 'Passwords do not match', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await register({ email, full_name: fullName, password });
      toast('Success', 'Account created successfully', 'success');
      router.push('/dashboard');
    } catch (err) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const errMsg = error.response?.data?.error?.message || 'Failed to register account';
      toast('Registration Failed', errMsg, 'error');
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
        <CardDescription className="text-zinc-400">Join the AIOps platform to deploy and monitor</CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300">Full Name</label>
            <Input
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-zinc-950/50 border-zinc-800 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-purple-500"
              disabled={submitting}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300">Email Address</label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-950/50 border-zinc-800 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-purple-500"
              disabled={submitting}
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300">Password</label>
            <Input
              type="password"
              placeholder="•••••••• (Min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-zinc-950/50 border-zinc-800 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-purple-500"
              disabled={submitting}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300">Confirm Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {submitting ? 'Creating account...' : 'Create Account'}
          </Button>
          
          <div className="text-center text-xs text-zinc-400">
            Already have an account?{' '}
            <Link href="/login" className="text-purple-400 hover:underline">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
