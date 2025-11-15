import { useState } from 'react';
import { User, Mail, Lock, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { auth } from '../utils/api';
import { toast } from 'sonner';

interface CreateAdminFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateAdminForm({ onSuccess, onCancel }: CreateAdminFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await auth.initAdmin(formData.email, formData.password, formData.name);
      toast.success('Admin team member added successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating admin:', error);
      
      // Check if it's a duplicate email error
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        toast.error('An admin with this email already exists');
      } else {
        toast.error(error.message || 'Failed to create admin account');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-purple-600 mt-0.5" />
        <div>
          <p className="text-sm text-purple-900">
            <strong>Admin Team Member</strong>
          </p>
          <p className="text-sm text-purple-800 mt-1">
            This person will have full administrative access to manage clients, providers, and system settings.
          </p>
        </div>
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
          placeholder="Admin Name"
          className="h-11"
        />
      </div>

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
          placeholder="admin@careconnect.com"
          className="h-11"
        />
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-base flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Password *
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
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-base flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Confirm Password *
        </Label>
        <Input
          id="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          required
          placeholder="Re-enter password"
          minLength={6}
          className="h-11"
        />
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
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white h-12"
        >
          {loading ? 'Adding Admin...' : 'Add Admin Team Member'}
        </Button>
      </div>
    </form>
  );
}
