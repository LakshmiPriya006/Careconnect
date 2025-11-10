import { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, Mail, Shield, Award, MessageSquare, Bell, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { client } from '../utils/api';

interface ProviderPendingStatusProps {
  providerId: string;
}

interface AdminNotification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'action_required';
  createdAt: string;
  stage?: string;
}

export function ProviderPendingStatus({ providerId }: ProviderPendingStatusProps) {
  const [verificationData, setVerificationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  useEffect(() => {
    loadStatus();
    // Poll for updates every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, [providerId]);

  const loadStatus = async () => {
    try {
      const data = await client.getProviderVerification(providerId);
      setVerificationData(data);
      
      // Load any admin notifications (mock for now)
      const mockNotifications: AdminNotification[] = [];
      
      // Check for rejected stages
      Object.entries(data.stages).forEach(([stage, status]) => {
        if (status === 'rejected' && data.reviewNotes?.[stage]) {
          mockNotifications.push({
            id: stage,
            message: `${getStageTitle(stage)}: ${data.reviewNotes[stage].notes || 'Please update and resubmit'}`,
            type: 'action_required',
            createdAt: data.reviewNotes[stage].reviewedAt,
            stage,
          });
        }
      });

      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error loading status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageTitle = (stageKey: string) => {
    const stageNum = parseInt(stageKey.replace('stage', ''));
    switch (stageNum) {
      case 1: return 'Contact Verification';
      case 2: return 'Identity & Background Check';
      case 3: return 'Service Expertise';
      case 4: return 'Behavioral Assessment';
      default: return 'Unknown Stage';
    }
  };

  const getStageIcon = (stageNum: number) => {
    switch (stageNum) {
      case 1: return Mail;
      case 2: return Shield;
      case 3: return Award;
      case 4: return MessageSquare;
      default: return Clock;
    }
  };

  const getStageDescription = (stageNum: number) => {
    switch (stageNum) {
      case 1: return 'Email and mobile verification';
      case 2: return 'ID documents and background check';
      case 3: return 'Skills and certifications review';
      case 4: return 'Professional assessment evaluation';
      default: return '';
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          icon: CheckCircle,
          color: 'green',
          text: 'Completed',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-700',
        };
      case 'submitted':
        return {
          icon: Clock,
          color: 'blue',
          text: 'Under Review',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-700',
        };
      case 'rejected':
        return {
          icon: AlertCircle,
          color: 'red',
          text: 'Action Required',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-700',
        };
      default:
        return {
          icon: Clock,
          color: 'gray',
          text: 'Pending',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-700',
        };
    }
  };

  const calculateProgress = () => {
    if (!verificationData) return 0;
    const stages = Object.values(verificationData.stages);
    const completed = stages.filter(s => s === 'approved').length;
    return (completed / 4) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your application status...</p>
        </div>
      </div>
    );
  }

  const progress = calculateProgress();
  const allApproved = progress === 100;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Important Notice Banner */}
        <Alert className="border-2 border-orange-300 bg-orange-50">
          <XCircle className="h-6 w-6 text-orange-600" />
          <AlertDescription className="text-orange-900">
            <p className="mb-2">
              <strong className="text-lg">🔒 Dashboard Access Locked - Admin Approval Required</strong>
            </p>
            <p className="mb-2">
              Your provider account is <strong>not yet activated</strong> by our admin team. You cannot access the full 
              provider dashboard or accept job requests until an administrator reviews and approves all verification stages.
            </p>
            <p className="text-sm">
              This verification process ensures the safety and quality of our CareConnect platform for all users.
            </p>
          </AlertDescription>
        </Alert>

        {/* Header */}
        <Card className="border-2 border-orange-200">
          <CardHeader className="bg-orange-50">
            <CardTitle className="text-orange-900 flex items-center gap-2">
              <Clock className="w-6 h-6" />
              Verification In Progress
            </CardTitle>
            <p className="text-gray-700">
              <strong>Dashboard Access Locked:</strong> Your provider application is being reviewed by our admin team. 
              You cannot access the full dashboard until all verification stages are approved by an administrator.
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Overall Progress</span>
                <span className="text-orange-900">{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="h-3" />
              {allApproved ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <AlertDescription className="text-green-900 space-y-3">
                    <p><strong>✓ Congratulations!</strong> All verification stages have been approved by our admin team.</p>
                    <p className="text-sm">Click the button below to reload and access your full provider dashboard.</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium"
                    >
                      Reload & Access Dashboard
                    </button>
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <AlertDescription className="text-orange-900">
                      <strong>⏳ Admin Approval Required:</strong> Your application is currently under review by our admin team. 
                      This typically takes 2-3 business days. You'll be notified via email once an administrator approves all stages.
                    </AlertDescription>
                  </Alert>
                  <button
                    onClick={loadStatus}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Check for Updates
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Admin Notifications */}
        {notifications.length > 0 && (
          <Card className="border-2 border-orange-200">
            <CardHeader className="bg-orange-50">
              <CardTitle className="text-orange-900 flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Admin Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {notifications.map((notif) => (
                <Alert key={notif.id} className="border-orange-200 bg-orange-50">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <AlertDescription className="text-orange-900">
                    <strong>{notif.type === 'action_required' ? 'Action Required: ' : ''}</strong>
                    {notif.message}
                    <p className="text-xs text-orange-700 mt-1">
                      {new Date(notif.createdAt).toLocaleString()}
                    </p>
                  </AlertDescription>
                </Alert>
              ))}
              <p className="text-sm text-orange-700 mt-4">
                <strong>Note:</strong> Our admin team manages all verification stages. If additional information is required, 
                you will receive a notification or email with instructions.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Verification Stages */}
        <div className="space-y-4">
          <h3 className="text-gray-900">Verification Stages</h3>
          
          {[1, 2, 3, 4].map((stageNum) => {
            const stageKey = `stage${stageNum}`;
            const status = verificationData?.stages[stageKey] || 'pending';
            const statusInfo = getStatusInfo(status);
            const Icon = getStageIcon(stageNum);
            const StatusIcon = statusInfo.icon;

            return (
              <Card
                key={stageNum}
                className={`border-2 ${statusInfo.borderColor}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`${statusInfo.bgColor} p-3 rounded-lg`}>
                      <Icon className={`w-6 h-6 ${statusInfo.textColor}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-gray-900">Stage {stageNum}: {getStageTitle(stageKey)}</h4>
                          <p className="text-sm text-gray-600">{getStageDescription(stageNum)}</p>
                        </div>
                        <Badge className={`${statusInfo.bgColor} ${statusInfo.textColor} border-${statusInfo.color}-300`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusInfo.text}
                        </Badge>
                      </div>

                      {/* Stage Details */}
                      {status === 'approved' && (
                        <div className={`mt-3 p-3 ${statusInfo.bgColor} border ${statusInfo.borderColor} rounded-lg`}>
                          <p className="text-sm ${statusInfo.textColor}">
                            ✓ This stage has been reviewed and approved by an administrator
                          </p>
                          {verificationData?.reviewNotes?.[stageKey] && (
                            <p className="text-xs ${statusInfo.textColor} mt-1">
                              Approved by admin on {new Date(verificationData.reviewNotes[stageKey].reviewedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}

                      {status === 'submitted' && (
                        <div className={`mt-3 p-3 ${statusInfo.bgColor} border ${statusInfo.borderColor} rounded-lg`}>
                          <p className="text-sm ${statusInfo.textColor}">
                            ⏳ Submitted and awaiting admin review. An administrator must approve this stage before you can access the dashboard.
                          </p>
                        </div>
                      )}

                      {status === 'rejected' && verificationData?.reviewNotes?.[stageKey] && (
                        <div className={`mt-3 p-3 ${statusInfo.bgColor} border ${statusInfo.borderColor} rounded-lg`}>
                          <p className="text-sm ${statusInfo.textColor} mb-2">
                            <strong>Admin Feedback:</strong> {verificationData.reviewNotes[stageKey].notes}
                          </p>
                          <p className="text-xs ${statusInfo.textColor}">
                            Our team will contact you via email with next steps
                          </p>
                        </div>
                      )}

                      {status === 'pending' && (
                        <div className={`mt-3 p-3 ${statusInfo.bgColor} border ${statusInfo.borderColor} rounded-lg`}>
                          <p className="text-sm ${statusInfo.textColor}">
                            This stage is pending submission from earlier stages
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Information Card */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-blue-900">What Happens Next?</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4 text-gray-700">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-700 text-sm">1</span>
                </div>
                <div>
                  <p><strong>Verification Review:</strong> Our admin team will review your submitted information, including identity documents and background checks.</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-700 text-sm">2</span>
                </div>
                <div>
                  <p><strong>Additional Information:</strong> If we need any additional documents or information, we'll notify you via email and in-app notifications.</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-700 text-sm">3</span>
                </div>
                <div>
                  <p><strong>Approval:</strong> Once all stages are approved, you'll be able to access your full provider dashboard and start accepting jobs.</p>
                </div>
              </div>
              <Separator />
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-yellow-900">
                  <strong>Important:</strong> You cannot edit your application after submission. All updates and validations are managed by our admin team. 
                  If changes are needed, our team will reach out to you directly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
