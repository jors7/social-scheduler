'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import {
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

type Tab = 'applications' | 'active' | 'suspended' | 'payouts' | 'analytics';

interface Application {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  company?: string;
  website?: string;
  application_reason: string;
  audience_size: string;
  primary_platform: string;
  promotional_methods: string[];
  social_media_profiles: Array<{ platform: string; url: string; followers: string }>;
  affiliate_experience: string;
  created_at: string;
}

interface Affiliate {
  id: string;
  user_id: string;
  referral_code: string;
  total_earnings: number;
  pending_balance: number;
  paid_balance: number;
  commission_rate: number;
  paypal_email: string;
  status: string;
  created_at: string;
  updated_at?: string;
  conversions_count?: number;
  application?: {
    first_name: string;
    last_name: string;
    email: string;
    company?: string;
    website?: string;
    application_reason: string;
    audience_size: string;
    primary_platform: string;
    promotional_methods: string[];
    social_media_profiles: Array<{ platform: string; url: string; followers: string }>;
    affiliate_experience: string;
    created_at: string;
  };
}

interface Payout {
  id: string;
  affiliate_id: string;
  amount: number;
  payout_method: string;
  status: string;
  requested_at: string;
  affiliate?: {
    referral_code: string;
    paypal_email: string;
  };
}

