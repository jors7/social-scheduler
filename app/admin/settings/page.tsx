'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { 
  Settings, 
  Shield,
  Bell,
  Database,
  Zap,
  Globe,
  Lock,
  Save,
  Loader2
} from 'lucide-react'

interface SettingsState {
  require_2fa_admins?: { enabled: boolean }
  auto_logout?: { enabled: boolean, timeout_minutes: number }
  audit_logging?: { enabled: boolean }
  max_posts_per_user?: { limit: number }
  max_social_accounts?: { limit: number }
  trial_period_days?: { days: number }
  storage_limit_mb?: { limit: number }
  notify_new_signups?: { enabled: boolean }
  notify_payment_issues?: { enabled: boolean }
  notify_system_errors?: { enabled: boolean }
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings')
      if (!response.ok) throw new Error('Failed to fetch settings')
      
      const data = await response.json()
      setSettings(data)
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setSaving(true)
      
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      })
      
      if (!response.ok) throw new Error('Failed to save settings')
      
      toast.success('Settings saved successfully')
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
    setHasChanges(true)
  }

  const handleSwitchChange = (key: string, checked: boolean) => {
    updateSetting(key, { enabled: checked })
  }

  const handleNumberChange = (key: string, field: string, value: string) => {
    const numValue = parseInt(value) || 0
    updateSetting(key, { [field]: numValue })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Settings</h2>
          <p className="text-muted-foreground">
            Configure system-wide settings and preferences
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        )}
      </div>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Configure security and access control settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="two-factor">Require 2FA for Admins</Label>
              <p className="text-sm text-gray-500">Enforce two-factor authentication for all admin accounts</p>
            </div>
            <Switch 
              id="two-factor"
              checked={settings.require_2fa_admins?.enabled || false}
              onCheckedChange={(checked) => handleSwitchChange('require_2fa_admins', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-logout">Auto Logout</Label>
              <p className="text-sm text-gray-500">Automatically logout inactive admin sessions</p>
            </div>
            <Switch 
              id="auto-logout"
              checked={settings.auto_logout?.enabled !== false}
              onCheckedChange={(checked) => 
                updateSetting('auto_logout', { 
                  ...settings.auto_logout, 
                  enabled: checked 
                })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="audit-log">Enable Audit Logging</Label>
              <p className="text-sm text-gray-500">Log all admin actions for security audit</p>
            </div>
            <Switch 
              id="audit-log"
              checked={settings.audit_logging?.enabled !== false}
              onCheckedChange={(checked) => handleSwitchChange('audit_logging', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            System Configuration
          </CardTitle>
          <CardDescription>
            Configure system behavior and limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="max-posts">Max Posts per User</Label>
              <Input 
                id="max-posts" 
                type="number" 
                value={settings.max_posts_per_user?.limit || 1000}
                onChange={(e) => handleNumberChange('max_posts_per_user', 'limit', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="max-accounts">Max Social Accounts</Label>
              <Input 
                id="max-accounts" 
                type="number" 
                value={settings.max_social_accounts?.limit || 10}
                onChange={(e) => handleNumberChange('max_social_accounts', 'limit', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="trial-days">Trial Period (days)</Label>
              <Input 
                id="trial-days" 
                type="number" 
                value={settings.trial_period_days?.days || 7}
                onChange={(e) => handleNumberChange('trial_period_days', 'days', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="storage-limit">Storage Limit (MB)</Label>
              <Input 
                id="storage-limit" 
                type="number" 
                value={settings.storage_limit_mb?.limit || 500}
                onChange={(e) => handleNumberChange('storage_limit_mb', 'limit', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Configure admin notifications and alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="new-users">New User Signups</Label>
              <p className="text-sm text-gray-500">Get notified when new users sign up</p>
            </div>
            <Switch 
              id="new-users"
              checked={settings.notify_new_signups?.enabled || false}
              onCheckedChange={(checked) => handleSwitchChange('notify_new_signups', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="payment-issues">Payment Issues</Label>
              <p className="text-sm text-gray-500">Alert on failed payments or subscription issues</p>
            </div>
            <Switch 
              id="payment-issues"
              checked={settings.notify_payment_issues?.enabled !== false}
              onCheckedChange={(checked) => handleSwitchChange('notify_payment_issues', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="system-errors">System Errors</Label>
              <p className="text-sm text-gray-500">Alert on critical system errors</p>
            </div>
            <Switch 
              id="system-errors"
              checked={settings.notify_system_errors?.enabled !== false}
              onCheckedChange={(checked) => handleSwitchChange('notify_system_errors', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Database Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Database Maintenance
          </CardTitle>
          <CardDescription>
            Database optimization and cleanup tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Clean Orphaned Media</p>
              <p className="text-sm text-gray-500">Remove unused media files from storage</p>
            </div>
            <Button variant="outline" size="sm">
              Run Cleanup
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Clear Old Audit Logs</p>
              <p className="text-sm text-gray-500">Remove audit logs older than 90 days</p>
            </div>
            <Button variant="outline" size="sm">
              Clear Logs
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Optimize Database</p>
              <p className="text-sm text-gray-500">Run database vacuum and analyze</p>
            </div>
            <Button variant="outline" size="sm">
              Optimize
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}