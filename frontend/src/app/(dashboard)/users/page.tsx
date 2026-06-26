'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '@/services/users.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/contexts/toast-context';
import { Users, UserPlus, Shield, UserMinus, UserCheck, Calendar } from 'lucide-react';

export default function UserAdminPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [roleName, setRoleName] = useState('Viewer');

  const [editRolesUser, setEditRolesUser] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [rolesDialogOpen, setRolesDialogOpen] = useState(false);

  // --- QUERY HOOKS ---
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersService.listUsers,
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: usersService.listRoles,
  });

  // --- MUTATION HOOKS ---
  const createUserMutation = useMutation({
    mutationFn: (payload: { email: string; full_name: string; roleName: string }) =>
      usersService.createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreateUserOpen(false);
      setEmail('');
      setFullName('');
      toast('Success', 'User created successfully (Local Storage Simulator)', 'success');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'disabled' }) =>
      usersService.updateUserStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast('Success', 'User status updated successfully', 'success');
    },
  });

  const updateRolesMutation = useMutation({
    mutationFn: ({ id, roleNames }: { id: string; roleNames: string[] }) =>
      usersService.updateUserRoles(id, roleNames),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setRolesDialogOpen(false);
      toast('Success', 'User roles updated successfully', 'success');
    },
  });

  // --- HANDLERS ---
  const handleOpenRolesDialog = (userId: string, currentRoles: string[]) => {
    setEditRolesUser(userId);
    setSelectedRoles(currentRoles);
    setRolesDialogOpen(true);
  };

  const handleRoleCheckboxChange = (name: string, checked: boolean) => {
    if (checked) {
      setSelectedRoles((prev) => [...prev, name]);
    } else {
      setSelectedRoles((prev) => prev.filter((r) => r !== name));
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ── HEADER ROW ── */}
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-purple-400" />
          <span className="text-sm font-semibold text-zinc-300">Simulated RBAC Directory</span>
        </div>
        <Button
          className="bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-2 text-xs h-9"
          onClick={() => setCreateUserOpen(true)}
        >
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* ── USERS TABLE ── */}
      <Card className="glass-panel text-white border-zinc-800">
        <CardHeader>
          <span className="text-md font-semibold">User Access Control Directory</span>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="h-40 flex items-center justify-center text-zinc-500">Loading directory records...</div>
          ) : !users || users.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-zinc-500">No users configured.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="py-3 px-4 font-semibold">Full Name</th>
                  <th className="py-3 px-4 font-semibold">Email</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Roles</th>
                  <th className="py-3 px-4 font-semibold">Created At</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                    <td className="py-3 px-4 font-semibold text-zinc-200">{u.full_name}</td>
                    <td className="py-3 px-4 text-zinc-400 font-mono">{u.email}</td>
                    <td className="py-3 px-4">
                      <Badge variant={u.status === 'active' ? 'success' : 'destructive'}>{u.status}</Badge>
                    </td>
                    <td className="py-3 px-4 space-x-1">
                      {u.roles.map((r) => (
                        <Badge key={r.id} variant="outline" className="border-purple-500/20 text-purple-400">
                          {r.name}
                        </Badge>
                      ))}
                    </td>
                    <td className="py-3 px-4 text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(u.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <Button
                        variant="outline"
                        size="xs"
                        className="h-6 text-[10px] border-zinc-800 text-zinc-400 hover:text-white"
                        onClick={() => handleOpenRolesDialog(u.id, u.roles.map((r) => r.name))}
                      >
                        <Shield className="h-3.5 w-3.5 mr-1" />
                        Roles
                      </Button>
                      
                      {u.status === 'active' ? (
                        <Button
                          size="xs"
                          className="h-6 text-[10px] bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white"
                          onClick={() => toggleStatusMutation.mutate({ id: u.id, status: 'disabled' })}
                        >
                          <UserMinus className="h-3.5 w-3.5 mr-1" />
                          Disable
                        </Button>
                      ) : (
                        <Button
                          size="xs"
                          className="h-6 text-[10px] bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white"
                          onClick={() => toggleStatusMutation.mutate({ id: u.id, status: 'active' })}
                        >
                          <UserCheck className="h-3.5 w-3.5 mr-1" />
                          Enable
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ── CREATE USER DIALOG ── */}
      <Dialog
        isOpen={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        title="Add Simulated User"
        footer={
          <>
            <Button
              variant="outline"
              className="border-zinc-800 text-zinc-400 hover:text-white"
              onClick={() => setCreateUserOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-500 text-white"
              onClick={() =>
                createUserMutation.mutate({
                  email,
                  full_name: fullName,
                  roleName,
                })
              }
            >
              Add User
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500">Full Name:</label>
            <Input
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-zinc-950/40 border-zinc-800 text-white text-xs"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500">Email Address:</label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-950/40 border-zinc-800 text-white text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500">Access Role:</label>
            <Select
              options={(roles || []).map((r) => ({ value: r.name, label: r.name }))}
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              className="w-full bg-zinc-950/40 border-zinc-800 text-white text-xs"
            />
          </div>
        </div>
      </Dialog>

      {/* ── EDIT USER ROLES DIALOG ── */}
      <Dialog
        isOpen={rolesDialogOpen}
        onClose={() => setRolesDialogOpen(false)}
        title="Manage User Roles"
        footer={
          <>
            <Button
              variant="outline"
              className="border-zinc-800 text-zinc-400 hover:text-white"
              onClick={() => setRolesDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-500 text-white"
              onClick={() =>
                updateRolesMutation.mutate({
                  id: editRolesUser!,
                  roleNames: selectedRoles,
                })
              }
            >
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-zinc-300 text-xs">Assign roles for this simulated user account:</p>
          <div className="space-y-2">
            {(roles || []).map((r) => (
              <label key={r.id} className="flex items-start space-x-3 p-2.5 rounded bg-zinc-950/40 border border-zinc-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(r.name)}
                  onChange={(e) => handleRoleCheckboxChange(r.name, e.target.checked)}
                  className="rounded border-zinc-800 text-purple-600 focus:ring-purple-500 mt-0.5"
                />
                <div className="text-xs">
                  <span className="font-semibold text-zinc-200 block">{r.name}</span>
                  <span className="text-zinc-500 block mt-0.5">{r.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      </Dialog>

    </div>
  );
}
