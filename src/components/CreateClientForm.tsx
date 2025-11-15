import { useState } from 'react';
import { User, Mail, Lock, Phone, MapPin, Calendar, Users as UsersIcon, Plus, X, Building } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { auth } from '../utils/api';
import { toast } from 'sonner';

interface CreateClientFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface FamilyMember {
  name: string;
  relationship: string;
  phone: string;
  age: string;
}

interface Location {
  label: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export function CreateClientForm({ onSuccess, onCancel }: CreateClientFormProps) {
  const [loading, setLoading] = useState(false);
  
  // Basic client data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    address: '',
    age: '',
    gender: '',
  });

  // Family members
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [currentFamily, setCurrentFamily] = useState<FamilyMember>({
    name: '',
    relationship: '',
    phone: '',
    age: '',
  });

  // Locations
  const [locations, setLocations] = useState<Location[]>([]);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location>({
    label: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });

  const handleAddFamilyMember = () => {
    if (!currentFamily.name || !currentFamily.relationship) {
      toast.error('Please fill in name and relationship');
      return;
    }

    setFamilyMembers([...familyMembers, currentFamily]);
    setCurrentFamily({ name: '', relationship: '', phone: '', age: '' });
    setShowFamilyForm(false);
    toast.success('Family member added');
  };

  const handleRemoveFamilyMember = (index: number) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== index));
    toast.success('Family member removed');
  };

  const handleAddLocation = () => {
    if (!currentLocation.label || !currentLocation.address || !currentLocation.city || 
        !currentLocation.state || !currentLocation.zipCode) {
      toast.error('Please fill in all location fields');
      return;
    }

    setLocations([...locations, currentLocation]);
    setCurrentLocation({ label: '', address: '', city: '', state: '', zipCode: '' });
    setShowLocationForm(false);
    toast.success('Location added');
  };

  const handleRemoveLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
    toast.success('Location removed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password || !formData.name) {
      toast.error('Please fill in email, password, and name');
      return;
    }

    setLoading(true);

    try {
      // Create client account
      await auth.signUpClient({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        age: formData.age,
        gender: formData.gender,
        emailVerified: true, // Admin-created accounts are auto-verified
        mobileVerified: true,
        familyMembers: familyMembers,
        locations: locations,
      });

      toast.success('Client account created successfully with family members and locations!');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating client:', error);
      toast.error(error.message || 'Failed to create client account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information Section */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="text-blue-900">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="client@example.com"
              className="h-11"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-base flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Temporary Password *
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              placeholder="Minimum 6 characters"
              minLength={6}
              className="h-11"
            />
            <p className="text-sm text-gray-600">
              Client should change this password on first login
            </p>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Full Name *
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="John Doe"
              className="h-11"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-base flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
              className="h-11"
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Primary Address
            </Label>
            <Input
              id="address"
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Main St, City, State, ZIP"
              className="h-11"
            />
          </div>

          {/* Age and Gender */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age" className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Age
              </Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="65"
                min="0"
                max="150"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender" className="text-base flex items-center gap-2">
                <UsersIcon className="w-4 h-4" />
                Gender
              </Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
              >
                <SelectTrigger className="h-11">
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
        </CardContent>
      </Card>

      {/* Family Members Section */}
      <Card className="border-2 border-green-200">
        <CardHeader className="bg-green-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-green-900 flex items-center gap-2">
              <UsersIcon className="w-5 h-5" />
              Family Members (Optional)
            </CardTitle>
            <Button
              type="button"
              onClick={() => setShowFamilyForm(!showFamilyForm)}
              variant="outline"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Family Member
            </Button>
          </div>
          <p className="text-sm text-gray-600">Add family members who may receive services</p>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Family Form */}
          {showFamilyForm && (
            <Card className="border-2 border-green-300 bg-green-50">
              <CardContent className="p-4 space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={currentFamily.name}
                      onChange={(e) => setCurrentFamily({ ...currentFamily, name: e.target.value })}
                      placeholder="Jane Doe"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Relationship *</Label>
                    <Select
                      value={currentFamily.relationship}
                      onValueChange={(value) => setCurrentFamily({ ...currentFamily, relationship: value })}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mother">Mother</SelectItem>
                        <SelectItem value="father">Father</SelectItem>
                        <SelectItem value="spouse">Spouse</SelectItem>
                        <SelectItem value="sibling">Sibling</SelectItem>
                        <SelectItem value="child">Child</SelectItem>
                        <SelectItem value="grandparent">Grandparent</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={currentFamily.phone}
                      onChange={(e) => setCurrentFamily({ ...currentFamily, phone: e.target.value })}
                      placeholder="+1 (555) 987-6543"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Age</Label>
                    <Input
                      type="number"
                      value={currentFamily.age}
                      onChange={(e) => setCurrentFamily({ ...currentFamily, age: e.target.value })}
                      placeholder="70"
                      className="h-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleAddFamilyMember}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setShowFamilyForm(false);
                      setCurrentFamily({ name: '', relationship: '', phone: '', age: '' });
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Family Members List */}
          {familyMembers.length > 0 ? (
            <div className="space-y-2">
              {familyMembers.map((member, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border-2 border-green-200 rounded-lg bg-white"
                >
                  <div className="flex-1">
                    <p className="font-medium">{member.name}</p>
                    <div className="flex gap-3 text-sm text-gray-600">
                      <span>Relationship: {member.relationship}</span>
                      {member.phone && <span>• Phone: {member.phone}</span>}
                      {member.age && <span>• Age: {member.age}</span>}
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleRemoveFamilyMember(index)}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No family members added yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Locations Section */}
      <Card className="border-2 border-purple-200">
        <CardHeader className="bg-purple-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-purple-900 flex items-center gap-2">
              <Building className="w-5 h-5" />
              Service Locations (Optional)
            </CardTitle>
            <Button
              type="button"
              onClick={() => setShowLocationForm(!showLocationForm)}
              variant="outline"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </Button>
          </div>
          <p className="text-sm text-gray-600">Add addresses where services may be needed</p>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Location Form */}
          {showLocationForm && (
            <Card className="border-2 border-purple-300 bg-purple-50">
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <Label>Location Label *</Label>
                  <Input
                    value={currentLocation.label}
                    onChange={(e) => setCurrentLocation({ ...currentLocation, label: e.target.value })}
                    placeholder="e.g., Mom's House, Work Office"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Street Address *</Label>
                  <Input
                    value={currentLocation.address}
                    onChange={(e) => setCurrentLocation({ ...currentLocation, address: e.target.value })}
                    placeholder="123 Main Street"
                    className="h-10"
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>City *</Label>
                    <Input
                      value={currentLocation.city}
                      onChange={(e) => setCurrentLocation({ ...currentLocation, city: e.target.value })}
                      placeholder="New York"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State *</Label>
                    <Input
                      value={currentLocation.state}
                      onChange={(e) => setCurrentLocation({ ...currentLocation, state: e.target.value })}
                      placeholder="NY"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP Code *</Label>
                    <Input
                      value={currentLocation.zipCode}
                      onChange={(e) => setCurrentLocation({ ...currentLocation, zipCode: e.target.value })}
                      placeholder="10001"
                      className="h-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleAddLocation}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setShowLocationForm(false);
                      setCurrentLocation({ label: '', address: '', city: '', state: '', zipCode: '' });
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Locations List */}
          {locations.length > 0 ? (
            <div className="space-y-2">
              {locations.map((location, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border-2 border-purple-200 rounded-lg bg-white"
                >
                  <div className="flex-1">
                    <p className="font-medium">{location.label}</p>
                    <p className="text-sm text-gray-600">
                      {location.address}, {location.city}, {location.state} {location.zipCode}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleRemoveLocation(index)}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No locations added yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Info Note */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-900">
          <strong>Note:</strong> Admin-created client accounts are automatically verified. 
          The client can add or modify family members and locations later from their profile.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 h-12"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12"
        >
          {loading ? 'Creating Account...' : 'Create Client Account'}
        </Button>
      </div>
    </form>
  );
}
