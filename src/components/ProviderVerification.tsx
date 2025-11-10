import { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, Upload, Phone, Mail, FileText, Shield, Award, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Checkbox } from './ui/checkbox';
import { client } from '../utils/api';

interface VerificationStage {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'submitted' | 'approved' | 'rejected';
  icon: any;
}

interface ProviderVerificationProps {
  providerId: string;
  onVerificationComplete?: () => void;
}

export function ProviderVerification({ providerId, onVerificationComplete }: ProviderVerificationProps) {
  const [verificationData, setVerificationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentStage, setCurrentStage] = useState(0);
  
  // Stage 1: Email and Mobile Verification
  const [emailOtp, setEmailOtp] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [otpSent, setOtpSent] = useState({ email: false, mobile: false });
  
  // Stage 2: ID and Background Check
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [addressProof, setAddressProof] = useState<File | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  
  // Stage 3: Service Expertise
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<File[]>([]);
  const [experienceYears, setExperienceYears] = useState('');
  const [experienceDetails, setExperienceDetails] = useState('');
  
  // Stage 4: Behavioral Assessment
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, string>>({});

  const serviceOptions = [
    { id: 'nursing', label: 'Nursing Care', requiresCert: true },
    { id: 'cleaning', label: 'House Cleaning', requiresCert: false },
    { id: 'grocery', label: 'Grocery Shopping', requiresCert: false },
    { id: 'companion', label: 'Companionship', requiresCert: false },
    { id: 'handyman', label: 'Home Repairs', requiresCert: false },
    { id: 'transport', label: 'Transportation', requiresCert: true },
  ];

  const assessmentQuestions = [
    {
      id: 'q1',
      question: 'How would you handle a situation where an elderly client refuses to take their prescribed medication?',
      type: 'textarea',
    },
    {
      id: 'q2',
      question: 'Describe your experience working with elderly individuals who may have memory issues or dementia.',
      type: 'textarea',
    },
    {
      id: 'q3',
      question: 'How do you ensure the safety and comfort of clients in their homes?',
      type: 'textarea',
    },
    {
      id: 'q4',
      question: 'Are you comfortable working with clients who require assistance with personal care tasks?',
      type: 'radio',
      options: ['Yes, very comfortable', 'Somewhat comfortable', 'I prefer not to'],
    },
    {
      id: 'q5',
      question: 'How do you handle emergency situations?',
      type: 'textarea',
    },
  ];

  useEffect(() => {
    loadVerificationStatus();
  }, [providerId]);

  const loadVerificationStatus = async () => {
    try {
      const data = await client.getProviderVerification(providerId);
      setVerificationData(data);
      
      // Determine current stage
      if (data.stages.stage1 === 'approved') {
        if (data.stages.stage2 === 'approved') {
          if (data.stages.stage3 === 'approved') {
            if (data.stages.stage4 === 'approved') {
              setCurrentStage(4); // All complete
            } else {
              setCurrentStage(3);
            }
          } else {
            setCurrentStage(2);
          }
        } else {
          setCurrentStage(1);
        }
      } else {
        setCurrentStage(0);
      }
      
      setEmailVerified(data.emailVerified || false);
      setMobileVerified(data.mobileVerified || false);
    } catch (error) {
      console.error('Error loading verification status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (type: 'email' | 'mobile') => {
    try {
      const response = await client.sendVerificationOtp(providerId, type);
      setOtpSent({ ...otpSent, [type]: true });
      
      // Show OTP in console for testing (since we don't have email/SMS service)
      if (response.otp) {
        console.log(`🔐 Your ${type.toUpperCase()} OTP is: ${response.otp}`);
        alert(`For testing purposes, your ${type.toUpperCase()} OTP is: ${response.otp}\n\nIn production, this would be sent to your ${type}.`);
      }
    } catch (error) {
      console.error(`Error sending ${type} OTP:`, error);
      alert(`Failed to send OTP. Please try again.`);
    }
  };

  const handleVerifyOtp = async (type: 'email' | 'mobile', otp: string) => {
    try {
      const result = await client.verifyOtp(providerId, type, otp);
      if (result.verified) {
        if (type === 'email') setEmailVerified(true);
        if (type === 'mobile') setMobileVerified(true);
        alert(`${type.charAt(0).toUpperCase() + type.slice(1)} verified successfully!`);
      }
    } catch (error) {
      console.error(`Error verifying ${type} OTP:`, error);
      alert(`Failed to verify OTP. Please check the code and try again.`);
    }
  };

  const handleStage1Submit = async () => {
    if (emailVerified && mobileVerified) {
      try {
        await client.submitVerificationStage(providerId, 'stage1', {
          emailVerified: true,
          mobileVerified: true,
        });
        await loadVerificationStatus();
        alert('Stage 1 submitted successfully! Our team will review your verification.');
      } catch (error) {
        console.error('Error submitting stage 1:', error);
        alert('Failed to submit. Please try again.');
      }
    }
  };

  const handleStage2Submit = async () => {
    if (!idDocument || !addressProof || !consentGiven) {
      alert('Please complete all required fields');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('idDocument', idDocument);
      formData.append('addressProof', addressProof);
      formData.append('consentGiven', 'true');

      await client.submitVerificationStage(providerId, 'stage2', {
        idDocumentName: idDocument.name,
        addressProofName: addressProof.name,
        consentGiven: true,
      });
      await loadVerificationStatus();
      alert('Stage 2 submitted successfully! Our team will review your documents and initiate the background check.');
    } catch (error) {
      console.error('Error submitting stage 2:', error);
      alert('Failed to submit. Please try again.');
    }
  };

  const handleStage3Submit = async () => {
    if (selectedServices.length === 0) {
      alert('Please select at least one service');
      return;
    }

    try {
      await client.submitVerificationStage(providerId, 'stage3', {
        services: selectedServices,
        certifications: certifications.map(c => c.name),
        experienceYears,
        experienceDetails,
      });
      await loadVerificationStatus();
      alert('Stage 3 submitted successfully! Our team will review your expertise and certifications.');
    } catch (error) {
      console.error('Error submitting stage 3:', error);
      alert('Failed to submit. Please try again.');
    }
  };

  const handleStage4Submit = async () => {
    const unanswered = assessmentQuestions.filter(q => !assessmentAnswers[q.id]);
    if (unanswered.length > 0) {
      alert('Please answer all questions');
      return;
    }

    try {
      await client.submitVerificationStage(providerId, 'stage4', {
        answers: assessmentAnswers,
      });
      await loadVerificationStatus();
      alert('Stage 4 submitted successfully! Our team will review your assessment. You will be notified once all stages are approved.');
      if (onVerificationComplete) {
        onVerificationComplete();
      }
    } catch (error) {
      console.error('Error submitting stage 4:', error);
      alert('Failed to submit. Please try again.');
    }
  };

  const getStageStatus = (stageNum: number): 'pending' | 'in-progress' | 'submitted' | 'approved' | 'rejected' => {
    if (!verificationData) return 'pending';
    const stageKey = `stage${stageNum}` as keyof typeof verificationData.stages;
    return verificationData.stages[stageKey] || 'pending';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'submitted':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300"><Clock className="w-3 h-3 mr-1" />Under Review</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 border-red-300"><AlertCircle className="w-3 h-3 mr-1" />Needs Update</Badge>;
      case 'in-progress':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700 border-gray-300">Pending</Badge>;
    }
  };

  const calculateProgress = () => {
    if (!verificationData) return 0;
    const stages = Object.values(verificationData.stages);
    const approved = stages.filter(s => s === 'approved').length;
    return (approved / 4) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading verification status...</p>
        </div>
      </div>
    );
  }

  const stages: VerificationStage[] = [
    {
      id: 'stage1',
      title: 'Contact Verification',
      description: 'Verify your email and mobile number',
      status: getStageStatus(1),
      icon: Mail,
    },
    {
      id: 'stage2',
      title: 'Identity & Background Check',
      description: 'Submit ID and consent for background verification',
      status: getStageStatus(2),
      icon: Shield,
    },
    {
      id: 'stage3',
      title: 'Service Expertise',
      description: 'Verify your skills and certifications',
      status: getStageStatus(3),
      icon: Award,
    },
    {
      id: 'stage4',
      title: 'Behavioral Assessment',
      description: 'Complete professional assessment questions',
      status: getStageStatus(4),
      icon: MessageSquare,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-2 border-green-200">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-900">Provider Verification</CardTitle>
            <p className="text-gray-600">Complete all stages to start accepting jobs</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Overall Progress</span>
                <span className="text-green-900">{Math.round(calculateProgress())}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Stages Overview */}
        <div className="grid md:grid-cols-2 gap-4">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <Card
                key={stage.id}
                className={`border-2 cursor-pointer transition-all ${
                  currentStage === index
                    ? 'border-green-500 bg-green-50'
                    : stage.status === 'approved'
                    ? 'border-green-200'
                    : 'border-gray-200'
                }`}
                onClick={() => stage.status !== 'approved' && setCurrentStage(index)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon className={`w-6 h-6 flex-shrink-0 ${
                      stage.status === 'approved' ? 'text-green-600' : 'text-gray-400'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-gray-900">Stage {index + 1}</h4>
                        {getStatusBadge(stage.status)}
                      </div>
                      <p className="text-sm text-gray-600">{stage.title}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Stage Content */}
        <Card className="border-2 border-green-200">
          <CardHeader className="bg-green-50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-green-900">{stages[currentStage]?.title}</CardTitle>
                <p className="text-gray-600">{stages[currentStage]?.description}</p>
              </div>
              {getStatusBadge(stages[currentStage]?.status)}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Stage 1: Contact Verification */}
            {currentStage === 0 && (
              <div className="space-y-6">
                {/* Email Verification */}
                <div className="space-y-3">
                  <Label className="text-lg flex items-center gap-2">
                    <Mail className="w-5 h-5 text-green-600" />
                    Email Verification
                  </Label>
                  {emailVerified ? (
                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-900">Email verified successfully</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Enter 6-digit OTP"
                          value={emailOtp}
                          onChange={(e) => setEmailOtp(e.target.value)}
                          maxLength={6}
                          className="h-12 text-base"
                        />
                        <Button
                          onClick={() => handleSendOtp('email')}
                          variant="outline"
                          className="h-12 px-6"
                        >
                          {otpSent.email ? 'Resend OTP' : 'Send OTP'}
                        </Button>
                      </div>
                      <Button
                        onClick={() => handleVerifyOtp('email', emailOtp)}
                        className="bg-green-600 hover:bg-green-700 text-white h-12"
                        disabled={emailOtp.length !== 6}
                      >
                        Verify Email
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Mobile Verification */}
                <div className="space-y-3">
                  <Label className="text-lg flex items-center gap-2">
                    <Phone className="w-5 h-5 text-green-600" />
                    Mobile Verification
                  </Label>
                  {mobileVerified ? (
                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-900">Mobile verified successfully</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Enter 6-digit OTP"
                          value={mobileOtp}
                          onChange={(e) => setMobileOtp(e.target.value)}
                          maxLength={6}
                          className="h-12 text-base"
                        />
                        <Button
                          onClick={() => handleSendOtp('mobile')}
                          variant="outline"
                          className="h-12 px-6"
                        >
                          {otpSent.mobile ? 'Resend OTP' : 'Send OTP'}
                        </Button>
                      </div>
                      <Button
                        onClick={() => handleVerifyOtp('mobile', mobileOtp)}
                        className="bg-green-600 hover:bg-green-700 text-white h-12"
                        disabled={mobileOtp.length !== 6}
                      >
                        Verify Mobile
                      </Button>
                    </div>
                  )}
                </div>

                {emailVerified && mobileVerified && (
                  <Button
                    onClick={handleStage1Submit}
                    className="w-full bg-green-600 hover:bg-green-700 text-white h-14 text-lg"
                  >
                    Complete Contact Verification
                  </Button>
                )}
              </div>
            )}

            {/* Stage 2: ID and Background Check */}
            {currentStage === 1 && (
              <div className="space-y-6">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <p className="text-blue-900 text-sm">
                    We need to verify your identity and conduct a background check to ensure the safety of our clients.
                    All information is kept confidential and secure.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="id-document" className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-green-600" />
                    Government-Issued ID
                  </Label>
                  <p className="text-sm text-gray-600">Upload a clear photo of your driver's license, passport, or state ID</p>
                  <Input
                    id="id-document"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setIdDocument(e.target.files?.[0] || null)}
                    className="h-12"
                  />
                  {idDocument && (
                    <p className="text-sm text-green-600">✓ {idDocument.name}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="address-proof" className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-green-600" />
                    Proof of Address
                  </Label>
                  <p className="text-sm text-gray-600">Upload a utility bill, bank statement, or lease agreement (within last 3 months)</p>
                  <Input
                    id="address-proof"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setAddressProof(e.target.files?.[0] || null)}
                    className="h-12"
                  />
                  {addressProof && (
                    <p className="text-sm text-green-600">✓ {addressProof.name}</p>
                  )}
                </div>

                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="consent"
                      checked={consentGiven}
                      onCheckedChange={(checked) => setConsentGiven(checked as boolean)}
                      className="mt-1"
                    />
                    <Label htmlFor="consent" className="text-sm text-gray-900 cursor-pointer">
                      I consent to a comprehensive background check including criminal history, sex offender registry,
                      and address verification. I understand this is required to work with vulnerable populations.
                    </Label>
                  </div>
                </div>

                <Button
                  onClick={handleStage2Submit}
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-14 text-lg"
                  disabled={!idDocument || !addressProof || !consentGiven}
                >
                  Submit for Background Check
                </Button>
              </div>
            )}

            {/* Stage 3: Service Expertise */}
            {currentStage === 2 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-lg">Select Services You Provide</Label>
                  <div className="grid md:grid-cols-2 gap-3">
                    {serviceOptions.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-green-300"
                        onClick={() => {
                          setSelectedServices(prev =>
                            prev.includes(service.id)
                              ? prev.filter(s => s !== service.id)
                              : [...prev, service.id]
                          );
                        }}
                      >
                        <Checkbox
                          checked={selectedServices.includes(service.id)}
                          onCheckedChange={(checked) => {
                            setSelectedServices(prev =>
                              checked
                                ? [...prev, service.id]
                                : prev.filter(s => s !== service.id)
                            );
                          }}
                        />
                        <div className="flex-1">
                          <p className="text-gray-900">{service.label}</p>
                          {service.requiresCert && (
                            <p className="text-xs text-orange-600">Certification required</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-lg">Years of Experience</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 5"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-lg">Experience Details</Label>
                  <Textarea
                    placeholder="Describe your relevant experience, previous roles, and any special training..."
                    value={experienceDetails}
                    onChange={(e) => setExperienceDetails(e.target.value)}
                    className="min-h-32 text-base"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-lg flex items-center gap-2">
                    <Upload className="w-5 h-5 text-green-600" />
                    Certifications & Licenses (Optional)
                  </Label>
                  <p className="text-sm text-gray-600">Upload any relevant certifications, licenses, or training certificates</p>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={(e) => setCertifications(Array.from(e.target.files || []))}
                    className="h-12"
                  />
                  {certifications.length > 0 && (
                    <div className="space-y-1">
                      {certifications.map((cert, i) => (
                        <p key={i} className="text-sm text-green-600">✓ {cert.name}</p>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleStage3Submit}
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-14 text-lg"
                  disabled={selectedServices.length === 0 || !experienceYears || !experienceDetails}
                >
                  Submit Service Expertise
                </Button>
              </div>
            )}

            {/* Stage 4: Behavioral Assessment */}
            {currentStage === 3 && (
              <div className="space-y-6">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <p className="text-blue-900 text-sm">
                    Please answer the following questions thoughtfully. Your responses help us ensure you're a good fit
                    for working with elderly clients who may need special care and attention.
                  </p>
                </div>

                {assessmentQuestions.map((question, index) => (
                  <div key={question.id} className="space-y-3">
                    <Label className="text-base">
                      {index + 1}. {question.question}
                    </Label>
                    {question.type === 'textarea' ? (
                      <Textarea
                        placeholder="Your answer..."
                        value={assessmentAnswers[question.id] || ''}
                        onChange={(e) =>
                          setAssessmentAnswers({ ...assessmentAnswers, [question.id]: e.target.value })
                        }
                        className="min-h-24 text-base"
                      />
                    ) : (
                      <RadioGroup
                        value={assessmentAnswers[question.id]}
                        onValueChange={(value) =>
                          setAssessmentAnswers({ ...assessmentAnswers, [question.id]: value })
                        }
                      >
                        {question.options?.map((option) => (
                          <div key={option} className="flex items-center gap-2">
                            <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                            <Label htmlFor={`${question.id}-${option}`} className="cursor-pointer">
                              {option}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                  </div>
                ))}

                <Button
                  onClick={handleStage4Submit}
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-14 text-lg"
                  disabled={Object.keys(assessmentAnswers).length < assessmentQuestions.length}
                >
                  Complete Assessment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Support */}
        <Card className="border-2 border-gray-200">
          <CardContent className="p-6">
            <div className="text-center text-gray-600">
              <p className="mb-2">Need help with verification?</p>
              <Button variant="outline" className="h-10">
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
