import React, { useState, useEffect } from 'react';
import { Users, Shield, Plus, Edit2, Trash2, UserCog, Key, Loader2, Save, X, CheckCircle2, XCircle, KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { admin } from '../utils/api';
import { toast } from 'sonner';
import type { Role, AdminUser } from '../utils/permissions';

export function AdminTeamManagement() {
  const [loading, setLoading] = useState(true);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [currentTab, setCurrentTab] = useState('team');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersResponse, rolesResponse] = await Promise.all([
        admin.getAdminTeam(),
        admin.getRoles(),
      ]);
      
      setAdminUsers(usersResponse.users || []);
      setRoles(rolesResponse.roles || []);
    } catch (error: any) {
      console.error('Error loading admin team:', error);
      toast.error('Failed to load admin team data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this admin user? This action cannot be undone.')) {
      return;
    }

    try {
      await admin.deleteAdminUser(userId);
      toast.success('Admin user deleted successfully');
      loadData();
    } catch (error: any) {
      console.error('Error deleting admin user:', error);
      toast.error(error.message || 'Failed to delete admin user');
    }
  };

  const handleFixMetadata = async () => {
    if (!confirm('This will update all admin users to ensure they can log in correctly. Continue?')) {
      return;
    }

    try {
      const result = await admin.fixAdminMetadata();
      toast.success(`Fixed metadata for ${result.fixedCount} admin user(s)`);
      if (result.errors && result.errors.length > 0) {
        console.error('Some users had errors:', result.errors);
        toast.error(`${result.errors.length} user(s) had errors. Check console for details.`);
      }
    } catch (error: any) {
      console.error('Error fixing metadata:', error);
      toast.error(error.message || 'Failed to fix metadata');
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    
    try {
      await admin.updateAdminUser(userId, { status: newStatus });
      toast.success(`Admin user ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
      loadData();
    } catch (error: any) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-purple-900">Admin Team Management</h3>
          <p className="text-gray-600">Manage admin users and roles with granular permissions</p>
        </div>
        <Shield className="w-8 h-8 text-purple-600" />
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="team">
            <Users className="w-4 h-4 mr-2" />
            Admin Team
          </TabsTrigger>
          <TabsTrigger value="roles">
            <Key className="w-4 h-4 mr-2" />
            Roles & Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <Alert>
              <AlertDescription>
                <strong>{adminUsers.length}</strong> admin user{adminUsers.length !== 1 ? 's' : ''} in the team
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button
                onClick={handleFixMetadata}
                variant="outline"
                className="text-orange-600 border-orange-600 hover:bg-orange-50"
              >
                <Shield className="w-4 h-4 mr-2" />
                Fix Login Issues
              </Button>
              <Button
                onClick={() => setIsAddUserDialogOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Admin User
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {adminUsers.map((user) => (
              <Card key={user.id} className="border-2 border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                          <UserCog className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="text-purple-900">{user.name}</h4>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-4">
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'} className="bg-purple-100 text-purple-900">
                          <Shield className="w-3 h-3 mr-1" />
                          {user.roleName}
                        </Badge>
                        
                        <Badge variant={user.status === 'active' ? 'default' : 'destructive'} className={user.status === 'active' ? 'bg-green-100 text-green-900' : ''}>
                          {user.status === 'active' ? (
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                          ) : (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </Badge>

                        <span className="text-sm text-gray-500">
                          Added {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setIsEditUserDialogOpen(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setIsResetPasswordDialogOpen(true);
                        }}
                        className="text-blue-600 border-blue-600"
                        title="Reset Password"
                      >
                        <KeyRound className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleUserStatus(user.id, user.status)}
                        className={user.status === 'active' ? 'text-orange-600 border-orange-600' : 'text-green-600 border-green-600'}
                      >
                        {user.status === 'active' ? 'Suspend' : 'Activate'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 border-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {adminUsers.length === 0 && (
              <Card className="border-2 border-dashed border-gray-300">
                <CardContent className="p-12 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No admin users yet</p>
                  <p className="text-sm text-gray-500 mt-2">Add your first admin user to get started</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4 mt-6">
          <RolesManagement roles={roles} onUpdate={loadData} />
        </TabsContent>
      </Tabs>

      <AddUserDialog
        open={isAddUserDialogOpen}
        onClose={() => setIsAddUserDialogOpen(false)}
        roles={roles}
        onSuccess={loadData}
      />

      <EditUserDialog
        open={isEditUserDialogOpen}
        onClose={() => {
          setIsEditUserDialogOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        roles={roles}
        onSuccess={loadData}
      />

      <ResetPasswordDialog
        open={isResetPasswordDialogOpen}
        onClose={() => {
          setIsResetPasswordDialogOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSuccess={loadData}
      />
    </div>
  );
}

function RolesManagement({ roles, onUpdate }: { roles: Role[]; onUpdate: () => void }) {
  return (
    <div className="grid gap-4">
      {roles.map((role) => (
        <Card key={role.id} className={`border-2 ${role.isSystemRole ? 'border-purple-200 bg-purple-50/30' : 'border-gray-200'}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Key className="w-6 h-6 text-purple-600" />
                <div>
                  <CardTitle className="text-purple-900">{role.name}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                </div>
              </div>
              {role.isSystemRole && (
                <Badge className="bg-purple-600 text-white">System Role</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label className="text-sm">Permissions ({role.permissions.length})</Label>
              <div className="flex flex-wrap gap-2">
                {role.permissions.slice(0, 8).map((permission) => (
                  <Badge key={permission} variant="outline" className="text-xs">
                    {permission.replace(/_/g, ' ')}
                  </Badge>
                ))}
                {role.permissions.length > 8 && (
                  <Badge variant="outline" className="text-xs">
                    +{role.permissions.length - 8} more
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AddUserDialog({
  open,
  onClose,
  roles,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  roles: Role[];
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roleId: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password || !formData.roleId) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      setSaving(true);
      await admin.createAdminUser(formData);
      toast.success('Admin user added successfully');
      setFormData({ name: '', email: '', password: '', roleId: '' });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding admin user:', error);
      toast.error(error.message || 'Failed to add admin user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Admin User</DialogTitle>
          <DialogDescription>
            Create a new admin user and assign them a role
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Min. 8 characters"
              className="h-12"
            />
            <p className="text-xs text-gray-500">Must be at least 8 characters long</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={formData.roleId} onValueChange={(value) => setFormData({ ...formData, roleId: value })}>
              <SelectTrigger id="role" className="h-12">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name} - {role.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  open,
  onClose,
  user,
  roles,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  user: AdminUser | null;
  roles: Role[];
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    roleId: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        roleId: user.roleId,
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !formData.name || !formData.roleId) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setSaving(true);
      await admin.updateAdminUser(user.id, formData);
      toast.success('Admin user updated successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating admin user:', error);
      toast.error(error.message || 'Failed to update admin user');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Admin User</DialogTitle>
          <DialogDescription>
            Update admin user information and role
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Full Name</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email Address</Label>
            <Input
              id="edit-email"
              type="email"
              value={user.email}
              disabled
              className="h-12 bg-gray-100"
            />
            <p className="text-xs text-gray-500">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-role">Role</Label>
            <Select value={formData.roleId} onValueChange={(value) => setFormData({ ...formData, roleId: value })}>
              <SelectTrigger id="edit-role" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name} - {role.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  open,
  onClose,
  user,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  user: AdminUser | null;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    password: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        password: '',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      setSaving(true);
      await admin.resetAdminUserPassword(user.id, formData);
      toast.success('Admin user password reset successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error resetting admin user password:', error);
      toast.error(error.message || 'Failed to reset admin user password');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Admin User Password</DialogTitle>
          <DialogDescription>
            Reset the password for {user.name} ({user.email})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-900 text-sm">
              The user will be able to log in with the new password immediately after reset.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="reset-password">New Password</Label>
            <Input
              id="reset-password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Min. 8 characters"
              className="h-12"
            />
            <p className="text-xs text-gray-500">Must be at least 8 characters long</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 mr-2" />
                  Reset Password
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}