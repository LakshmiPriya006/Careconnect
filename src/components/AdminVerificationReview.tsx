import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, FileText, Shield, Award, MessageSquare, Mail, Phone, User, AlertCircle, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { admin, client as apiClient } from '../utils/api';

interface AdminVerificationReviewProps {
  providerId?: string;
  onBack?: () => void;
  embedded?: boolean;
}

export function AdminVerificationReview({ providerId, onBack, embedded = false }: AdminVerificationReviewProps) {
  const [verifications, setVerifications] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serviceOptions, setServiceOptions] = useState<any[]>([]);

  useEffect(() => {
    loadServices();
    if (providerId) {
      loadProviderVerification(providerId);
    } else {
      loadPendingVerifications();
    }
  }, [providerId]);

  const loadServices = async () => {
    try {
      const response = await apiClient.getServices();
      const services = response.services || [];
      setServiceOptions(services.map((s: any) => ({
        id: s.id,
        icon: s.icon,
        title: s.title,
        label: s.title,
      })));
    } catch (err) {
      console.error('Error loading services:', err);
      // Fallback to default services
      setServiceOptions([
        { id: 'nursing', icon: '🏥', title: 'Nursing Care', label: 'Nursing Care' },
        { id: 'cleaning', icon: '🧹', title: 'House Cleaning', label: 'House Cleaning' },
        { id: 'grocery', icon: '🛒', title: 'Grocery Shopping', label: 'Grocery Shopping' },
        { id: 'companion', icon: '👥', title: 'Companionship', label: 'Companionship' },
        { id: 'handyman', icon: '🔧', title: 'Home Repairs', label: 'Home Repairs' },
        { id: 'transport', icon: '🚗', title: 'Transportation', label: 'Transportation' },
      ]);
    }
  };

  const getServiceName = (serviceId: string) => {
    const service = serviceOptions.find(s => s.id === serviceId);
    return service ? service.title || service.label : serviceId;
  };

  const loadPendingVerifications = async () => {
    try {
      const data = await admin.getPendingVerifications();
      setVerifications(data.verifications || []);
    } catch (error) {
      console.error('Error loading verifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProviderVerification = async (pid: string) => {
    try {
      const data = await admin.getProviderVerificationDetails(pid);
      setSelectedProvider(data);
    } catch (error) {
      console.error('Error loading provider verification:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (stage: string, action: 'approve' | 'reject') => {
    if (!selectedProvider) return;

    setSubmitting(true);
    try {
      await admin.reviewVerificationStage(
        selectedProvider.verification.providerId,
        stage,
        action,
        reviewNotes[stage] || ''
      );

      // Reload verification data
      await loadProviderVerification(selectedProvider.verification.providerId);
      
      // Clear notes
      setReviewNotes({ ...reviewNotes, [stage]: '' });
    } catch (error) {
      console.error('Error reviewing stage:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getStageIcon = (stageNum: number) => {
    switch (stageNum) {
      case 1: return Mail;
      case 2: return Shield;
      case 3: return Award;
      case 4: return MessageSquare;
      default: return FileText;
    }
  };

  const getStageTitle = (stageNum: number) => {
    switch (stageNum) {
      case 1: return 'Contact Verification';
      case 2: return 'Identity & Background Check';
      case 3: return 'Service Expertise';
      case 4: return 'Behavioral Assessment';
      default: return 'Unknown Stage';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'submitted':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300"><Clock className="w-3 h-3 mr-1" />Pending Review</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 border-red-300"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700 border-gray-300">Not Submitted</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Clock className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading verifications...</p>
        </div>
      </div>
    );
  }

  // Provider List View
  if (!selectedProvider) {
    return (
      <div className="space-y-6">
        {!embedded && (
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-blue-900">Provider Verifications</h3>
              <p className="text-gray-600">Review and approve provider applications</p>
            </div>
            {onBack && (
              <Button onClick={onBack} variant="outline">
                Back to Dashboard
              </Button>
            )}
          </div>
        )}

        {verifications.length === 0 ? (
          <Card className="border-2 border-gray-200">
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No pending verifications</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {verifications.map((verification) => {
              const pendingStages = Object.entries(verification.stages)
                .filter(([_, status]) => status === 'submitted')
                .length;

              return (
                <Card
                  key={verification.providerId}
                  className="border-2 border-blue-200 cursor-pointer hover:border-blue-400 transition-all"
                  onClick={() => loadProviderVerification(verification.providerId)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <User className="w-5 h-5 text-blue-600" />
                          <h4 className="text-blue-900">{verification.providerName}</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{verification.providerEmail}</p>
                        <p className="text-sm text-gray-500">
                          Submitted: {new Date(verification.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-orange-100 text-orange-700 border-orange-300">
                          {pendingStages} Stage{pendingStages !== 1 ? 's' : ''} Pending
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Detailed Review View
  const { verification, provider } = selectedProvider;

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-blue-900">Review Provider Application</h3>
            <p className="text-gray-600">{provider.name}</p>
          </div>
          <Button
            onClick={() => {
              setSelectedProvider(null);
              loadPendingVerifications();
            }}
            variant="outline"
          >
            Back to List
          </Button>
        </div>
      )}

      {embedded && (
        <div className="mb-4">
          <h4 className="text-blue-900">{provider.name}</h4>
          <p className="text-sm text-gray-600">{provider.email}</p>
        </div>
      )}

      {/* Provider Info */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="text-blue-900">Provider Information</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-600">Name</Label>
              <p className="text-gray-900">{provider.name}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Email</Label>
              <p className="text-gray-900">{provider.email}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Phone</Label>
              <p className="text-gray-900">{provider.phone || 'Not provided'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Applied On</Label>
              <p className="text-gray-900">{new Date(verification.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Stages */}
      <Tabs defaultValue="stage1" className="space-y-4">
        <TabsList className="grid grid-cols-4 bg-white shadow-sm">
          {[1, 2, 3, 4].map((num) => {
            const stage = `stage${num}`;
            const status = verification.stages[stage];
            const Icon = getStageIcon(num);

            return (
              <TabsTrigger
                key={stage}
                value={stage}
                className="data-[state=active]:bg-blue-100 flex flex-col gap-1 py-3"
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">Stage {num}</span>
                {status === 'submitted' && (
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Stage 1: Contact Verification */}
        <TabsContent value="stage1">
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-blue-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-blue-900 flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  {getStageTitle(1)}
                </CardTitle>
                {getStatusBadge(verification.stages.stage1)}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                  <Mail className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Email Verification</p>
                    <p className="text-green-900">
                      {verification.emailVerified ? '✓ Verified' : 'Not Verified'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                  <Phone className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Mobile Verification</p>
                    <p className="text-green-900">
                      {verification.mobileVerified ? '✓ Verified' : 'Not Verified'}
                    </p>
                  </div>
                </div>
              </div>

              {verification.stages.stage1 === 'submitted' && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label>Review Notes (Optional)</Label>
                    <Textarea
                      placeholder="Add any notes about this verification..."
                      value={reviewNotes.stage1 || ''}
                      onChange={(e) => setReviewNotes({ ...reviewNotes, stage1: e.target.value })}
                      className="min-h-24"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleReview('stage1', 'approve')}
                      className="bg-green-600 hover:bg-green-700 text-white flex-1"
                      disabled={submitting}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve Stage 1
                    </Button>
                    <Button
                      onClick={() => handleReview('stage1', 'reject')}
                      variant="outline"
                      className="text-red-600 hover:text-red-700 flex-1"
                      disabled={submitting}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </>
              )}

              {verification.reviewNotes?.stage1 && (
                <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Admin Notes:</p>
                  <p className="text-gray-900">{verification.reviewNotes.stage1.notes}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Reviewed on {new Date(verification.reviewNotes.stage1.reviewedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stage 2: ID & Background */}
        <TabsContent value="stage2">
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-blue-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-blue-900 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  {getStageTitle(2)}
                </CardTitle>
                {getStatusBadge(verification.stages.stage2)}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {verification.stageData.stage2 ? (
                <>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm text-gray-600">Government ID</Label>
                      <p className="text-gray-900">{verification.stageData.stage2.idDocumentName || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Address Proof</Label>
                      <p className="text-gray-900">{verification.stageData.stage2.addressProofName || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Background Check Consent</Label>
                      <p className="text-gray-900">
                        {verification.stageData.stage2.consentGiven ? '✓ Consent Given' : 'Not Given'}
                      </p>
                    </div>
                  </div>

                  {verification.stages.stage2 === 'submitted' && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <Label>Review Notes (Optional)</Label>
                        <Textarea
                          placeholder="Add notes about ID verification and background check..."
                          value={reviewNotes.stage2 || ''}
                          onChange={(e) => setReviewNotes({ ...reviewNotes, stage2: e.target.value })}
                          className="min-h-24"
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleReview('stage2', 'approve')}
                          className="bg-green-600 hover:bg-green-700 text-white flex-1"
                          disabled={submitting}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve Stage 2
                        </Button>
                        <Button
                          onClick={() => handleReview('stage2', 'reject')}
                          variant="outline"
                          className="text-red-600 hover:text-red-700 flex-1"
                          disabled={submitting}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </>
                  )}

                  {verification.reviewNotes?.stage2 && (
                    <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Admin Notes:</p>
                      <p className="text-gray-900">{verification.reviewNotes.stage2.notes}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Reviewed on {new Date(verification.reviewNotes.stage2.reviewedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-600 text-center py-8">Not yet submitted</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stage 3: Service Expertise */}
        <TabsContent value="stage3">
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-blue-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-blue-900 flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  {getStageTitle(3)}
                </CardTitle>
                {getStatusBadge(verification.stages.stage3)}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {verification.stageData.stage3 ? (
                <>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm text-gray-600">Selected Services</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {verification.stageData.stage3.services?.map((service: string) => (
                          <Badge key={service} className="bg-blue-100 text-blue-700">
                            {getServiceName(service)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {verification.stages.stage3 === 'submitted' && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <Label>Review Notes (Optional)</Label>
                        <Textarea
                          placeholder="Add notes about service expertise verification..."
                          value={reviewNotes.stage3 || ''}
                          onChange={(e) => setReviewNotes({ ...reviewNotes, stage3: e.target.value })}
                          className="min-h-24"
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleReview('stage3', 'approve')}
                          className="bg-green-600 hover:bg-green-700 text-white flex-1"
                          disabled={submitting}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve Stage 3
                        </Button>
                        <Button
                          onClick={() => handleReview('stage3', 'reject')}
                          variant="outline"
                          className="text-red-600 hover:text-red-700 flex-1"
                          disabled={submitting}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </>
                  )}

                  {verification.reviewNotes?.stage3 && (
                    <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Admin Notes:</p>
                      <p className="text-gray-900">{verification.reviewNotes.stage3.notes}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Reviewed on {new Date(verification.reviewNotes.stage3.reviewedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-600 text-center py-8">Not yet submitted</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stage 4: Behavioral Assessment */}
        <TabsContent value="stage4">
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-blue-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-blue-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  {getStageTitle(4)}
                </CardTitle>
                {getStatusBadge(verification.stages.stage4)}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {verification.stageData.stage4 ? (
                <>
                  <div className="space-y-4">
                    {Object.entries(verification.stageData.stage4.answers || {}).map(([questionId, answer], index) => (
                      <div key={questionId} className="border-2 border-gray-200 rounded-lg p-4">
                        <Label className="text-sm text-gray-600">Question {index + 1}</Label>
                        <p className="text-gray-900 mt-1">{answer as string}</p>
                      </div>
                    ))}
                  </div>

                  {verification.stages.stage4 === 'submitted' && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <Label>Review Notes (Optional)</Label>
                        <Textarea
                          placeholder="Add notes about behavioral assessment..."
                          value={reviewNotes.stage4 || ''}
                          onChange={(e) => setReviewNotes({ ...reviewNotes, stage4: e.target.value })}
                          className="min-h-24"
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleReview('stage4', 'approve')}
                          className="bg-green-600 hover:bg-green-700 text-white flex-1"
                          disabled={submitting}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve Stage 4
                        </Button>
                        <Button
                          onClick={() => handleReview('stage4', 'reject')}
                          variant="outline"
                          className="text-red-600 hover:text-red-700 flex-1"
                          disabled={submitting}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </>
                  )}

                  {verification.reviewNotes?.stage4 && (
                    <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Admin Notes:</p>
                      <p className="text-gray-900">{verification.reviewNotes.stage4.notes}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Reviewed on {new Date(verification.reviewNotes.stage4.reviewedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-600 text-center py-8">Not yet submitted</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}