// Role and Permission Management for CareConnect Admin

export type Permission = 
  // Dashboard permissions
  | 'view_dashboard'
  | 'view_analytics'
  
  // User management permissions
  | 'view_users'
  | 'edit_users'
  | 'delete_users'
  | 'suspend_users'
  
  // Provider management permissions
  | 'view_providers'
  | 'edit_providers'
  | 'verify_providers'
  | 'suspend_providers'
  
  // Service request permissions
  | 'view_requests'
  | 'manage_requests'
  | 'assign_providers'
  | 'cancel_requests'
  
  // Emergency management permissions
  | 'view_emergencies'
  | 'manage_emergencies'
  | 'respond_emergencies'
  
  // Financial permissions
  | 'view_payments'
  | 'manage_payments'
  | 'process_refunds'
  | 'view_financial_reports'
  
  // Settings permissions
  | 'view_settings'
  | 'manage_settings'
  | 'manage_integrations'
  
  // Admin team permissions
  | 'view_admin_team'
  | 'manage_admin_team'
  | 'manage_roles'
  | 'assign_roles';

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystemRole: boolean; // Cannot be deleted
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  roleId: string;
  roleName: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  lastLoginAt?: string;
  createdBy?: string;
}

// Predefined system roles
export const SYSTEM_ROLES: Omit<Role, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'super_admin',
    name: 'Super Admin',
    description: 'Full access to all features and settings. Can manage admin team and roles.',
    isSystemRole: true,
    permissions: [
      'view_dashboard',
      'view_analytics',
      'view_users',
      'edit_users',
      'delete_users',
      'suspend_users',
      'view_providers',
      'edit_providers',
      'verify_providers',
      'suspend_providers',
      'view_requests',
      'manage_requests',
      'assign_providers',
      'cancel_requests',
      'view_emergencies',
      'manage_emergencies',
      'respond_emergencies',
      'view_payments',
      'manage_payments',
      'process_refunds',
      'view_financial_reports',
      'view_settings',
      'manage_settings',
      'manage_integrations',
      'view_admin_team',
      'manage_admin_team',
      'manage_roles',
      'assign_roles',
    ],
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Can manage users, providers, and service requests. Cannot modify settings or admin team.',
    isSystemRole: true,
    permissions: [
      'view_dashboard',
      'view_analytics',
      'view_users',
      'edit_users',
      'suspend_users',
      'view_providers',
      'edit_providers',
      'verify_providers',
      'suspend_providers',
      'view_requests',
      'manage_requests',
      'assign_providers',
      'cancel_requests',
      'view_emergencies',
      'manage_emergencies',
      'respond_emergencies',
      'view_payments',
      'manage_payments',
    ],
  },
  {
    id: 'moderator',
    name: 'Moderator',
    description: 'Can view and manage service requests and emergencies. Limited user management.',
    isSystemRole: true,
    permissions: [
      'view_dashboard',
      'view_users',
      'view_providers',
      'view_requests',
      'manage_requests',
      'assign_providers',
      'view_emergencies',
      'manage_emergencies',
      'respond_emergencies',
      'view_payments',
    ],
  },
  {
    id: 'support',
    name: 'Support Agent',
    description: 'Can view data and respond to emergencies. Cannot make changes to users or settings.',
    isSystemRole: true,
    permissions: [
      'view_dashboard',
      'view_users',
      'view_providers',
      'view_requests',
      'view_emergencies',
      'respond_emergencies',
      'view_payments',
    ],
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to dashboard and reports. Cannot make any changes.',
    isSystemRole: true,
    permissions: [
      'view_dashboard',
      'view_analytics',
      'view_users',
      'view_providers',
      'view_requests',
      'view_emergencies',
      'view_payments',
      'view_financial_reports',
    ],
  },
];

