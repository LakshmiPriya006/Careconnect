import { useState, useEffect } from 'react';
import { User, MapPin, Plus, Edit, Trash2, Users, Home } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { client } from '../utils/api';
import { toast } from 'sonner';

interface Location {
  id: string;
  name: string;
  address: string;
  isPrimary: boolean;
}

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  age: string;
  gender: string;
  address: string;
  notes?: string;
}

export function ClientProfile() {
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  
  // Location dialog
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationForm, setLocationForm] = useState({ name: '', address: '', isPrimary: false });
  
  // Family member dialog
  const [showFamilyDialog, setShowFamilyDialog] = useState(false);
  const [editingFamily, setEditingFamily] = useState<FamilyMember | null>(null);
  const [familyForm, setFamilyForm] = useState({
    name: '',
    relationship: '',
    phone: '',
    age: '',
    gender: '',
    address: '',
    notes: '',
  });

  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await client.getProfile();
      setLocations(response.locations || []);
      setFamilyMembers(response.familyMembers || []);
    } catch (err: any) {
      console.error('Error loading profile:', err);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  // Location handlers
  const handleOpenLocationDialog = (location?: Location) => {
    if (location) {
      setEditingLocation(location);
      setLocationForm({
        name: location.name,
        address: location.address,
        isPrimary: location.isPrimary,
      });
    } else {
      setEditingLocation(null);
      setLocationForm({ name: '', address: '', isPrimary: false });
    }
    setError('');
    setShowLocationDialog(true);
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!locationForm.name || !locationForm.address) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      if (editingLocation) {
        await client.updateLocation(editingLocation.id, locationForm);
        toast.success('Location updated successfully');
      } else {
        await client.addLocation(locationForm);
        toast.success('Location added successfully');
      }
      setShowLocationDialog(false);
      loadProfile();
    } catch (err: any) {
      console.error('Error saving location:', err);
      setError(err.message || 'Failed to save location');
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      await client.deleteLocation(locationId);
      toast.success('Location deleted successfully');
      loadProfile();
    } catch (err: any) {
      console.error('Error deleting location:', err);
      toast.error('Failed to delete location');
    }
  };

  // Family member handlers
  const handleOpenFamilyDialog = (member?: FamilyMember) => {
    if (member) {
      setEditingFamily(member);
      setFamilyForm({
        name: member.name,
        relationship: member.relationship,
        phone: member.phone,
        age: member.age,
        gender: member.gender,
        address: member.address,
        notes: member.notes || '',
      });
    } else {
      setEditingFamily(null);
      setFamilyForm({
        name: '',
        relationship: '',
        phone: '',
        age: '',
        gender: '',
        address: '',
        notes: '',
      });
    }
    setError('');
    setShowFamilyDialog(true);
  };

  const handleSaveFamilyMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!familyForm.name || !familyForm.phone || !familyForm.address) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      if (editingFamily) {
        await client.updateFamilyMember(editingFamily.id, familyForm);
        toast.success('Profile updated successfully');
      } else {
        await client.addFamilyMember(familyForm);
        toast.success('Profile added successfully');
      }
      setShowFamilyDialog(false);
      loadProfile();
    } catch (err: any) {
      console.error('Error saving family member:', err);
      setError(err.message || 'Failed to save profile');
    }
  };

  const handleDeleteFamilyMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;

    try {
      await client.deleteFamilyMember(memberId);
      toast.success('Profile deleted successfully');
      loadProfile();
    } catch (err: any) {
      console.error('Error deleting family member:', err);
      toast.error('Failed to delete profile');
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-600">Loading profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h3 className="text-blue-900">My Account</h3>
        <p className="text-gray-600">Manage your locations and family member profiles</p>
      </div>

      <Tabs defaultValue="locations" className="space-y-6">
        <TabsList className="grid grid-cols-2 bg-white shadow-sm">
          <TabsTrigger value="locations" className="data-[state=active]:bg-blue-100">
            <Home className="w-4 h-4 mr-2" />
            Locations
          </TabsTrigger>
          <TabsTrigger value="family" className="data-[state=active]:bg-blue-100">
            <Users className="w-4 h-4 mr-2" />
            Family Members
          </TabsTrigger>
        </TabsList>

        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-600">Manage service locations</p>
            <Button
              onClick={() => handleOpenLocationDialog()}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Location
            </Button>
          </div>

          {locations.length === 0 ? (
            <Card className="border-2 border-gray-200">
              <CardContent className="p-12 text-center">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No locations added yet</p>
                <Button onClick={() => handleOpenLocationDialog()} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Add Your First Location
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {locations.map((location) => (
                <Card key={location.id} className="border-2 border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <MapPin className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-gray-900">{location.name}</h4>
                          {location.isPrimary && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Primary</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenLocationDialog(location)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteLocation(location.id)}
                          className="h-8 w-8 p-0 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm">{location.address}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Family Members Tab */}
        <TabsContent value="family" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-600">Manage family member profiles for quick booking</p>
            <Button
              onClick={() => handleOpenFamilyDialog()}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Profile
            </Button>
          </div>

          {familyMembers.length === 0 ? (
            <Card className="border-2 border-gray-200">
              <CardContent className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No family member profiles yet</p>
                <Button onClick={() => handleOpenFamilyDialog()} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Add Your First Profile
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {familyMembers.map((member) => (
                <Card key={member.id} className="border-2 border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4">
                        <div className="bg-blue-100 p-3 rounded-lg">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="space-y-2">
                          <div>
                            <h4 className="text-gray-900">{member.name}</h4>
                            <p className="text-sm text-gray-600">{member.relationship}</p>
                          </div>
                          <div className="grid md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                            <p className="text-gray-600">
                              <span className="text-gray-500">Age:</span> {member.age}
                            </p>
                            <p className="text-gray-600">
                              <span className="text-gray-500">Gender:</span> {member.gender}
                            </p>
                            <p className="text-gray-600">
                              <span className="text-gray-500">Phone:</span> {member.phone}
                            </p>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <p className="text-gray-600">{member.address}</p>
                          </div>
                          {member.notes && (
                            <p className="text-sm text-gray-600 italic">{member.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenFamilyDialog(member)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteFamilyMember(member.id)}
                          className="h-8 w-8 p-0 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Location Dialog */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-blue-900">
              {editingLocation ? 'Edit Location' : 'Add New Location'}
            </DialogTitle>
            <DialogDescription>
              Add a service location where you need assistance
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveLocation} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="location-name">Location Name *</Label>
              <Input
                id="location-name"
                placeholder="e.g., Home, Mom's House"
                value={locationForm.name}
                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location-address">Full Address *</Label>
              <Input
                id="location-address"
                placeholder="123 Main St, City, State, ZIP"
                value={locationForm.address}
                onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                required
                className="h-12"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="primary-location"
                checked={locationForm.isPrimary}
                onChange={(e) => setLocationForm({ ...locationForm, isPrimary: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="primary-location" className="cursor-pointer">Set as primary location</Label>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowLocationDialog(false)}
                className="flex-1 h-12"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12">
                {editingLocation ? 'Update' : 'Add'} Location
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Family Member Dialog */}
      <Dialog open={showFamilyDialog} onOpenChange={setShowFamilyDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-blue-900">
              {editingFamily ? 'Edit Profile' : 'Add Family Member Profile'}
            </DialogTitle>
            <DialogDescription>
              Create a profile for quick booking on behalf of family members
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveFamilyMember} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="family-name">Full Name *</Label>
              <Input
                id="family-name"
                placeholder="e.g., Margaret Thompson"
                value={familyForm.name}
                onChange={(e) => setFamilyForm({ ...familyForm, name: e.target.value })}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship *</Label>
              <Input
                id="relationship"
                placeholder="e.g., Mother, Father, Spouse"
                value={familyForm.relationship}
                onChange={(e) => setFamilyForm({ ...familyForm, relationship: e.target.value })}
                required
                className="h-12"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="family-age">Age *</Label>
                <Input
                  id="family-age"
                  type="number"
                  placeholder="e.g., 75"
                  min="1"
                  max="120"
                  value={familyForm.age}
                  onChange={(e) => setFamilyForm({ ...familyForm, age: e.target.value })}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="family-gender">Gender *</Label>
                <Select value={familyForm.gender} onValueChange={(value) => setFamilyForm({ ...familyForm, gender: value })}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="family-phone">Phone Number *</Label>
              <Input
                id="family-phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={familyForm.phone}
                onChange={(e) => setFamilyForm({ ...familyForm, phone: e.target.value })}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="family-address">Address *</Label>
              <Input
                id="family-address"
                placeholder="123 Oak Street, New York, NY 10001"
                value={familyForm.address}
                onChange={(e) => setFamilyForm({ ...familyForm, address: e.target.value })}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="family-notes">Notes (Optional)</Label>
              <Input
                id="family-notes"
                placeholder="Any special requirements or notes..."
                value={familyForm.notes}
                onChange={(e) => setFamilyForm({ ...familyForm, notes: e.target.value })}
                className="h-12"
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFamilyDialog(false)}
                className="flex-1 h-12"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12">
                {editingFamily ? 'Update' : 'Add'} Profile
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
