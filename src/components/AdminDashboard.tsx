import React, { useState, useEffect } from 'react';
import { Shield, Users, Briefcase, LogOut, TrendingUp, AlertCircle, Settings, UserCog, Star, Mail, MessageSquare, Plus, Calendar, Trash2, Cog } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { DataGrid } from './DataGrid';
import { ClientDetailPage } from './ClientDetailPage';
import { ProviderDetailPage } from './ProviderDetailPage';
import { AdminUserDetailPage } from './AdminUserDetailPage';
import { ServiceManagement } from './ServiceManagement';
import { ReviewsManagement } from './ReviewsManagement';
import { AdminSettings } from './AdminSettings';
import { AdminTeamManagement } from './AdminTeamManagement';
import { CreateClientForm } from './CreateClientForm';
import { CreateProviderForm } from './CreateProviderForm';
import { CreateAdminForm } from './CreateAdminForm';
import { AdminBookServiceForm } from './AdminBookServiceForm';
import { EmergencyAlerts } from './EmergencyAlerts';
import { admin, client as apiClient } from '../utils/api';
import { toast } from 'sonner@2.0.3';
import { useCurrency } from '../utils/currency';

interface AdminDashboardProps {
  onLogout: () => void;
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const { currencySymbol } = useCurrency();
  const [activeTab, setActiveTab] = useState('overview');
  const [clients, setClients] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adminTeamCount, setAdminTeamCount] = useState(0);

  // Detail page state
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [selectedAdminUserId, setSelectedAdminUserId] = useState<string | null>(null);

  // Dialog state for creating users
  const [showCreateClientDialog, setShowCreateClientDialog] = useState(false);
  const [showCreateProviderDialog, setShowCreateProviderDialog] = useState(false);
  const [showCreateAdminDialog, setShowCreateAdminDialog] = useState(false);
  const [showBookServiceDialog, setShowBookServiceDialog] = useState(false);

  useEffect(() => {
    // Add a small delay to ensure token is set up
    const timer = setTimeout(() => {
      loadData();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Verify we have a token before making requests
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('No access token found in AdminDashboard');
        toast.error('Authentication required. Please log in again.');
        return;
      }

      const [clientsRes, providersRes, statsRes, teamRes] = await Promise.all([
        admin.getAllClients().catch((err) => {
          console.error('Error loading clients:', err);
          return { clients: [] };
        }),
        admin.getAllProviders().catch((err) => {
          console.error('Error loading providers:', err);
          return { providers: [] };
        }),
        admin.getStats().catch((err) => {
          console.error('Error loading stats:', err);
          return { stats: {} };
        }),
        admin.getAdminTeam().catch((err) => {
          console.error('Error loading admin team:', err);
          return { users: [] };
        }),
      ]);

      setClients(clientsRes.clients || []);
      setProviders(providersRes.providers || []);
      setStats(statsRes.stats || {});
      setAdminTeamCount((teamRes.users || []).length);
    } catch (err) {
      console.error('Error loading admin data:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveProvider = async (providerId: string) => {
    try {
      await admin.approveProvider(providerId);
      toast.success('Provider approved successfully');
      loadData();
      setSelectedProviderId(null);
    } catch (err) {
      console.error('Error approving provider:', err);
      toast.error('Failed to approve provider');
    }
  };

  const handleRejectProvider = async (providerId: string) => {
    try {
      const reason = prompt('Please enter rejection reason (optional):');
      await admin.rejectProvider(providerId, reason || undefined);
      toast.success('Provider rejected');
      loadData();
      setSelectedProviderId(null);
    } catch (err) {
      console.error('Error rejecting provider:', err);
      toast.error('Failed to reject provider');
    }
  };

  const handleContactProvider = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      window.location.href = `mailto:${provider.email}`;
    }
  };

  const handleToggleStatus = async (row: any) => {
    try {
      await admin.toggleUserStatus(row.id);
      toast.success(`User ${row.status === 'active' ? 'deactivated' : 'activated'} successfully`);
      loadData();
    } catch (err) {
      console.error('Error toggling user status:', err);
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteUser = async (row: any) => {
    if (!confirm(`Are you sure you want to delete ${row.name}? This action cannot be undone.`)) {
      return;
    }
    try {
      await admin.deleteUser(row.id);
      toast.success('User deleted successfully');
      loadData();
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Failed to delete user');
    }
  };

  const handleBlacklistProvider = async (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (!confirm(`Are you sure you want to blacklist ${provider?.name}? This will prevent them from accessing the platform.`)) {
      return;
    }
    try {
      const reason = prompt('Please enter reason for blacklisting (optional):');
      await admin.blacklistProvider(providerId, reason || undefined);
      toast.success('Provider blacklisted successfully');
      loadData();
      setSelectedProviderId(null);
    } catch (err) {
      console.error('Error blacklisting provider:', err);
      toast.error('Failed to blacklist provider');
    }
  };

  const handleRemoveBlacklist = async (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (!confirm(`Are you sure you want to remove blacklist from ${provider?.name}?`)) {
      return;
    }
    try {
      await admin.removeBlacklist(providerId);
      toast.success('Blacklist removed successfully');
      loadData();
      setSelectedProviderId(null);
    } catch (err) {
      console.error('Error removing blacklist:', err);
      toast.error('Failed to remove blacklist');
    }
  };

  const handleUnapproveProvider = async (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (!confirm(`Are you sure you want to unapprove ${provider?.name}? This will set them back to pending status.`)) {
      return;
    }
    try {
      await admin.unapproveProvider(providerId);
      toast.success('Provider unapproved successfully');
      loadData();
      setSelectedProviderId(null);
    } catch (err) {
      console.error('Error unapproving provider:', err);
      toast.error('Failed to unapprove provider');
    }
  };

  const handleEditProvider = (providerId: string) => {
    // For now, just open the detail page. In a real app, you'd have an edit form
    toast.info('Edit functionality - Opening provider details');
    setSelectedProviderId(providerId);
  };

  const handleClearAllData = async () => {
    const confirmed = confirm(
      '⚠️ WARNING: This will permanently delete ALL clients, providers, and related data (bookings, reviews, etc).\n\n' +
      'Admin users and services will be preserved.\n\n' +
      'This action CANNOT be undone!\n\n' +
      'Are you absolutely sure you want to continue?'
    );
    
    if (!confirmed) return;

    // Double confirmation
    const doubleConfirmed = confirm(
      'This is your FINAL WARNING!\n\n' +
      'All client and provider data will be PERMANENTLY DELETED.\n\n' +
      'Type YES in the next prompt to confirm.'
    );
    
    if (!doubleConfirmed) return;

    const userConfirmation = prompt('Type "DELETE ALL DATA" to confirm (case sensitive):');
    
    if (userConfirmation !== 'DELETE ALL DATA') {
      toast.error('Confirmation text does not match. Operation cancelled.');
      return;
    }

    try {
      toast.info('Deleting all data... This may take a moment.');
      const response = await admin.clearAllData();
      
      console.log('Clear data response:', response);
      
      toast.success(
        `Successfully deleted:\n` +
        `${response.deletedCount?.clients || 0} clients\n` +
        `${response.deletedCount?.providers || 0} providers\n` +
        `${response.deletedCount?.requests || 0} bookings\n` +
        `${response.deletedCount?.reviews || 0} reviews`,
        { duration: 8000 }
      );
      
      // Reload data
      loadData();
    } catch (err: any) {
      console.error('Error clearing data:', err);
      toast.error(err.message || 'Failed to clear data');
    }
  };

  // Get pending provider count
  const pendingProvidersCount = providers.filter(p => p.verificationStatus === 'pending').length;

  // Client columns
  const clientColumns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (value: any, row: any) => (
        <button
          onClick={() => setSelectedClientId(row.id)}
          className="text-blue-600 hover:text-blue-800 hover:underline text-left"
        >
          {value}
        </button>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
    },
    {
      key: 'phone',
      label: 'Phone',
      sortable: false,
      render: (value: any) => value || 'Not provided',
    },
    {
      key: 'createdAt',
      label: 'Joined',
      sortable: true,
      render: (value: any) => value ? new Date(value).toLocaleDateString() : 'N/A',
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: any) => (
        <Badge variant={value === 'active' ? 'default' : 'secondary'}>
          {value || 'active'}
        </Badge>
      ),
    },
  ];

  // Provider columns with rating and earnings
  const providerColumns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (value: any, row: any) => (
        <button
          onClick={() => setSelectedProviderId(row.id)}
          className="text-blue-600 hover:text-blue-800 hover:underline text-left"
        >
          {value}
        </button>
      ),
    },
    {
      key: 'specialty',
      label: 'Specialty',
      sortable: true,
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
    },
    {
      key: 'phone',
      label: 'Phone',
      sortable: false,
    },
    {
      key: 'verificationStatus',
      label: 'Verification',
      sortable: true,
      render: (value: any) => {
        const variants: Record<string, any> = {
          approved: 'default',
          pending: 'secondary',
          rejected: 'destructive',
        };
        const colors: Record<string, string> = {
          approved: 'bg-green-100 text-green-800 border-green-200',
          pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          rejected: 'bg-red-100 text-red-800 border-red-200',
        };
        return (
          <Badge className={colors[value] || colors.pending}>
            {value || 'pending'}
          </Badge>
        );
      },
    },
    {
      key: 'rating',
      label: 'Rating',
      sortable: true,
      render: (value: any, row: any) => {
        const rating = value || 0;
        const reviewCount = row.reviewCount || 0;
        return (
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span>{rating > 0 ? rating.toFixed(1) : 'N/A'}</span>
            {reviewCount > 0 && (
              <span className="text-xs text-gray-500">({reviewCount})</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'totalEarnings',
      label: 'Earnings',
      sortable: true,
      render: (value: any) => {
        const earnings = value || 0;
        return (
          <span className="text-green-700">
            {currencySymbol}{earnings.toLocaleString()}
          </span>
        );
      },
    },
    {
      key: 'jobCount',
      label: 'Jobs',
      sortable: true,
      render: (value: any) => value || 0,
    },
  ];

  // Admin user columns
  const adminUserColumns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (value: any, row: any) => (
        <button
          onClick={() => setSelectedAdminUserId(row.id)}
          className="text-blue-600 hover:text-blue-800 hover:underline text-left"
        >
          {value}
        </button>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (value: any) => (
        <Badge variant="outline">{value}</Badge>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (value: any) => value ? new Date(value).toLocaleDateString() : 'N/A',
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: any) => (
        <Badge variant={value === 'active' ? 'default' : 'secondary'}>
          {value || 'active'}
        </Badge>
      ),
    },
  ];

  // If a provider is selected, show full-page detail view
  if (selectedProviderId) {
    return (
      <div className="min-h-screen pb-20 bg-gradient-to-br from-purple-50 to-blue-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b-2 border-purple-100 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-purple-600" />
                <div>
                  <h2 className="text-purple-600">Admin Panel - Provider Details</h2>
                  <p className="text-sm text-gray-600">CareConnect Management</p>
                </div>
              </div>
              <Button 
                onClick={onLogout}
                variant="outline"
                className="flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6">
          <ProviderDetailPage
            providerId={selectedProviderId}
            onClose={() => setSelectedProviderId(null)}
            onApprove={handleApproveProvider}
            onReject={handleRejectProvider}
            onContact={handleContactProvider}
            onBlacklist={handleBlacklistProvider}
            onRemoveBlacklist={handleRemoveBlacklist}
            onUnapprove={handleUnapproveProvider}
            onEdit={handleEditProvider}
          />
        </div>
      </div>
    );
  }

  // If a client is selected, show full-page detail view
  if (selectedClientId) {
    return (
      <div className="min-h-screen pb-20 bg-gradient-to-br from-purple-50 to-blue-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b-2 border-purple-100 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-purple-600" />
                <div>
                  <h2 className="text-purple-600">Admin Panel - Client Details</h2>
                  <p className="text-sm text-gray-600">CareConnect Management</p>
                </div>
              </div>
              <Button 
                onClick={onLogout}
                variant="outline"
                className="flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6">
          <ClientDetailPage
            clientId={selectedClientId}
            onClose={() => setSelectedClientId(null)}
          />
        </div>
      </div>
    );
  }

  // If an admin user is selected, show full-page detail view
  if (selectedAdminUserId) {
    return (
      <div className="min-h-screen pb-20 bg-gradient-to-br from-purple-50 to-blue-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b-2 border-purple-100 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-purple-600" />
                <div>
                  <h2 className="text-purple-600">Admin Panel - Admin User Details</h2>
                  <p className="text-sm text-gray-600">CareConnect Management</p>
                </div>
              </div>
              <Button 
                onClick={onLogout}
                variant="outline"
                className="flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6">
          <AdminUserDetailPage
            userId={selectedAdminUserId}
            onClose={() => setSelectedAdminUserId(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-purple-100 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-purple-600" />
              <div>
                <h2 className="text-purple-600">Admin Panel</h2>
                <p className="text-sm text-gray-600">CareConnect Management</p>
              </div>
            </div>
            <Button 
              onClick={onLogout}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Tab Navigation */}
          <TabsList className="grid grid-cols-7 h-auto p-2 bg-white shadow-md">
            <TabsTrigger 
              value="overview" 
              className="flex flex-col gap-2 py-4 data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
            >
              <TrendingUp className="w-6 h-6" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger 
              value="emergencies" 
              className="flex flex-col gap-2 py-4 data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
            >
              <AlertCircle className="w-6 h-6" />
              <span>Emergencies</span>
            </TabsTrigger>
            <TabsTrigger 
              value="clients" 
              className="flex flex-col gap-2 py-4 data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
            >
              <Users className="w-6 h-6" />
              <span>Clients</span>
            </TabsTrigger>
            <TabsTrigger 
              value="providers" 
              className="flex flex-col gap-2 py-4 data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700 relative"
            >
              <Briefcase className="w-6 h-6" />
              <span>Providers</span>
              {pendingProvidersCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-1 text-xs">
                  {pendingProvidersCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="team" 
              className="flex flex-col gap-2 py-4 data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
            >
              <Shield className="w-6 h-6" />
              <span>Team & Roles</span>
            </TabsTrigger>
            <TabsTrigger 
              value="services" 
              className="flex flex-col gap-2 py-4 data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
            >
              <Settings className="w-6 h-6" />
              <span>Services</span>
            </TabsTrigger>
            <TabsTrigger 
              value="reviews" 
              className="flex flex-col gap-2 py-4 data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
            >
              <MessageSquare className="w-6 h-6" />
              <span>Reviews</span>
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="flex flex-col gap-2 py-4 data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
            >
              <Cog className="w-6 h-6" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="border-2 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Total Clients</p>
                      <p className="text-blue-900 text-3xl mt-1">{clients.length}</p>
                    </div>
                    <Users className="w-10 h-10 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Active Providers</p>
                      <p className="text-green-900 text-3xl mt-1">
                        {providers.filter(p => p.verificationStatus === 'approved').length}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Total: {providers.length}
                      </p>
                    </div>
                    <Briefcase className="w-10 h-10 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-yellow-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Pending Reviews</p>
                      <p className="text-yellow-900 text-3xl mt-1">{pendingProvidersCount}</p>
                    </div>
                    <AlertCircle className="w-10 h-10 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Admin Users</p>
                      <p className="text-purple-900 text-3xl mt-1">{adminTeamCount}</p>
                    </div>
                    <UserCog className="w-10 h-10 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pending Actions Alert */}
            {pendingProvidersCount > 0 && (
              <Card className="border-2 border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-900">
                    <AlertCircle className="w-6 h-6" />
                    Pending Provider Verifications ({pendingProvidersCount})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-yellow-800 mb-4">
                    You have {pendingProvidersCount} provider application{pendingProvidersCount !== 1 ? 's' : ''} waiting for review.
                  </p>
                  <Button onClick={() => setActiveTab('providers')}>
                    Review Applications
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="border-2 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <Calendar className="w-6 h-6" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <Button
                    onClick={() => setShowBookServiceDialog(true)}
                    className="bg-green-600 hover:bg-green-700 text-white h-20 flex-col gap-2"
                  >
                    <Calendar className="w-6 h-6" />
                    Book Service for Client
                  </Button>
                  <Button
                    onClick={() => setShowCreateClientDialog(true)}
                    variant="outline"
                    className="h-20 flex-col gap-2"
                  >
                    <Plus className="w-6 h-6" />
                    Add New Client
                  </Button>
                  <Button
                    onClick={() => setShowCreateProviderDialog(true)}
                    variant="outline"
                    className="h-20 flex-col gap-2"
                  >
                    <Plus className="w-6 h-6" />
                    Add New Provider
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Rated Providers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {providers
                      .filter(p => p.rating > 0)
                      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                      .slice(0, 5)
                      .map((provider, index) => (
                        <div key={provider.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">#{index + 1}</span>
                            <span className="text-sm">{provider.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm">{provider.rating?.toFixed(1)}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Earners</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {providers
                      .filter(p => p.totalEarnings > 0)
                      .sort((a, b) => (b.totalEarnings || 0) - (a.totalEarnings || 0))
                      .slice(0, 5)
                      .map((provider, index) => (
                        <div key={provider.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">#{index + 1}</span>
                            <span className="text-sm">{provider.name}</span>
                          </div>
                          <span className="text-sm text-green-700">
                            {currencySymbol}{provider.totalEarnings?.toLocaleString()}
                          </span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Most Active Providers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {providers
                      .filter(p => p.jobCount > 0)
                      .sort((a, b) => (b.jobCount || 0) - (a.jobCount || 0))
                      .slice(0, 5)
                      .map((provider, index) => (
                        <div key={provider.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">#{index + 1}</span>
                            <span className="text-sm">{provider.name}</span>
                          </div>
                          <span className="text-sm text-blue-700">
                            {provider.jobCount} jobs
                          </span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Danger Zone */}
            <Card className="border-2 border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <Trash2 className="w-6 h-6" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-red-800 mb-2">
                    ⚠️ <strong>Permanently delete all client and provider data</strong>
                  </p>
                  <p className="text-sm text-gray-700 mb-4">
                    This will delete all clients, providers, bookings, reviews, locations, and family members from the database.
                    Admin users and services will be preserved. This action CANNOT be undone!
                  </p>
                  <Button
                    onClick={handleClearAllData}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear All Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Emergency Alerts Tab */}
          <TabsContent value="emergencies" className="space-y-6">
            <EmergencyAlerts />
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Client Management</CardTitle>
                <Button
                  onClick={() => setShowCreateClientDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Client
                </Button>
              </CardHeader>
              <CardContent>
                <DataGrid
                  data={clients}
                  columns={clientColumns}
                  onView={(row) => setSelectedClientId(row.id)}
                  onToggleStatus={handleToggleStatus}
                  onDelete={handleDeleteUser}
                  searchPlaceholder="Search clients..."
                  filterOptions={[
                    {
                      key: 'status',
                      label: 'Status',
                      values: [
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                      ],
                    },
                  ]}
                  emptyMessage="No clients found"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Providers Tab - Merged with Verifications */}
          <TabsContent value="providers" className="space-y-6">
            {pendingProvidersCount > 0 && (
              <Card className="border-2 border-yellow-200 bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <span className="text-yellow-900">
                      {pendingProvidersCount} provider{pendingProvidersCount !== 1 ? 's' : ''} pending verification
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Provider Management & Verification</CardTitle>
                <Button
                  onClick={() => setShowCreateProviderDialog(true)}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Provider
                </Button>
              </CardHeader>
              <CardContent>
                <DataGrid
                  data={providers}
                  columns={providerColumns}
                  onView={(row) => setSelectedProviderId(row.id)}
                  onEdit={(row) => handleEditProvider(row.id)}
                  onApprove={(row) => handleApproveProvider(row.id)}
                  onUnapprove={(row) => handleUnapproveProvider(row.id)}
                  onReject={(row) => handleRejectProvider(row.id)}
                  onBlacklist={(row) => handleBlacklistProvider(row.id)}
                  onContact={(row) => handleContactProvider(row.id)}
                  onDelete={handleDeleteUser}
                  searchPlaceholder="Search providers..."
                  filterOptions={[
                    {
                      key: 'verificationStatus',
                      label: 'Verification Status',
                      values: [
                        { value: 'pending', label: 'Pending' },
                        { value: 'approved', label: 'Approved' },
                        { value: 'rejected', label: 'Rejected' },
                        { value: 'blacklisted', label: 'Blacklisted' },
                      ],
                    },
                    {
                      key: 'status',
                      label: 'Account Status',
                      values: [
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                      ],
                    },
                  ]}
                  emptyMessage="No providers found"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team & Roles Tab */}
          <TabsContent value="team" className="space-y-6">
            <AdminTeamManagement />
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">
            <ServiceManagement />
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6">
            <ReviewsManagement />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <AdminSettings />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create User Dialogs */}
      <Dialog open={showCreateClientDialog} onOpenChange={setShowCreateClientDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Client Account</DialogTitle>
            <DialogDescription>
              Create a new client account with login credentials. The user should change their password on first login.
            </DialogDescription>
          </DialogHeader>
          <CreateClientForm
            onSuccess={() => {
              setShowCreateClientDialog(false);
              loadData();
            }}
            onCancel={() => setShowCreateClientDialog(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateProviderDialog} onOpenChange={setShowCreateProviderDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Provider Account</DialogTitle>
            <DialogDescription>
              Create a new provider account with full profile details. Admin-created providers are automatically approved.
            </DialogDescription>
          </DialogHeader>
          <CreateProviderForm
            onSuccess={() => {
              setShowCreateProviderDialog(false);
              loadData();
            }}
            onCancel={() => setShowCreateProviderDialog(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateAdminDialog} onOpenChange={setShowCreateAdminDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Admin Team Member</DialogTitle>
            <DialogDescription>
              Add a new team member to the admin panel with full management access to the platform.
            </DialogDescription>
          </DialogHeader>
          <CreateAdminForm
            onSuccess={() => {
              setShowCreateAdminDialog(false);
              loadData();
            }}
            onCancel={() => setShowCreateAdminDialog(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showBookServiceDialog} onOpenChange={setShowBookServiceDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book a Service</DialogTitle>
            <DialogDescription>
              Book a service for a client. This will create a new job for the provider.
            </DialogDescription>
          </DialogHeader>
          <AdminBookServiceForm
            onSuccess={() => {
              setShowBookServiceDialog(false);
              loadData();
            }}
            onCancel={() => setShowBookServiceDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}