export default function AdminAffiliatesPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<Tab>('applications');
  const [loading, setLoading] = useState(true);

  // Applications
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  // Active Affiliates
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);

  // Suspended Affiliates
  const [suspendedAffiliates, setSuspendedAffiliates] = useState<Affiliate[]>([]);

  // Payouts
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [selectedPayouts, setSelectedPayouts] = useState<Set<string>>(new Set());

  // Analytics
  const [analytics, setAnalytics] = useState({
    total_affiliates: 0,
    active_affiliates: 0,
    pending_applications: 0,
    total_commissions_paid: 0,
    pending_payouts_amount: 0,
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'applications') {
        await loadApplications();
      } else if (activeTab === 'active') {
        await loadAffiliates();
      } else if (activeTab === 'suspended') {
        await loadSuspendedAffiliates();
      } else if (activeTab === 'payouts') {
        await loadPayouts();
      } else if (activeTab === 'analytics') {
        await loadAnalytics();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function loadApplications() {
    const { data, error } = await supabase
      .from('affiliate_applications')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading applications:', error);
      return;
    }

    setApplications(data || []);
  }

  async function loadAffiliates() {
    // Get active affiliates
    const { data: affiliates, error } = await supabase
      .from('affiliates')
      .select('*')
      .eq('status', 'active')
      .order('total_earnings', { ascending: false });

    if (error) {
      console.error('Error loading affiliates:', error);
      return;
    }

    if (!affiliates || affiliates.length === 0) {
      setAffiliates([]);
      return;
    }

    // Get application data and conversion counts for each affiliate
    const affiliatesWithDetails = await Promise.all(
      affiliates.map(async (affiliate: any) => {
        // Get application by user_id
        const { data: application } = await supabase
          .from('affiliate_applications')
          .select('first_name, last_name, email, company, website, application_reason, audience_size, primary_platform, promotional_methods, social_media_profiles, affiliate_experience, created_at')
          .eq('user_id', affiliate.user_id)
          .single();

        // Get conversion count
        const { count } = await supabase
          .from('affiliate_conversions')
          .select('*', { count: 'exact', head: true })
          .eq('affiliate_id', affiliate.id)
          .neq('status', 'refunded');

        return {
          ...affiliate,
          application: application || null,
          conversions_count: count || 0,
        };
      })
    );

    setAffiliates(affiliatesWithDetails);
  }

  async function loadSuspendedAffiliates() {
    // Get suspended affiliates
    const { data: affiliates, error } = await supabase
      .from('affiliates')
      .select('*')
      .eq('status', 'suspended')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading suspended affiliates:', error);
      return;
    }

    if (!affiliates || affiliates.length === 0) {
      setSuspendedAffiliates([]);
      return;
    }

    // Get application data and conversion counts for each affiliate
    const affiliatesWithDetails = await Promise.all(
      affiliates.map(async (affiliate: any) => {
        // Get application by user_id
        const { data: application } = await supabase
          .from('affiliate_applications')
          .select('first_name, last_name, email, company, website, application_reason, audience_size, primary_platform, promotional_methods, social_media_profiles, affiliate_experience, created_at')
          .eq('user_id', affiliate.user_id)
          .single();

        // Get conversion count
        const { count } = await supabase
          .from('affiliate_conversions')
          .select('*', { count: 'exact', head: true })
          .eq('affiliate_id', affiliate.id)
          .neq('status', 'refunded');

        return {
          ...affiliate,
          application: application || null,
          conversions_count: count || 0,
        };
      })
    );

    setSuspendedAffiliates(affiliatesWithDetails);
  }

  async function loadPayouts() {
    const { data, error } = await supabase
      .from('affiliate_payouts')
      .select(`
        *,
        affiliate:affiliate_id (
          referral_code,
          paypal_email
        )
      `)
      .eq('status', 'pending')
      .order('requested_at', { ascending: true });

    if (error) {
      console.error('Error loading payouts:', error);
      return;
    }

    setPayouts(data || []);
  }

  async function loadAnalytics() {
    // Get total affiliates
    const { count: totalAffiliates } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true });

    // Get active affiliates
    const { count: activeAffiliates } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get pending applications
    const { count: pendingApplications } = await supabase
      .from('affiliate_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get total commissions paid
    const { data: affiliatesData } = await supabase
      .from('affiliates')
      .select('paid_balance');

    const totalCommissionsPaid = affiliatesData?.reduce(
      (sum, a) => sum + (a.paid_balance || 0),
      0
    ) || 0;

    // Get pending payouts amount
    const { data: payoutsData } = await supabase
      .from('affiliate_payouts')
      .select('amount')
      .eq('status', 'pending');

    const pendingPayoutsAmount = payoutsData?.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    ) || 0;

    setAnalytics({
      total_affiliates: totalAffiliates || 0,
      active_affiliates: activeAffiliates || 0,
      pending_applications: pendingApplications || 0,
      total_commissions_paid: totalCommissionsPaid,
      pending_payouts_amount: pendingPayoutsAmount,
    });
  }

  async function handleApproveApplication(applicationId: string) {
    try {
      const response = await fetch('/api/admin/affiliates/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: applicationId, action: 'approve' }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Application approved!');
        setSelectedApplication(null);
        loadApplications();
      } else {
        toast.error(data.error || 'Failed to approve application');
      }
    } catch (error) {
      console.error('Error approving application:', error);
      toast.error('Failed to approve application');
    }
  }

  async function handleRejectApplication(applicationId: string, reason: string) {
    try {
      const response = await fetch('/api/admin/affiliates/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: applicationId,
          action: 'reject',
          rejection_reason: reason,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Application rejected');
        setSelectedApplication(null);
        loadApplications();
      } else {
        toast.error(data.error || 'Failed to reject application');
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Failed to reject application');
    }
  }

  async function handleProcessPayouts() {
    if (selectedPayouts.size === 0) {
      toast.error('Please select at least one payout');
      return;
    }

    const confirmed = confirm(
      `Process ${selectedPayouts.size} payout(s) via PayPal?\n\nThis will initiate PayPal transactions.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch('/api/admin/affiliates/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payout_ids: Array.from(selectedPayouts),
          method: 'paypal',
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Successfully processed ${data.processed} payout(s)`);
        setSelectedPayouts(new Set());
        loadPayouts();
      } else {
        toast.error(data.error || 'Failed to process payouts');
      }
    } catch (error) {
      console.error('Error processing payouts:', error);
      toast.error('Failed to process payouts');
    }
  }

  function togglePayoutSelection(payoutId: string) {
    const newSelected = new Set(selectedPayouts);
    if (newSelected.has(payoutId)) {
      newSelected.delete(payoutId);
    } else {
      newSelected.add(payoutId);
    }
    setSelectedPayouts(newSelected);
  }

  async function handleSuspendAffiliate(affiliateId: string) {
    const reason = prompt('Reason for suspension (optional):');
    if (reason === null) return; // User cancelled

    const confirmed = confirm('Are you sure you want to suspend this affiliate?');
    if (!confirmed) return;

    console.log('Suspending affiliate:', affiliateId);

    try {
      const response = await fetch('/api/admin/affiliates/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliate_id: affiliateId,
          action: 'suspend',
          reason: reason || undefined,
        }),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        toast.success('Affiliate suspended successfully');
        await loadAffiliates();
      } else {
        console.error('API error:', data.error);
        toast.error(data.error || 'Failed to suspend affiliate');
      }
    } catch (error) {
      console.error('Error suspending affiliate:', error);
      toast.error('Failed to suspend affiliate');
    }
  }

  async function handleReactivateAffiliate(affiliateId: string) {
    const confirmed = confirm('Reactivate this affiliate?');
    if (!confirmed) return;

    try {
      const response = await fetch('/api/admin/affiliates/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliate_id: affiliateId,
          action: 'reactivate',
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Affiliate reactivated successfully');
        loadSuspendedAffiliates();
      } else {
        toast.error(data.error || 'Failed to reactivate affiliate');
      }
    } catch (error) {
      console.error('Error reactivating affiliate:', error);
      toast.error('Failed to reactivate affiliate');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Affiliate Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage applications, affiliates, and payouts</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('applications')}
              className={`${
                activeTab === 'applications'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <ClockIcon className="h-5 w-5" />
              Pending Applications
              {applications.length > 0 && (
                <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full text-xs">
                  {applications.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('active')}
              className={`${
                activeTab === 'active'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <UserGroupIcon className="h-5 w-5" />
              Active Affiliates
            </button>

            <button
              onClick={() => setActiveTab('suspended')}
              className={`${
                activeTab === 'suspended'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <XCircleIcon className="h-5 w-5" />
              Suspended
              {suspendedAffiliates.length > 0 && (
                <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs">
                  {suspendedAffiliates.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('payouts')}
              className={`${
                activeTab === 'payouts'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <CurrencyDollarIcon className="h-5 w-5" />
              Payout Queue
              {payouts.length > 0 && (
                <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-xs">
                  {payouts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`${
                activeTab === 'analytics'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <ChartBarIcon className="h-5 w-5" />
              Analytics
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-600">Loading...</div>
          </div>
        ) : (
          <>
            {/* Applications Tab */}
            {activeTab === 'applications' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Pending Applications ({applications.length})
                  </h2>
                </div>

                {applications.length === 0 ? (
                  <div className="px-6 py-12 text-center text-gray-500">
                    <ClockIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No pending applications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {applications.map((app) => (
                      <div key={app.id} className="px-6 py-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-gray-900">
                              {app.first_name} {app.last_name}
                            </h3>
                            <p className="text-sm text-gray-600">{app.email}</p>
                            {app.company && (
                              <p className="text-sm text-gray-600">{app.company}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              Applied {new Date(app.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedApplication(app)}
                              className="px-4 py-2 text-sm text-purple-600 hover:text-purple-700 border border-purple-600 rounded-lg"
                            >
                              Review
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Audience:</span>{' '}
                            <span className="text-gray-900">{app.audience_size}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Platform:</span>{' '}
                            <span className="text-gray-900">{app.primary_platform}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Experience:</span>{' '}
                            <span className="text-gray-900">{app.affiliate_experience}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Profiles:</span>{' '}
                            <span className="text-gray-900">
                              {app.social_media_profiles.length}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Active Affiliates Tab */}
            {activeTab === 'active' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Active Affiliates ({affiliates.length})
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          PayPal Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Earnings
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Pending
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Paid
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Conversions
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {affiliates.map((affiliate) => (
                        <tr key={affiliate.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {affiliate.application
                              ? `${affiliate.application.first_name} ${affiliate.application.last_name}`
                              : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {affiliate.application?.email || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {affiliate.paypal_email || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-purple-600">
                            {affiliate.referral_code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${affiliate.total_earnings.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600">
                            ${affiliate.pending_balance.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                            ${affiliate.paid_balance.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {affiliate.conversions_count || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {affiliate.commission_rate}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSelectedAffiliate(affiliate)}
                                className="text-purple-600 hover:text-purple-900 font-medium"
                              >
                                View Details
                              </button>
                              <button
                                onClick={() => handleSuspendAffiliate(affiliate.id)}
                                className="text-red-600 hover:text-red-900 font-medium"
                              >
                                Suspend
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Suspended Affiliates Tab */}
            {activeTab === 'suspended' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Suspended Affiliates ({suspendedAffiliates.length})
                  </h2>
                </div>

                {suspendedAffiliates.length === 0 ? (
                  <div className="px-6 py-12 text-center text-gray-500">
                    <XCircleIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No suspended affiliates</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Code
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Total Earnings
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Conversions
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Suspended
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {suspendedAffiliates.map((affiliate) => (
                          <tr key={affiliate.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {affiliate.application
                                ? `${affiliate.application.first_name} ${affiliate.application.last_name}`
                                : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {affiliate.application?.email || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-400">
                              {affiliate.referral_code}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${affiliate.total_earnings.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {affiliate.conversions_count || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {affiliate.updated_at
                                ? new Date(affiliate.updated_at).toLocaleDateString()
                                : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setSelectedAffiliate(affiliate)}
                                  className="text-purple-600 hover:text-purple-900 font-medium"
                                >
                                  View Details
                                </button>
                                <button
                                  onClick={() => handleReactivateAffiliate(affiliate.id)}
                                  className="text-green-600 hover:text-green-900 font-medium"
                                >
                                  Reactivate
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Payouts Tab */}
            {activeTab === 'payouts' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Payout Queue ({payouts.length})
                  </h2>
                  {selectedPayouts.size > 0 && (
                    <button
                      onClick={handleProcessPayouts}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Process {selectedPayouts.size} via PayPal
                    </button>
                  )}
                </div>

                {payouts.length === 0 ? (
                  <div className="px-6 py-12 text-center text-gray-500">
                    <CurrencyDollarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No pending payouts</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPayouts(new Set(payouts.map(p => p.id)));
                              } else {
                                setSelectedPayouts(new Set());
                              }
                            }}
                            checked={selectedPayouts.size === payouts.length}
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Affiliate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          PayPal Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Requested
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payouts.map((payout) => (
                        <tr key={payout.id}>
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedPayouts.has(payout.id)}
                              onChange={() => togglePayoutSelection(payout.id)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {payout.affiliate?.referral_code || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            ${payout.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {payout.affiliate?.paypal_email || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(payout.requested_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Affiliates</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {analytics.total_affiliates}
                      </p>
                      <p className="text-sm text-green-600 mt-1">
                        {analytics.active_affiliates} active
                      </p>
                    </div>
                    <UserGroupIcon className="h-12 w-12 text-purple-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Pending Applications</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {analytics.pending_applications}
                      </p>
                    </div>
                    <ClockIcon className="h-12 w-12 text-yellow-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Paid Out</p>
                      <p className="text-3xl font-bold text-gray-900">
                        ${analytics.total_commissions_paid.toFixed(2)}
                      </p>
                    </div>
                    <CurrencyDollarIcon className="h-12 w-12 text-green-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Pending Payouts</p>
                      <p className="text-3xl font-bold text-purple-600">
                        ${analytics.pending_payouts_amount.toFixed(2)}
                      </p>
                    </div>
                    <CurrencyDollarIcon className="h-12 w-12 text-purple-500" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Application Detail Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Application Review</h2>
              <button
                onClick={() => setSelectedApplication(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedApplication.first_name} {selectedApplication.last_name}
                </h3>
                <p className="text-sm text-gray-600">{selectedApplication.email}</p>
                {selectedApplication.company && (
                  <p className="text-sm text-gray-600">{selectedApplication.company}</p>
                )}
                {selectedApplication.website && (
                  <a
                    href={selectedApplication.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple-600 hover:text-purple-700"
                  >
                    {selectedApplication.website} →
                  </a>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-2">Audience</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Size:</span>{' '}
                    <span className="text-gray-900">{selectedApplication.audience_size}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Platform:</span>{' '}
                    <span className="text-gray-900">{selectedApplication.primary_platform}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Experience:</span>{' '}
                    <span className="text-gray-900">{selectedApplication.affiliate_experience}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-2">Social Media Profiles</h4>
                <div className="space-y-2">
                  {selectedApplication.social_media_profiles.map((profile, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="font-medium">{profile.platform}:</span>{' '}
                      <a
                        href={profile.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-700"
                      >
                        {profile.url}
                      </a>{' '}
                      <span className="text-gray-500">({profile.followers} followers)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-2">Promotional Methods</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedApplication.promotional_methods.map((method, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                    >
                      {method}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-2">Why SocialCal?</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedApplication.application_reason}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  const reason = prompt('Rejection reason (optional):');
                  if (reason !== null) {
                    handleRejectApplication(selectedApplication.id, reason);
                  }
                }}
                className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2"
              >
                <XCircleIcon className="h-5 w-5" />
                Reject
              </button>
              <button
                onClick={() => handleApproveApplication(selectedApplication.id)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <CheckCircleIcon className="h-5 w-5" />
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Affiliate Details Modal */}
      {selectedAffiliate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Affiliate Details</h2>
              <button
                onClick={() => setSelectedAffiliate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-4 space-y-6">
              {/* Personal Information Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Personal Information</h3>
                {selectedAffiliate.application ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 font-medium">Full Name:</span>{' '}
                      <span className="text-gray-900">
                        {selectedAffiliate.application.first_name} {selectedAffiliate.application.last_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">Email:</span>{' '}
                      <span className="text-gray-900">{selectedAffiliate.application.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">PayPal Email:</span>{' '}
                      <span className="text-gray-900">{selectedAffiliate.paypal_email || 'Not set'}</span>
                    </div>
                    {selectedAffiliate.application.company && (
                      <div>
                        <span className="text-gray-500 font-medium">Company:</span>{' '}
                        <span className="text-gray-900">{selectedAffiliate.application.company}</span>
                      </div>
                    )}
                    {selectedAffiliate.application.website && (
                      <div className="col-span-2">
                        <span className="text-gray-500 font-medium">Website:</span>{' '}
                        <a
                          href={selectedAffiliate.application.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-700"
                        >
                          {selectedAffiliate.application.website} →
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Application details not available</p>
                )}
              </div>

              {/* Performance Stats Section */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Performance Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-1">Referral Code</div>
                    <div className="text-lg font-semibold text-purple-600 font-mono">
                      {selectedAffiliate.referral_code}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-1">Commission Rate</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {selectedAffiliate.commission_rate}%
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-sm text-green-600 mb-1">Total Earnings</div>
                    <div className="text-lg font-semibold text-green-700">
                      ${selectedAffiliate.total_earnings.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-sm text-purple-600 mb-1">Pending Balance</div>
                    <div className="text-lg font-semibold text-purple-700">
                      ${selectedAffiliate.pending_balance.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm text-blue-600 mb-1">Paid Out</div>
                    <div className="text-lg font-semibold text-blue-700">
                      ${selectedAffiliate.paid_balance.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-1">Conversions</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {selectedAffiliate.conversions_count || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Application Details Section */}
              {selectedAffiliate.application && (
                <>
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Application Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 font-medium">Audience Size:</span>{' '}
                        <span className="text-gray-900">{selectedAffiliate.application.audience_size}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium">Primary Platform:</span>{' '}
                        <span className="text-gray-900">{selectedAffiliate.application.primary_platform}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500 font-medium">Affiliate Experience:</span>{' '}
                        <span className="text-gray-900">{selectedAffiliate.application.affiliate_experience}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Social Media Profiles</h4>
                    <div className="space-y-2">
                      {selectedAffiliate.application.social_media_profiles.map((profile, idx) => (
                        <div key={idx} className="text-sm bg-gray-50 rounded-lg p-3">
                          <span className="font-medium text-gray-900">{profile.platform}:</span>{' '}
                          <a
                            href={profile.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:text-purple-700"
                          >
                            {profile.url}
                          </a>{' '}
                          <span className="text-gray-500">({profile.followers} followers)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Promotional Methods</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedAffiliate.application.promotional_methods.map((method, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                        >
                          {method}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Why They Applied</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4">
                      {selectedAffiliate.application.application_reason}
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <div className="text-xs text-gray-500">
                      Application submitted on {new Date(selectedAffiliate.application.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedAffiliate(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
