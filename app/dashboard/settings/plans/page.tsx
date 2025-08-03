'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Check,
  Zap,
  Users,
  BarChart,
  Shield,
  Crown,
  Star
} from 'lucide-react'

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    billing: 'month',
    description: 'Perfect for individuals getting started',
    features: [
      'Up to 3 social accounts',
      '10 posts per month',
      'Basic analytics',
      'Email support',
      '1 team member'
    ],
    limits: {
      accounts: 3,
      posts: 10,
      teamMembers: 1,
      analytics: 'Basic'
    },
    popular: false,
    current: false
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29.99,
    billing: 'month',
    description: 'Great for professionals and small teams',
    features: [
      'Up to 10 social accounts',
      '100 posts per month',
      'Advanced analytics',
      'Priority support',
      '5 team members',
      'AI content suggestions',
      'Custom scheduling'
    ],
    limits: {
      accounts: 10,
      posts: 100,
      teamMembers: 5,
      analytics: 'Advanced'
    },
    popular: true,
    current: true
  },
  {
    id: 'business',
    name: 'Business',
    price: 79.99,
    billing: 'month',
    description: 'Ideal for growing businesses and agencies',
    features: [
      'Up to 25 social accounts',
      'Unlimited posts',
      'Advanced analytics & reporting',
      '24/7 priority support',
      '15 team members',
      'AI content suggestions',
      'Custom scheduling',
      'White-label options',
      'API access'
    ],
    limits: {
      accounts: 25,
      posts: 'Unlimited',
      teamMembers: 15,
      analytics: 'Advanced + Reporting'
    },
    popular: false,
    current: false
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199.99,
    billing: 'month',
    description: 'For large organizations with custom needs',
    features: [
      'Unlimited social accounts',
      'Unlimited posts',
      'Enterprise analytics',
      'Dedicated support manager',
      'Unlimited team members',
      'AI content suggestions',
      'Custom scheduling',
      'White-label options',
      'API access',
      'Custom integrations',
      'SLA guarantee'
    ],
    limits: {
      accounts: 'Unlimited',
      posts: 'Unlimited',
      teamMembers: 'Unlimited',
      analytics: 'Enterprise'
    },
    popular: false,
    current: false
  }
]

export default function PlansPage() {
  const [billingPeriod, setBillingPeriod] = useState<'month' | 'year'>('month')
  
  const getPrice = (plan: typeof plans[0]) => {
    if (plan.price === 0) return 'Free'
    const price = billingPeriod === 'year' ? plan.price * 10 : plan.price // 2 months free on yearly
    return `$${price.toFixed(2)}`
  }

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'starter': return Star
      case 'pro': return Zap
      case 'business': return BarChart
      case 'enterprise': return Crown
      default: return Star
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Choose Your Plan</h1>
        <p className="text-gray-600 mt-2">Select the perfect plan for your social media management needs</p>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setBillingPeriod('month')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingPeriod === 'month'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('year')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingPeriod === 'year'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Yearly
            <span className="ml-1 text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded">
              2 months free
            </span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const IconComponent = getPlanIcon(plan.id)
          
          return (
            <Card
              key={plan.id}
              className={`relative ${
                plan.popular
                  ? 'border-primary shadow-lg scale-105'
                  : plan.current
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-white text-sm font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              
              {plan.current && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white text-sm font-medium px-3 py-1 rounded-full">
                    Current Plan
                  </span>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-2">
                  <IconComponent className={`w-8 h-8 ${
                    plan.popular ? 'text-primary' : 'text-gray-400'
                  }`} />
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="text-3xl font-bold">
                  {getPrice(plan)}
                  {plan.price > 0 && (
                    <span className="text-sm font-normal text-gray-500">
                      /{billingPeriod}
                    </span>
                  )}
                </div>
                <CardDescription className="text-sm">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="pt-4 border-t">
                  {plan.current ? (
                    <Button className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : plan.id === 'enterprise' ? (
                    <Button variant="outline" className="w-full">
                      Contact Sales
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${
                        plan.popular
                          ? ''
                          : 'bg-gray-900 hover:bg-gray-800'
                      }`}
                    >
                      {plan.price === 0 ? 'Get Started' : 'Upgrade'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Feature Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Comparison</CardTitle>
          <CardDescription>Compare what&apos;s included in each plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Feature</th>
                  {plans.map((plan) => (
                    <th key={plan.id} className="text-center p-3 font-medium">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3">Social Accounts</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="text-center p-3">
                      {plan.limits.accounts}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3">Monthly Posts</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="text-center p-3">
                      {plan.limits.posts}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3">Team Members</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="text-center p-3">
                      {plan.limits.teamMembers}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3">Analytics</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="text-center p-3">
                      {plan.limits.analytics}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Can I change plans at any time?</h4>
              <p className="text-sm text-gray-600">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, 
                and you&apos;ll be prorated for the difference.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">What happens if I exceed my plan limits?</h4>
              <p className="text-sm text-gray-600">
                We&apos;ll notify you when approaching limits. If exceeded, you can upgrade your plan or 
                wait until the next billing cycle.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Is there a free trial?</h4>
              <p className="text-sm text-gray-600">
                Yes, all paid plans come with a 14-day free trial. No credit card required to start.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}