// Permission descriptions for UI
export const PERMISSION_CATEGORIES = {
  'Dashboard': [
    { permission: 'view_dashboard' as Permission, label: 'View Dashboard', description: 'Access to main dashboard' },
    { permission: 'view_analytics' as Permission, label: 'View Analytics', description: 'Access to analytics and reports' },
  ],
  'User Management': [
    { permission: 'view_users' as Permission, label: 'View Users', description: 'View client profiles' },
    { permission: 'edit_users' as Permission, label: 'Edit Users', description: 'Edit client information' },
    { permission: 'delete_users' as Permission, label: 'Delete Users', description: 'Delete client accounts' },
    { permission: 'suspend_users' as Permission, label: 'Suspend Users', description: 'Suspend/unsuspend clients' },
  ],
  'Provider Management': [
    { permission: 'view_providers' as Permission, label: 'View Providers', description: 'View provider profiles' },
    { permission: 'edit_providers' as Permission, label: 'Edit Providers', description: 'Edit provider information' },
    { permission: 'verify_providers' as Permission, label: 'Verify Providers', description: 'Verify provider credentials' },
    { permission: 'suspend_providers' as Permission, label: 'Suspend Providers', description: 'Suspend/unsuspend providers' },
  ],
  'Service Requests': [
    { permission: 'view_requests' as Permission, label: 'View Requests', description: 'View service requests' },
    { permission: 'manage_requests' as Permission, label: 'Manage Requests', description: 'Update request status' },
    { permission: 'assign_providers' as Permission, label: 'Assign Providers', description: 'Assign providers to requests' },
    { permission: 'cancel_requests' as Permission, label: 'Cancel Requests', description: 'Cancel service requests' },
  ],
  'Emergency Management': [
    { permission: 'view_emergencies' as Permission, label: 'View Emergencies', description: 'View emergency alerts' },
    { permission: 'manage_emergencies' as Permission, label: 'Manage Emergencies', description: 'Update emergency status' },
    { permission: 'respond_emergencies' as Permission, label: 'Respond to Emergencies', description: 'Respond to emergency alerts' },
  ],
  'Financial': [
    { permission: 'view_payments' as Permission, label: 'View Payments', description: 'View payment transactions' },
    { permission: 'manage_payments' as Permission, label: 'Manage Payments', description: 'Process payments' },
    { permission: 'process_refunds' as Permission, label: 'Process Refunds', description: 'Issue refunds' },
    { permission: 'view_financial_reports' as Permission, label: 'View Financial Reports', description: 'Access financial reports' },
  ],
  'Settings': [
    { permission: 'view_settings' as Permission, label: 'View Settings', description: 'View platform settings' },
    { permission: 'manage_settings' as Permission, label: 'Manage Settings', description: 'Update platform settings' },
    { permission: 'manage_integrations' as Permission, label: 'Manage Integrations', description: 'Configure integrations' },
  ],
  'Admin Team': [
    { permission: 'view_admin_team' as Permission, label: 'View Admin Team', description: 'View admin team members' },
    { permission: 'manage_admin_team' as Permission, label: 'Manage Admin Team', description: 'Add/edit/remove admin users' },
    { permission: 'manage_roles' as Permission, label: 'Manage Roles', description: 'Create and edit roles' },
    { permission: 'assign_roles' as Permission, label: 'Assign Roles', description: 'Assign roles to admin users' },
  ],
};

// Check if user has permission
export function hasPermission(userPermissions: Permission[], permission: Permission): boolean {
  return userPermissions.includes(permission);
}

// Check if user has any of the permissions
export function hasAnyPermission(userPermissions: Permission[], permissions: Permission[]): boolean {
  return permissions.some(p => userPermissions.includes(p));
}

// Check if user has all of the permissions
export function hasAllPermissions(userPermissions: Permission[], permissions: Permission[]): boolean {
  return permissions.every(p => userPermissions.includes(p));
}

// Get permission label
export function getPermissionLabel(permission: Permission): string {
  for (const category in PERMISSION_CATEGORIES) {
    const perm = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES]
      .find(p => p.permission === permission);
    if (perm) return perm.label;
  }
  return permission;
}
