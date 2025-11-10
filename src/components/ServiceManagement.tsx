import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { admin } from '../utils/api';
import { toast } from 'sonner';
import * as Icons from 'lucide-react';
import { useCurrency } from '../utils/currency';

interface Service {
  id: string;
  icon: string;
  title: string;
  description: string;
  basePrice?: number;
  minimumHours?: number;
  minimumFee?: number;
  platformFeePercentage?: number;
  createdAt: string;
}

export function ServiceManagement() {
  const { currencySymbol } = useCurrency();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    icon: '',
    title: '',
    description: '',
    basePrice: '',
    minimumHours: '',
    minimumFee: '',
    platformFeePercentage: '',
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await admin.getServices();
      setServices(response.services || []);
    } catch (err: any) {
      console.error('Error loading services:', err);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        icon: service.icon,
        title: service.title,
        description: service.description,
        basePrice: service.basePrice ? service.basePrice.toString() : '',
        minimumHours: service.minimumHours ? service.minimumHours.toString() : '',
        minimumFee: service.minimumFee ? service.minimumFee.toString() : '',
        platformFeePercentage: service.platformFeePercentage ? service.platformFeePercentage.toString() : '',
      });
    } else {
      setEditingService(null);
      setFormData({ icon: '', title: '', description: '', basePrice: '', minimumHours: '', minimumFee: '', platformFeePercentage: '' });
    }
    setError('');
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingService(null);
    setFormData({ icon: '', title: '', description: '', basePrice: '', minimumHours: '', minimumFee: '', platformFeePercentage: '' });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title || !formData.icon) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      if (editingService) {
        await admin.updateService(editingService.id, formData);
        toast.success('Service updated successfully');
      } else {
        await admin.createService(formData);
        toast.success('Service created successfully');
      }
      handleCloseDialog();
      loadServices();
    } catch (err: any) {
      console.error('Error saving service:', err);
      setError(err.message || 'Failed to save service');
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      return;
    }

    try {
      await admin.deleteService(serviceId);
      toast.success('Service deleted successfully');
      loadServices();
    } catch (err: any) {
      console.error('Error deleting service:', err);
      toast.error('Failed to delete service');
    }
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    if (IconComponent) {
      return <IconComponent className="w-6 h-6" />;
    }
    return <Sparkles className="w-6 h-6" />;
  };

  const popularIcons = [
    'Heart', 'Home', 'Stethoscope', 'Utensils', 'ShoppingCart', 
    'Wrench', 'Sparkles', 'Car', 'Briefcase', 'Users',
    'Baby', 'Dog', 'Leaf', 'Book', 'Scissors'
  ];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-600">Loading services...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-purple-900">Service Management</h3>
          <p className="text-gray-600">Manage available services for providers and clients</p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Service
        </Button>
      </div>

      {services.length === 0 ? (
        <Card className="border-2 border-gray-200">
          <CardContent className="p-12 text-center">
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">No services created yet</p>
            <Button onClick={() => handleOpenDialog()} className="bg-purple-600 hover:bg-purple-700 text-white">
              Add Your First Service
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <Card key={service.id} className="border-2 border-gray-200 hover:border-purple-300 transition-colors">
              <CardHeader className="bg-purple-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-3 rounded-lg text-purple-600">
                      {renderIcon(service.icon)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{service.title}</CardTitle>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenDialog(service)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(service.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-gray-600 text-sm">{service.description}</p>
                <div className="mt-3 space-y-1 text-sm">
                  {service.basePrice ? (
                    <p className="text-purple-600">
                      <strong>Hourly Rate:</strong> {currencySymbol}{service.basePrice}/hour
                    </p>
                  ) : null}
                  {service.minimumHours ? (
                    <p className="text-gray-700">
                      <strong>Minimum Hours:</strong> {service.minimumHours}h
                    </p>
                  ) : null}
                  {service.minimumFee ? (
                    <p className="text-gray-700">
                      <strong>Minimum Fee:</strong> {currencySymbol}{service.minimumFee}
                    </p>
                  ) : null}
                  {service.platformFeePercentage ? (
                    <p className="text-orange-600">
                      <strong>Platform Fee:</strong> {service.platformFeePercentage}%
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Service Dialog */}
      <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-purple-900">
              {editingService ? 'Edit Service' : 'Add New Service'}
            </DialogTitle>
            <DialogDescription>
              Create services that providers can offer to clients
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Service Title *</Label>
              <Input
                id="title"
                type="text"
                placeholder="e.g., Home Nursing Care"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the service..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="min-h-24"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon Name *</Label>
              <Input
                id="icon"
                type="text"
                placeholder="e.g., Heart, Home, Stethoscope"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                required
                className="h-12"
              />
              <p className="text-sm text-gray-600">
                Enter a Lucide icon name. Preview: {renderIcon(formData.icon)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Popular Icons</Label>
              <div className="grid grid-cols-5 gap-2">
                {popularIcons.map((iconName) => (
                  <Button
                    key={iconName}
                    type="button"
                    variant="outline"
                    className={`h-16 flex flex-col items-center gap-1 ${
                      formData.icon === iconName ? 'border-purple-500 bg-purple-50' : ''
                    }`}
                    onClick={() => setFormData({ ...formData, icon: iconName })}
                  >
                    {renderIcon(iconName)}
                    <span className="text-xs">{iconName}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="basePrice">Base Price</Label>
              <Input
                id="basePrice"
                type="number"
                placeholder="e.g., 50"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimumHours">Minimum Hours</Label>
              <Input
                id="minimumHours"
                type="number"
                placeholder="e.g., 2"
                value={formData.minimumHours}
                onChange={(e) => setFormData({ ...formData, minimumHours: e.target.value })}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimumFee">Minimum Fee</Label>
              <Input
                id="minimumFee"
                type="number"
                placeholder="e.g., 100"
                value={formData.minimumFee}
                onChange={(e) => setFormData({ ...formData, minimumFee: e.target.value })}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="platformFeePercentage">Platform Fee Percentage</Label>
              <Input
                id="platformFeePercentage"
                type="number"
                placeholder="e.g., 10"
                value={formData.platformFeePercentage}
                onChange={(e) => setFormData({ ...formData, platformFeePercentage: e.target.value })}
                className="h-12"
              />
              <p className="text-sm text-gray-600">
                Percentage of total service cost deducted as platform fee (e.g., 10 means 10%)
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                className="flex-1 h-12"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white h-12"
              >
                {editingService ? 'Update Service' : 'Create Service'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}