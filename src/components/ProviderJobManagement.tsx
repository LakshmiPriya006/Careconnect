import { useState, useEffect } from 'react';
import { 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  PlayCircle, 
  XCircle,
  MessageSquare,
  Loader2,
  FileText
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Separator } from './ui/separator';
import { provider } from '../utils/api';
import { toast } from 'sonner';

interface Job {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  serviceType: string;
  serviceTitle?: string;
  description?: string;
  scheduledDate: string;
  scheduledTime: string;
  location: string;
  estimatedCost: number;
  basePrice?: number;
  minimumHours?: number;
  minimumFee?: number;
  status: string;
  providerId: string;
  providerNotes?: string;
  requestFor?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  additionalDetails?: string;
  createdAt: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  bookingType?: string;
}

interface ProviderJobManagementProps {
  providerId: string;
  isActive?: boolean; // NEW: to know when tab is active
}

export function ProviderJobManagement({ providerId, isActive }: ProviderJobManagementProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [providerNotes, setProviderNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Load jobs on mount and when tab becomes active
  useEffect(() => {
    loadJobs();
  }, []);

  // Reload jobs when tab becomes active
  useEffect(() => {
    if (isActive) {
      console.log('📋 My Jobs tab became active, reloading jobs...');
      loadJobs();
    }
  }, [isActive]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      console.log('Loading provider jobs...');
      console.log('🔑 Access token from localStorage:', localStorage.getItem('access_token')?.substring(0, 30) + '...');
      
      const response = await provider.getBookings();
      console.log('Jobs loaded:', response.bookings);
      console.log('Jobs count:', response.bookings?.length);
      
      // Log each job status
      if (response.bookings && response.bookings.length > 0) {
        response.bookings.forEach((job: Job) => {
          console.log(`Job ${job.id}: status="${job.status}", serviceTitle="${job.serviceTitle}", serviceType="${job.serviceType}"`);
        });
      }
      
      setJobs(response.bookings || []);
    } catch (error: any) {
      console.error('Error loading jobs:', error);
      console.error('Error message:', error.message);
      
      // Show more helpful error message
      if (error.message.includes('Unauthorized') || error.message.includes('log in')) {
        toast.error('Your session has expired. Please log out and log back in to continue.', {
          duration: 5000,
        });
      } else if (error.message.includes('Network request failed') || error.message.includes('Failed to fetch')) {
        toast.error('Network error. Please check your internet connection.');
      } else {
        toast.error('Failed to load jobs: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewJob = (job: Job) => {
    setSelectedJob(job);
    setProviderNotes(job.providerNotes || '');
    setModalOpen(true);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedJob) return;

    setUpdatingStatus(true);
    try {
      await provider.updateJobStatus(selectedJob.id, newStatus, providerNotes);
      toast.success('Job status updated successfully');
      
      // Update local state
      setJobs(jobs.map(j => 
        j.id === selectedJob.id 
          ? { ...j, status: newStatus, providerNotes }
          : j
      ));
      
      // Update selected job
      setSelectedJob({ ...selectedJob, status: newStatus, providerNotes });
      
      // Reload jobs to get fresh data
      await loadJobs();
    } catch (error: any) {
      console.error('Error updating job status:', error);
      toast.error(error.message || 'Failed to update job status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedJob) return;

    setUpdatingStatus(true);
    try {
      await provider.updateJobNotes(selectedJob.id, providerNotes);
      toast.success('Notes saved successfully');
      
      // Update local state
      setJobs(jobs.map(j => 
        j.id === selectedJob.id 
          ? { ...j, providerNotes }
          : j
      ));
      
      setSelectedJob({ ...selectedJob, providerNotes });
    } catch (error: any) {
      console.error('Error saving notes:', error);
      toast.error(error.message || 'Failed to save notes');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
      case 'upcoming':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Upcoming</Badge>;
      case 'in-progress':
        return <Badge className="bg-purple-100 text-purple-700 border-purple-300">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 border-green-300">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700 border-red-300">Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700 border-gray-300">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'ASAP';
    
    // Handle old format strings
    if (dateString === 'tomorrow') return 'Tomorrow';
    if (dateString.includes('nov')) {
      // Convert old format like "nov5" to display format
      const match = dateString.match(/nov(\d+)/i);
      if (match) return `Nov ${match[1]}, 2025`;
      return dateString;
    }
    
    // Handle ISO date format (YYYY-MM-DD)
    try {
      const date = new Date(dateString + 'T00:00:00');
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch (e) {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    
    // Handle old format strings
    if (timeString === 'morning') return 'Morning (8 AM - 12 PM)';
    if (timeString === 'afternoon') return 'Afternoon (12 PM - 5 PM)';
    if (timeString === 'evening') return 'Evening (5 PM - 8 PM)';
    
    // Handle 24-hour time format (HH:MM)
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
      return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch (e) {
      return timeString;
    }
  };

  const formatTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return null;
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return null;
    }
  };

  // Filter jobs by status
  const upcomingJobs = jobs.filter(j => j.status === 'accepted' || j.status === 'upcoming');
  const inProgressJobs = jobs.filter(j => j.status === 'in-progress');
  const completedJobs = jobs.filter(j => j.status === 'completed');

  console.log('ProviderJobManagement - Job counts:', {
    total: jobs.length,
    upcoming: upcomingJobs.length,
    inProgress: inProgressJobs.length,
    completed: completedJobs.length,
    allStatuses: jobs.map(j => j.status)
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Jobs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-green-900">Upcoming Jobs ({upcomingJobs.length})</h3>
        </div>
        
        {upcomingJobs.length === 0 ? (
          <Card className="border-2 border-gray-200">
            <CardContent className="p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No upcoming jobs</p>
              <p className="text-sm text-gray-500 mt-1">Accepted jobs will appear here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {upcomingJobs.map((job) => (
              <Card key={job.id} className="border-2 border-blue-200 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-blue-900">{job.serviceTitle || job.serviceType}</h4>
                          {getStatusBadge(job.status)}
                        </div>
                        <p className="text-gray-600">Client: {job.clientName}</p>
                        <p className="text-xs text-gray-500 font-mono mt-1">Booking ID: {job.id}</p>
                      </div>
                    </div>

                    {job.requestFor === 'other' && job.recipientName && (
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-900 mb-1">Service Recipient:</p>
                        <p className="text-blue-900">{job.recipientName}</p>
                        {job.recipientPhone && (
                          <p className="text-sm text-blue-700 mt-1">{job.recipientPhone}</p>
                        )}
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-3 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span>{job.bookingType === 'immediate' ? 'ASAP' : formatDate(job.scheduledDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span>{job.bookingType === 'immediate' ? '' : formatTime(job.scheduledTime)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span className="truncate">{job.location}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        {job.basePrice ? (
                          <>
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-green-600" />
                              <span className="text-green-900">${job.basePrice}/hr</span>
                            </div>
                            {job.minimumHours && (
                              <span className="text-xs text-gray-600 ml-6">Min: {job.minimumHours}h</span>
                            )}
                            {job.minimumFee && (
                              <span className="text-xs text-gray-600 ml-6">Min fee: ${job.minimumFee}</span>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="text-green-900">${job.estimatedCost}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Show when the booking was created */}
                    <div className="flex items-center gap-1 text-gray-500 text-xs pt-2 border-t">
                      <Clock className="w-3 h-3" />
                      <span>Booked on: {new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>

                    {/* Timestamp displays */}
                    {job.acceptedAt && (
                      <div className="flex items-center gap-1 text-blue-600 text-xs">
                        <CheckCircle className="w-3 h-3" />
                        <span>Accepted: {formatTimestamp(job.acceptedAt)}</span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-3 border-t">
                      <Button 
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12"
                        onClick={() => handleViewJob(job)}
                      >
                        <PlayCircle className="w-5 h-5 mr-2" />
                        Manage Job
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* In Progress Jobs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-green-900">In Progress ({inProgressJobs.length})</h3>
        </div>
        
        {inProgressJobs.length === 0 ? (
          <Card className="border-2 border-gray-200">
            <CardContent className="p-12 text-center">
              <PlayCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No jobs in progress</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {inProgressJobs.map((job) => (
              <Card key={job.id} className="border-2 border-purple-200 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-purple-900">{job.serviceTitle || job.serviceType}</h4>
                          {getStatusBadge(job.status)}
                        </div>
                        <p className="text-gray-600">Client: {job.clientName}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        <span>{formatDate(job.scheduledDate)}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        {job.basePrice ? (
                          <>
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-green-600" />
                              <span className="text-green-900">${job.basePrice}/hr</span>
                            </div>
                            {job.minimumHours && (
                              <span className="text-xs text-gray-600 ml-6">Min: {job.minimumHours}h</span>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="text-green-900">${job.estimatedCost}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timestamp displays */}
                    {job.startedAt && (
                      <div className="flex items-center gap-1 text-purple-600 text-xs pt-2 border-t">
                        <PlayCircle className="w-3 h-3" />
                        <span>Started: {formatTimestamp(job.startedAt)}</span>
                      </div>
                    )}

                    <Button 
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12"
                      onClick={() => handleViewJob(job)}
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Complete Job
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Completed Jobs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-green-900">Completed Jobs ({completedJobs.length})</h3>
        </div>
        
        {completedJobs.length === 0 ? (
          <Card className="border-2 border-gray-200">
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No completed jobs yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {completedJobs.slice(0, 5).map((job) => (
              <Card key={job.id} className="border-2 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-green-900">{job.serviceTitle || job.serviceType}</h4>
                        {getStatusBadge(job.status)}
                      </div>
                      <p className="text-gray-600 text-sm">Client: {job.clientName}</p>
                      <p className="text-gray-500 text-sm mt-1">{formatDate(job.scheduledDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-900 text-xl">${job.estimatedCost}</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="mt-2"
                        onClick={() => handleViewJob(job)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Job Detail Modal */}
      {selectedJob && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-green-900 flex items-center justify-between">
                Job Details
                {getStatusBadge(selectedJob.status)}
              </DialogTitle>
              <DialogDescription>
                View job details and manage this service request. You can accept, complete, or cancel jobs from here.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Service Information */}
              <div>
                <h4 className="text-gray-900 mb-3">Service Information</h4>
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <p className="text-lg text-gray-900">{selectedJob.serviceTitle || selectedJob.serviceType}</p>
                  {selectedJob.description && (
                    <p className="text-gray-600">{selectedJob.description}</p>
                  )}
                  {selectedJob.additionalDetails && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-sm text-gray-600"><strong>Additional Details:</strong></p>
                      <p className="text-gray-700 mt-1">{selectedJob.additionalDetails}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Client Information */}
              <div>
                <h4 className="text-gray-900 mb-3">Client Information</h4>
                <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    <span className="text-gray-900">{selectedJob.clientName}</span>
                  </div>
                  {selectedJob.clientPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-5 h-5 text-blue-600" />
                      <span className="text-gray-700">{selectedJob.clientPhone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recipient Information (if service is for someone else) */}
              {selectedJob.requestFor === 'other' && selectedJob.recipientName && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-gray-900 mb-3">Service Recipient</h4>
                    <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg space-y-2">
                      <p className="text-blue-900">{selectedJob.recipientName}</p>
                      {selectedJob.recipientPhone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-blue-600" />
                          <span className="text-blue-700">{selectedJob.recipientPhone}</span>
                        </div>
                      )}
                      {selectedJob.recipientAddress && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <span className="text-gray-600">{selectedJob.recipientAddress}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Schedule & Location */}
              <div>
                <h4 className="text-gray-900 mb-3">Schedule & Location</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-700">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <span>{formatDate(selectedJob.scheduledDate)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <Clock className="w-5 h-5 text-green-600" />
                    <span>{formatTime(selectedJob.scheduledTime)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-500 text-sm">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <span>Booked on: {new Date(selectedJob.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                  </div>
                  {selectedJob.acceptedAt && (
                    <div className="flex items-center gap-3 text-blue-600 text-sm">
                      <CheckCircle className="w-5 h-5" />
                      <span>Accepted: {formatTimestamp(selectedJob.acceptedAt)}</span>
                    </div>
                  )}
                  {selectedJob.startedAt && (
                    <div className="flex items-center gap-3 text-purple-600 text-sm">
                      <PlayCircle className="w-5 h-5" />
                      <span>Started: {formatTimestamp(selectedJob.startedAt)}</span>
                    </div>
                  )}
                  {selectedJob.completedAt && (
                    <div className="flex items-center gap-3 text-green-600 text-sm">
                      <CheckCircle className="w-5 h-5" />
                      <span>Completed: {formatTimestamp(selectedJob.completedAt)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-gray-700">
                    <MapPin className="w-5 h-5 text-green-600" />
                    <span>{selectedJob.location}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <span className="text-green-900">${selectedJob.estimatedCost}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Provider Notes */}
              <div>
                <Label htmlFor="provider-notes" className="text-gray-900 mb-2 block">
                  <FileText className="w-4 h-4 inline mr-2" />
                  Your Notes
                </Label>
                <Textarea
                  id="provider-notes"
                  placeholder="Add notes about this job (e.g., special observations, client requests, etc.)"
                  value={providerNotes}
                  onChange={(e) => setProviderNotes(e.target.value)}
                  className="min-h-24"
                />
                <Button
                  onClick={handleSaveNotes}
                  disabled={updatingStatus}
                  variant="outline"
                  className="mt-2 w-full"
                >
                  {updatingStatus ? 'Saving...' : 'Save Notes'}
                </Button>
              </div>

              <Separator />

              {/* Status Update Actions */}
              <div>
                <h4 className="text-gray-900 mb-3">Update Job Status</h4>
                <div className="space-y-3">
                  {selectedJob.status === 'accepted' && (
                    <Button
                      onClick={() => handleUpdateStatus('in-progress')}
                      disabled={updatingStatus}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12"
                    >
                      <PlayCircle className="w-5 h-5 mr-2" />
                      {updatingStatus ? 'Updating...' : 'Start Job'}
                    </Button>
                  )}

                  {selectedJob.status === 'in-progress' && (
                    <Button
                      onClick={() => handleUpdateStatus('completed')}
                      disabled={updatingStatus}
                      className="w-full bg-green-600 hover:bg-green-700 text-white h-12"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      {updatingStatus ? 'Updating...' : 'Mark as Completed'}
                    </Button>
                  )}

                  {(selectedJob.status === 'accepted' || selectedJob.status === 'in-progress') && (
                    <Button
                      onClick={() => handleUpdateStatus('cancelled')}
                      disabled={updatingStatus}
                      variant="outline"
                      className="w-full border-red-300 text-red-600 hover:bg-red-50 h-12"
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      {updatingStatus ? 'Updating...' : 'Cancel Job'}
                    </Button>
                  )}

                  {selectedJob.status === 'completed' && (
                    <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg text-center">
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-green-900">This job has been completed</p>
                      <p className="text-sm text-green-700 mt-1">
                        The client can now rate and review your service
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full h-12"
                onClick={() => setModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}