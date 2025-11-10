import { useState, useEffect } from 'react';
import { AlertCircle, Phone, MapPin, Mail, Clock, CheckCircle, User, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { admin } from '../utils/api';
import { toast } from 'sonner@2.0.3';

export function EmergencyAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    loadAlerts();
    
    // Auto-refresh every 30 seconds to check for new alerts
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      const response = await admin.getEmergencyAlerts();
      setAlerts(response.alerts || []);
      
      // Check for new active alerts and show notification
      const activeAlerts = response.alerts.filter((a: any) => a.status === 'active');
      if (activeAlerts.length > 0 && !loading) {
        console.log(`🚨 ${activeAlerts.length} active emergency alert(s)`);
      }
    } catch (error) {
      console.error('Error loading emergency alerts:', error);
      toast.error('Failed to load emergency alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to mark this emergency alert as resolved?')) {
      return;
    }

    try {
      setResolving(true);
      await admin.resolveEmergencyAlert(alertId);
      toast.success('Emergency alert marked as resolved');
      await loadAlerts();
      setSelectedAlert(null);
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast.error('Failed to resolve alert');
    } finally {
      setResolving(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-600">Loading emergency alerts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-2 border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Alerts</p>
                <p className="text-red-900 text-3xl mt-1">{activeAlerts.length}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Resolved Today</p>
                <p className="text-green-900 text-3xl mt-1">
                  {resolvedAlerts.filter(a => {
                    const resolvedDate = new Date(a.resolvedAt);
                    const today = new Date();
                    return resolvedDate.toDateString() === today.toDateString();
                  }).length}
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Alerts</p>
                <p className="text-blue-900 text-3xl mt-1">{alerts.length}</p>
              </div>
              <Calendar className="w-10 h-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div>
          <h3 className="text-red-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-6 h-6" />
            Active Emergency Alerts
          </h3>
          <div className="space-y-4">
            {activeAlerts.map((alert) => (
              <Card 
                key={alert.id} 
                className="border-2 border-red-300 bg-red-50 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedAlert(alert)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-red-200 w-12 h-12 rounded-full flex items-center justify-center animate-pulse">
                          <AlertCircle className="w-6 h-6 text-red-700" />
                        </div>
                        <div>
                          <h4 className="text-red-900">{alert.userName}</h4>
                          <p className="text-sm text-red-700 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimestamp(alert.timestamp)}
                          </p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                        {alert.userPhone && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Phone className="w-4 h-4 text-red-600" />
                            <a href={`tel:${alert.userPhone}`} className="hover:underline">
                              {alert.userPhone}
                            </a>
                          </div>
                        )}
                        {alert.userEmail && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Mail className="w-4 h-4 text-red-600" />
                            <a href={`mailto:${alert.userEmail}`} className="hover:underline">
                              {alert.userEmail}
                            </a>
                          </div>
                        )}
                        {alert.userAddress && (
                          <div className="flex items-center gap-2 text-gray-700 md:col-span-2">
                            <MapPin className="w-4 h-4 text-red-600" />
                            <span>{alert.userAddress}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Badge className="bg-red-600 text-white border-red-700">
                        ACTIVE
                      </Badge>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolveAlert(alert.id);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={resolving}
                      >
                        {resolving ? 'Resolving...' : 'Resolve'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Active Alerts Message */}
      {activeAlerts.length === 0 && (
        <Card className="border-2 border-green-200 bg-green-50">
          <CardContent className="p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-green-900 mb-2">No Active Emergency Alerts</h3>
            <p className="text-gray-600">All emergency alerts have been resolved</p>
          </CardContent>
        </Card>
      )}

      {/* Resolved Alerts */}
      {resolvedAlerts.length > 0 && (
        <div>
          <h3 className="text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6" />
            Resolved Alerts
          </h3>
          <div className="space-y-4">
            {resolvedAlerts.slice(0, 10).map((alert) => (
              <Card 
                key={alert.id} 
                className="border-2 border-gray-200 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedAlert(alert)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="bg-gray-200 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-gray-900">{alert.userName}</h4>
                          <p className="text-sm text-gray-600">
                            Alert: {formatTimestamp(alert.timestamp)} • 
                            Resolved: {formatTimestamp(alert.resolvedAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-green-300">
                      Resolved
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Alert Detail Dialog */}
      {selectedAlert && (
        <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className={`w-6 h-6 ${selectedAlert.status === 'active' ? 'text-red-600' : 'text-green-600'}`} />
                Emergency Alert Details
              </DialogTitle>
              <DialogDescription>
                Alert ID: {selectedAlert.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex justify-center">
                <Badge className={`${
                  selectedAlert.status === 'active' 
                    ? 'bg-red-600 text-white border-red-700' 
                    : 'bg-green-100 text-green-700 border-green-300'
                } text-lg px-4 py-2`}>
                  {selectedAlert.status === 'active' ? '🚨 ACTIVE EMERGENCY' : '✓ RESOLVED'}
                </Badge>
              </div>

              {/* Client Information */}
              <div>
                <h4 className="text-gray-900 mb-3">Client Information</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="text-gray-900">{selectedAlert.userName}</p>
                    </div>
                  </div>

                  {selectedAlert.userPhone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <a 
                          href={`tel:${selectedAlert.userPhone}`} 
                          className="text-blue-600 hover:underline"
                        >
                          {selectedAlert.userPhone}
                        </a>
                      </div>
                    </div>
                  )}

                  {selectedAlert.userEmail && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <a 
                          href={`mailto:${selectedAlert.userEmail}`} 
                          className="text-blue-600 hover:underline"
                        >
                          {selectedAlert.userEmail}
                        </a>
                      </div>
                    </div>
                  )}

                  {selectedAlert.userAddress && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-600 mt-1" />
                      <div>
                        <p className="text-sm text-gray-600">Address</p>
                        <p className="text-gray-900">{selectedAlert.userAddress}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="text-gray-900 mb-3">Timeline</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Alert Received</p>
                      <p className="text-gray-900">
                        {new Date(selectedAlert.timestamp).toLocaleString()}
                      </p>
                      <p className="text-sm text-red-600 mt-1">
                        {formatTimestamp(selectedAlert.timestamp)}
                      </p>
                    </div>
                  </div>

                  {selectedAlert.status === 'resolved' && (
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-600">Resolved</p>
                        <p className="text-gray-900">
                          {new Date(selectedAlert.resolvedAt).toLocaleString()}
                        </p>
                        <p className="text-sm text-green-600 mt-1">
                          {formatTimestamp(selectedAlert.resolvedAt)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-3 pt-4 border-t">
                {selectedAlert.userPhone && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(`tel:${selectedAlert.userPhone}`, '_self')}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call Client
                  </Button>
                )}
                {selectedAlert.userEmail && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(`mailto:${selectedAlert.userEmail}`, '_blank')}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </Button>
                )}
                {selectedAlert.status === 'active' && (
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleResolveAlert(selectedAlert.id)}
                    disabled={resolving}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {resolving ? 'Resolving...' : 'Mark as Resolved'}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
