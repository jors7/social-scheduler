'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Plus,
  Check,
  X,
  Link2,
  Settings,
  User,
  Bell,
  Shield,
  CreditCard,
  HelpCircle
} from 'lucide-react'

const socialPlatforms = [
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: '𝕏',
    connected: true,
    username: '@johndoe',
    color: 'bg-black'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📷',
    connected: true,
    username: '@john.doe',
    color: 'bg-gradient-to-br from-purple-600 to-pink-500'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'f',
    connected: false,
    color: 'bg-blue-600'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'in',
    connected: true,
    username: 'John Doe',
    color: 'bg-blue-700'
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: '▶',
    connected: false,
    color: 'bg-red-600'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '♪',
    connected: false,
    color: 'bg-black'
  },
  {
    id: 'threads',
    name: 'Threads',
    icon: '@',
    connected: false,
    color: 'bg-black'
  },
  {
    id: 'bluesky',
    name: 'Bluesky',
    icon: '🦋',
    connected: false,
    color: 'bg-sky-500'
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    icon: 'P',
    connected: false,
    color: 'bg-red-700'
  },
]

const settingsSections = [
  { id: 'accounts', label: 'Connected Accounts', icon: Link2 },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'help', label: 'Help & Support', icon: HelpCircle },
]

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('accounts')

  const handleConnect = (platformId: string) => {
    // TODO: Implement OAuth flow for each platform
    console.log(`Connecting to ${platformId}`)
  }

  const handleDisconnect = (platformId: string) => {
    // TODO: Implement disconnect logic
    console.log(`Disconnecting from ${platformId}`)
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and preferences</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6 mt-8">
        {/* Sidebar Navigation */}
        <Card className="h-fit">
          <CardContent className="p-2">
            {settingsSections.map(section => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    activeSection === section.id
                      ? "bg-primary text-white"
                      : "hover:bg-gray-100"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              )
            })}
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {activeSection === 'accounts' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Connected Social Media Accounts</CardTitle>
                  <CardDescription>
                    Connect your social media accounts to start scheduling posts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {socialPlatforms.map(platform => (
                      <div
                        key={platform.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center text-white",
                            platform.color
                          )}>
                            <span className="text-lg">{platform.icon}</span>
                          </div>
                          <div>
                            <p className="font-medium">{platform.name}</p>
                            {platform.connected && (
                              <p className="text-sm text-gray-600">{platform.username}</p>
                            )}
                          </div>
                        </div>
                        {platform.connected ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisconnect(platform.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="mr-1 h-4 w-4" />
                            Disconnect
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConnect(platform.id)}
                          >
                            <Plus className="mr-1 h-4 w-4" />
                            Connect
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>API Access</CardTitle>
                  <CardDescription>
                    Generate API keys to integrate with external tools
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline">
                    Generate API Key
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {activeSection === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" defaultValue="John" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" defaultValue="Doe" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="john@example.com" />
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" defaultValue="Acme Inc." />
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>
          )}

          {activeSection === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose how you want to be notified
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-gray-600">Receive updates via email</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Enabled
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Post Reminders</p>
                      <p className="text-sm text-gray-600">Get notified before scheduled posts</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Enabled
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Weekly Reports</p>
                      <p className="text-sm text-gray-600">Receive weekly performance summaries</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Disabled
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'billing' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>
                    You are currently on the Professional plan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-2xl font-bold">$49/month</p>
                      <p className="text-sm text-gray-600">Billed monthly</p>
                    </div>
                    <Button variant="outline">Change Plan</Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Up to 10 social accounts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Unlimited scheduled posts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Advanced analytics</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                  <CardDescription>
                    Manage your payment information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-8 w-8 text-gray-400" />
                      <div>
                        <p className="font-medium">•••• •••• •••• 4242</p>
                        <p className="text-sm text-gray-600">Expires 12/25</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Update</Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}