'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  CreditCard,
  Download,
  Calendar,
  DollarSign,
  Check,
  X,
  Plus
} from 'lucide-react'

const mockInvoices = [
  {
    id: 'INV-001',
    date: '2024-01-01',
    amount: 29.99,
    status: 'paid',
    plan: 'Pro Plan',
    period: 'Jan 2024'
  },
  {
    id: 'INV-002',
    date: '2023-12-01',
    amount: 29.99,
    status: 'paid',
    plan: 'Pro Plan',
    period: 'Dec 2023'
  },
  {
    id: 'INV-003',
    date: '2023-11-01',
    amount: 29.99,
    status: 'paid',
    plan: 'Pro Plan',
    period: 'Nov 2023'
  },
]

export default function BillingPage() {
  const [paymentMethods, setPaymentMethods] = useState([
    {
      id: '1',
      type: 'visa',
      last4: '4242',
      expiry: '12/25',
      isDefault: true
    }
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-gray-600 mt-1">Manage your subscription and billing information</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your active subscription details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
            <div>
              <h3 className="text-2xl font-bold">Pro Plan</h3>
              <p className="text-gray-600">$29.99 / month</p>
              <p className="text-sm text-gray-500 mt-1">Next billing date: February 1, 2024</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-2">Status</div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <Check className="w-4 h-4 mr-1" />
                Active
              </span>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button variant="outline">
              Upgrade Plan
            </Button>
            <Button variant="outline">
              Cancel Subscription
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage This Month */}
      <Card>
        <CardHeader>
          <CardTitle>Usage This Month</CardTitle>
          <CardDescription>Track your current usage against plan limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Posts Published</span>
                <span className="text-sm text-gray-500">23 / 100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '23%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Social Accounts</span>
                <span className="text-sm text-gray-500">5 / 10</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '50%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Team Members</span>
                <span className="text-sm text-gray-500">2 / 5</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '40%' }}></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Manage your payment methods</CardDescription>
            </div>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Payment Method
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium">
                      •••• •••• •••• {method.last4}
                    </p>
                    <p className="text-sm text-gray-500">
                      Expires {method.expiry}
                      {method.isDefault && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Default
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>View and download your invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockInvoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">{invoice.id}</p>
                    <p className="text-sm text-gray-500">{invoice.plan} - {invoice.period}</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    {new Date(invoice.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium">${invoice.amount}</p>
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      <Check className="w-3 h-3 mr-1" />
                      Paid
                    </span>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Billing Information */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Information</CardTitle>
          <CardDescription>Update your billing address and tax information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Billing Address</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>123 Business Street</p>
                <p>Suite 100</p>
                <p>New York, NY 10001</p>
                <p>United States</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Tax Information</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Tax ID: Not provided</p>
                <p>VAT Number: Not applicable</p>
              </div>
            </div>
          </div>
          <Button variant="outline" className="mt-4">
            Update Billing Information
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}