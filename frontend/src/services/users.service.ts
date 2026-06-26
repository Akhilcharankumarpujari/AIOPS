import { User, Role } from '@/types';

// Prepopulated simulator state
const DEFAULT_ROLES: Role[] = [
  { id: '1', name: 'Admin', description: 'Full access to all modules and actions.' },
  { id: '2', name: 'SRE', description: 'Manage Kubernetes and Jenkins, view logs and metrics.' },
  { id: '3', name: 'Developer', description: 'View logs, metrics, trigger Jenkins builds, view incidents.' },
  { id: '4', name: 'Viewer', description: 'Read-only access to dashboards, logs, and metrics.' },
];

const DEFAULT_USERS: User[] = [
  {
    id: 'u1',
    email: 'admin@aiops.com',
    full_name: 'Admin User',
    status: 'active',
    is_verified: true,
    roles: [DEFAULT_ROLES[0]],
    permissions: ['ai:analyze', 'ai:read', 'alerts:read', 'alerts:write', 'incidents:read', 'incidents:write', 'jenkins:read', 'jenkins:write', 'kubernetes:read', 'kubernetes:write', 'loki:read', 'prometheus:read'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'u2',
    email: 'sre@aiops.com',
    full_name: 'SRE Specialist',
    status: 'active',
    is_verified: true,
    roles: [DEFAULT_ROLES[1]],
    permissions: ['alerts:read', 'incidents:read', 'incidents:write', 'jenkins:read', 'jenkins:write', 'kubernetes:read', 'kubernetes:write', 'loki:read', 'prometheus:read'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'u3',
    email: 'dev@aiops.com',
    full_name: 'Lead Developer',
    status: 'active',
    is_verified: true,
    roles: [DEFAULT_ROLES[2]],
    permissions: ['incidents:read', 'jenkins:read', 'jenkins:write', 'kubernetes:read', 'loki:read', 'prometheus:read'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'u4',
    email: 'viewer@aiops.com',
    full_name: 'Guest Viewer',
    status: 'active',
    is_verified: true,
    roles: [DEFAULT_ROLES[3]],
    permissions: ['kubernetes:read', 'loki:read', 'prometheus:read'],
    created_at: new Date().toISOString(),
  },
];

const getStoredUsers = (): User[] => {
  if (typeof window === 'undefined') return DEFAULT_USERS;
  const stored = localStorage.getItem('simulated_users');
  if (stored) return JSON.parse(stored);
  localStorage.setItem('simulated_users', JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
};

const saveStoredUsers = (users: User[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('simulated_users', JSON.stringify(users));
  }
};

export const usersService = {
  listUsers: async (): Promise<User[]> => {
    return getStoredUsers();
  },

  createUser: async (payload: { email: string; full_name: string; roleName: string }): Promise<User> => {
    const users = getStoredUsers();
    const role = DEFAULT_ROLES.find((r) => r.name.toLowerCase() === payload.roleName.toLowerCase()) || DEFAULT_ROLES[3];
    
    // Simple permission mappings for simulator
    const permissionsMap: Record<string, string[]> = {
      admin: ['ai:analyze', 'ai:read', 'alerts:read', 'alerts:write', 'incidents:read', 'incidents:write', 'jenkins:read', 'jenkins:write', 'kubernetes:read', 'kubernetes:write', 'loki:read', 'prometheus:read'],
      sre: ['alerts:read', 'incidents:read', 'incidents:write', 'jenkins:read', 'jenkins:write', 'kubernetes:read', 'kubernetes:write', 'loki:read', 'prometheus:read'],
      developer: ['incidents:read', 'jenkins:read', 'jenkins:write', 'kubernetes:read', 'loki:read', 'prometheus:read'],
      viewer: ['kubernetes:read', 'loki:read', 'prometheus:read'],
    };

    const newUser: User = {
      id: Math.random().toString(36).substring(2, 9),
      email: payload.email,
      full_name: payload.full_name,
      status: 'active',
      is_verified: true,
      roles: [role],
      permissions: permissionsMap[role.name.toLowerCase()] || permissionsMap.viewer,
      created_at: new Date().toISOString(),
    };

    users.push(newUser);
    saveStoredUsers(users);
    return newUser;
  },

  updateUserStatus: async (id: string, status: 'active' | 'disabled'): Promise<User> => {
    const users = getStoredUsers();
    const user = users.find((u) => u.id === id);
    if (!user) throw new Error('User not found');
    user.status = status;
    saveStoredUsers(users);
    return user;
  },

  updateUserRoles: async (id: string, roleNames: string[]): Promise<User> => {
    const users = getStoredUsers();
    const user = users.find((u) => u.id === id);
    if (!user) throw new Error('User not found');

    const newRoles = DEFAULT_ROLES.filter((r) => roleNames.includes(r.name));
    user.roles = newRoles;
    
    // Combine permissions for mapped roles
    const permissionsMap: Record<string, string[]> = {
      admin: ['ai:analyze', 'ai:read', 'alerts:read', 'alerts:write', 'incidents:read', 'incidents:write', 'jenkins:read', 'jenkins:write', 'kubernetes:read', 'kubernetes:write', 'loki:read', 'prometheus:read'],
      sre: ['alerts:read', 'incidents:read', 'incidents:write', 'jenkins:read', 'jenkins:write', 'kubernetes:read', 'kubernetes:write', 'loki:read', 'prometheus:read'],
      developer: ['incidents:read', 'jenkins:read', 'jenkins:write', 'kubernetes:read', 'loki:read', 'prometheus:read'],
      viewer: ['kubernetes:read', 'loki:read', 'prometheus:read'],
    };

    const uniquePerms = new Set<string>();
    newRoles.forEach((r) => {
      const perms = permissionsMap[r.name.toLowerCase()] || [];
      perms.forEach((p) => uniquePerms.add(p));
    });

    user.permissions = Array.from(uniquePerms);
    saveStoredUsers(users);
    return user;
  },

  listRoles: async (): Promise<Role[]> => {
    return DEFAULT_ROLES;
  },
};
