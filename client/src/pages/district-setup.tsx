import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  GraduationCap, 
  Building2, 
  Users, 
  CheckCircle2, 
  ArrowRight,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Calendar
} from "lucide-react";
import { useLocation } from "wouter";

export default function DistrictSetup() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [districtInfo, setDistrictInfo] = useState({
    name: "",
    slug: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    email: "",
    website: "",
    description: "",
    estimatedEmployees: "",
    subscriptionTier: "basic"
  });

  const [adminUser, setAdminUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    title: "HR Administrator",
    department: "Human Resources"
  });

  const subscriptionTiers = [
    {
      id: "basic",
      name: "Basic",
      price: "$29",
      description: "Perfect for small districts",
      features: ["Up to 100 employees", "3 admin users", "Basic HR features", "Email support"],
      maxEmployees: 100
    },
    {
      id: "professional", 
      name: "Professional",
      price: "$79",
      description: "Ideal for growing districts",
      features: ["Up to 500 employees", "5 admin users", "Advanced analytics", "Priority support"],
      maxEmployees: 500,
      popular: true
    },
    {
      id: "enterprise",
      name: "Enterprise", 
      price: "$199",
      description: "For large districts",
      features: ["Unlimited employees", "10 admin users", "Custom integrations", "24/7 phone support"],
      maxEmployees: -1
    }
  ];

  const handleDistrictInfoChange = (field: string, value: string) => {
    setDistrictInfo(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-generate slug from name
      if (field === 'name') {
        updated.slug = value
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
      }
      
      return updated;
    });
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      // Validate district info
      if (!districtInfo.name || !districtInfo.email || !districtInfo.city) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }
    } else if (currentStep === 2) {
      // Validate admin user
      if (!adminUser.firstName || !adminUser.lastName || !adminUser.email) {
        toast({
          title: "Missing Information", 
          description: "Please fill in all admin user fields",
          variant: "destructive"
        });
        return;
      }
    }
    
    setCurrentStep(prev => prev + 1);
  };

  const handleComplete = async () => {
    setLoading(true);
    
    try {
      // Simulate API calls to create district and admin user
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "District Setup Complete!",
        description: `${districtInfo.name} has been successfully configured`
      });
      
      // Redirect to main dashboard
      setLocation("/");
      
    } catch (error) {
      toast({
        title: "Setup Failed",
        description: "Unable to complete district setup. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            step <= currentStep 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-500'
          }`}>
            {step < currentStep ? <CheckCircle2 className="w-4 h-4" /> : step}
          </div>
          {step < 4 && (
            <div className={`w-12 h-1 mx-2 ${
              step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="text-white text-lg" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Timewise K-12</h1>
                <p className="text-sm text-gray-500">District Setup</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Step {currentStep} of 4
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Set Up Your School District
          </h2>
          <p className="text-gray-600">
            Let's configure your HR management system in just a few steps
          </p>
        </div>

        {renderStepIndicator()}

        <Card className="shadow-lg">
          <CardContent className="p-8">
            {/* Step 1: District Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <CardHeader className="p-0">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    District Information
                  </CardTitle>
                </CardHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">District Name *</Label>
                    <Input
                      id="name"
                      placeholder="Lincoln Unified School District"
                      value={districtInfo.name}
                      onChange={(e) => handleDistrictInfoChange('name', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="slug">URL Slug</Label>
                    <Input
                      id="slug"
                      placeholder="lincoln-unified"
                      value={districtInfo.slug}
                      onChange={(e) => handleDistrictInfoChange('slug', e.target.value)}
                      disabled
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">District Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="hr@lincolnusd.edu"
                      value={districtInfo.email}
                      onChange={(e) => handleDistrictInfoChange('email', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      placeholder="(555) 123-4567"
                      value={districtInfo.phone}
                      onChange={(e) => handleDistrictInfoChange('phone', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      placeholder="Lincoln"
                      value={districtInfo.city}
                      onChange={(e) => handleDistrictInfoChange('city', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      placeholder="CA"
                      value={districtInfo.state}
                      onChange={(e) => handleDistrictInfoChange('state', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="1234 Education Blvd"
                    value={districtInfo.address}
                    onChange={(e) => handleDistrictInfoChange('address', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of your school district..."
                    value={districtInfo.description}
                    onChange={(e) => handleDistrictInfoChange('description', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Subscription Plan */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <CardHeader className="p-0">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Choose Your Plan
                  </CardTitle>
                </CardHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {subscriptionTiers.map((tier) => (
                    <Card 
                      key={tier.id}
                      className={`cursor-pointer transition-all ${
                        districtInfo.subscriptionTier === tier.id 
                          ? 'ring-2 ring-blue-600 bg-blue-50' 
                          : 'hover:shadow-md'
                      } ${tier.popular ? 'border-blue-200' : ''}`}
                      onClick={() => handleDistrictInfoChange('subscriptionTier', tier.id)}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{tier.name}</CardTitle>
                          {tier.popular && (
                            <Badge className="bg-blue-600">Most Popular</Badge>
                          )}
                        </div>
                        <div className="text-2xl font-bold">{tier.price}<span className="text-sm font-normal text-gray-600">/month</span></div>
                        <p className="text-sm text-gray-600">{tier.description}</p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {tier.features.map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="estimatedEmployees">Estimated Number of Employees</Label>
                  <Input
                    id="estimatedEmployees"
                    type="number"
                    placeholder="150"
                    value={districtInfo.estimatedEmployees}
                    onChange={(e) => handleDistrictInfoChange('estimatedEmployees', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Admin User */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <CardHeader className="p-0">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Administrator Account
                  </CardTitle>
                </CardHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="adminFirstName">First Name *</Label>
                    <Input
                      id="adminFirstName"
                      placeholder="John"
                      value={adminUser.firstName}
                      onChange={(e) => setAdminUser(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="adminLastName">Last Name *</Label>
                    <Input
                      id="adminLastName"
                      placeholder="Smith"
                      value={adminUser.lastName}
                      onChange={(e) => setAdminUser(prev => ({ ...prev, lastName: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Email Address *</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      placeholder="john.smith@lincolnusd.edu"
                      value={adminUser.email}
                      onChange={(e) => setAdminUser(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="adminPhone">Phone Number</Label>
                    <Input
                      id="adminPhone"
                      placeholder="(555) 123-4567"
                      value={adminUser.phone}
                      onChange={(e) => setAdminUser(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="adminTitle">Job Title</Label>
                    <Input
                      id="adminTitle"
                      placeholder="HR Administrator"
                      value={adminUser.title}
                      onChange={(e) => setAdminUser(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="adminDepartment">Department</Label>
                    <Input
                      id="adminDepartment"
                      placeholder="Human Resources"
                      value={adminUser.department}
                      onChange={(e) => setAdminUser(prev => ({ ...prev, department: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review & Complete */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <CardHeader className="p-0">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Review & Complete Setup
                  </CardTitle>
                </CardHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">District Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>Name:</strong> {districtInfo.name}</div>
                      <div><strong>Email:</strong> {districtInfo.email}</div>
                      <div><strong>Location:</strong> {districtInfo.city}, {districtInfo.state}</div>
                      <div><strong>Plan:</strong> {subscriptionTiers.find(t => t.id === districtInfo.subscriptionTier)?.name}</div>
                      <div><strong>Monthly Cost:</strong> {subscriptionTiers.find(t => t.id === districtInfo.subscriptionTier)?.price}/month</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Administrator</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>Name:</strong> {adminUser.firstName} {adminUser.lastName}</div>
                      <div><strong>Email:</strong> {adminUser.email}</div>
                      <div><strong>Title:</strong> {adminUser.title}</div>
                      <div><strong>Department:</strong> {adminUser.department}</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-900">Ready to Launch!</h4>
                      <p className="text-green-700 text-sm mt-1">
                        Your district will be set up with full HR management capabilities, including employee management, 
                        leave tracking, payroll processing, and compliance monitoring.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-8 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(prev => prev - 1)}
                disabled={currentStep === 1}
              >
                Previous
              </Button>
              
              {currentStep < 4 ? (
                <Button onClick={handleNextStep}>
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleComplete}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? "Setting up..." : "Complete Setup"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}