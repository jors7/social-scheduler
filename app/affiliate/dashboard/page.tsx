'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  LinkIcon,
  ClipboardDocumentCheckIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

interface AffiliateData {
  id: string;
  referral_code: string;
  total_earnings: number;
  pending_balance: number;
  paid_balance: number;
  commission_rate: number;
  status: string;
  paypal_email: string;
}

interface Stats {
  total_conversions: number;
  total_clicks: number;
  conversion_rate: number;
}

interface Conversion {
  id: string;
  commission_amount: number;
  created_at: string;
  status: string;
  customer_email?: string;
}

interface Click {
  id: string;
  created_at: string;
  referrer_url: string | null;
  converted: boolean;
}

interface PayoutHistory {
  id: string;
  amount: number;
  status: string;
  payout_method: string;
  requested_at: string;
  processed_at: string | null;
  paypal_batch_id: string | null;
}

// Helper function to extract domain from URL
function extractDomain(url: string | null): string {
  if (!url) return 'Direct';
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'Direct';
  }
}

// Helper function to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function AffiliateDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
  const [stats, setStats] = useState<Stats>({ total_conversions: 0, total_clicks: 0, conversion_rate: 0 });
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistory[]>([]);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [requestingPayout, setRequestingPayout] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
  const referralUrl = affiliateData ? `${baseUrl}?ref=${affiliateData.referral_code}` : '';

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/affiliate/login');
        return;
      }

      // Check if user is approved affiliate
      const userType = user.user_metadata?.user_type;
      if (userType !== 'affiliate' && userType !== 'both') {
        toast.error('Your affiliate application is pending approval');
        router.push('/affiliate/login');
        return;
      }

      // Get affiliate data
      const { data: affiliate, error: affiliateError } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (affiliateError || !affiliate) {
        toast.error('Affiliate profile not found. Please contact support.');
        return;
      }

      if (affiliate.status !== 'active') {
        toast.error('Your affiliate account is not active');
        return;
      }

      setAffiliateData(affiliate);

      // Get conversions count (exclude refunded and cancelled)
      const { count: conversionsCount } = await supabase
        .from('affiliate_conversions')
        .select('*', { count: 'exact', head: true })
        .eq('affiliate_id', affiliate.id)
        .not('status', 'in', '(refunded,cancelled)');

      // Get clicks count
      const { count: clicksCount } = await supabase
        .from('affiliate_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('affiliate_id', affiliate.id);

      const conversionRate = clicksCount && clicksCount > 0
        ? ((conversionsCount || 0) / clicksCount) * 100
        : 0;

      setStats({
        total_conversions: conversionsCount || 0,
        total_clicks: clicksCount || 0,
        conversion_rate: parseFloat(conversionRate.toFixed(2)),
      });

      // Get recent conversions
      const { data: conversionsData } = await supabase
        .from('affiliate_conversions')
        .select('id, commission_amount, created_at, status')
        .eq('affiliate_id', affiliate.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setConversions(conversionsData || []);

      // Get recent clicks
      const { data: clicksData } = await supabase
        .from('affiliate_clicks')
        .select('id, created_at, referrer_url, converted')
        .eq('affiliate_id', affiliate.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setClicks(clicksData || []);

      // Get payout history
      const { data: payoutData } = await supabase
        .from('affiliate_payouts')
        .select('id, amount, status, payout_method, requested_at, processed_at, paypal_batch_id')
        .eq('affiliate_id', affiliate.id)
        .order('requested_at', { ascending: false })
        .limit(10);

      setPayoutHistory(payoutData || []);

    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyLink() {
    if (!referralUrl) return;

    try {
      await navigator.clipboard.writeText(referralUrl);
      toast.success('Referral link copied!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  }

  async function handleRequestPayout() {
    if (!affiliateData) return;

    const amount = parseFloat(payoutAmount);
    const minPayout = parseFloat(process.env.NEXT_PUBLIC_AFFILIATE_MIN_PAYOUT || '50');

    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount < minPayout) {
      toast.error(`Minimum payout is $${minPayout}`);
      return;
    }

    if (amount > affiliateData.pending_balance) {
      toast.error(`Insufficient balance. Available: $${affiliateData.pending_balance.toFixed(2)}`);
      return;
    }

    setRequestingPayout(true);

    try {
      const response = await fetch('/api/affiliate/payout/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Payout requested successfully!');
        setPayoutAmount('');
        loadDashboardData(); // Refresh data
      } else {
        toast.error(data.error || 'Failed to request payout');
      }
    } catch (error) {
      console.error('Error requesting payout:', error);
      toast.error('Failed to request payout');
    } finally {
      setRequestingPayout(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/affiliate/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!affiliateData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Affiliate profile not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Affiliate Dashboard</h1>
              <p className="text-sm text-gray-600">Code: {affiliateData.referral_code}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${affiliateData.total_earnings.toFixed(2)}
                </p>
              </div>
              <CurrencyDollarIcon className="h-10 w-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Balance</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${affiliateData.pending_balance.toFixed(2)}
                </p>
              </div>
              <CurrencyDollarIcon className="h-10 w-10 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Paid Out</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${affiliateData.paid_balance.toFixed(2)}
                </p>
              </div>
              <ChartBarIcon className="h-10 w-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Conversions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total_conversions}
                </p>
                <p className="text-xs text-gray-500">
                  {stats.conversion_rate}% rate
                </p>
              </div>
              <ChartBarIcon className="h-10 w-10 text-indigo-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Clicks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total_clicks}
                </p>
                <p className="text-xs text-gray-500">
                  Link visits
                </p>
              </div>
              <LinkIcon className="h-10 w-10 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Referral Link */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Your Referral Link
            </h2>

            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={referralUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
                >
                  <ClipboardDocumentCheckIcon className="h-5 w-5" />
                  Copy
                </button>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 text-sm text-gray-700">
              <p className="font-semibold mb-2">💡 How to use:</p>
              <ul className="space-y-1 text-sm">
                <li>• Share this link on social media</li>
                <li>• Add to your email signature</li>
                <li>• Include in blog posts</li>
                <li>• Create QR codes for offline use</li>
              </ul>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Commission: <span className="font-bold text-purple-600">{affiliateData.commission_rate}%</span> recurring
              </p>
            </div>
          </div>

          {/* Request Payout */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CurrencyDollarIcon className="h-5 w-5" />
              Request Payout
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount to withdraw
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="50.00"
                  min="50"
                  step="0.01"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Available: ${affiliateData.pending_balance.toFixed(2)} • Minimum: $50.00
              </p>
            </div>

            <button
              onClick={handleRequestPayout}
              disabled={requestingPayout || affiliateData.pending_balance < 50}
              className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {requestingPayout ? 'Processing...' : 'Request Payout'}
            </button>

            <div className="mt-4 bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
              <p className="font-semibold mb-2">Payout Details:</p>
              <ul className="space-y-1 text-xs">
                <li>• Method: PayPal</li>
                <li>• Email: {affiliateData.paypal_email || 'Not set'}</li>
                <li>• Processing: 1-3 business days</li>
                <li>• Minimum: $50.00</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Recent Conversions */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Conversions</h2>
          </div>

          <div className="overflow-x-auto">
            {conversions.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No conversions yet</p>
                <p className="text-sm mt-2">Start sharing your referral link to earn commissions!</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {conversions.map((conversion) => (
                    <tr key={conversion.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(conversion.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        ${conversion.commission_amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          conversion.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : conversion.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {conversion.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Clicks */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Clicks</h2>
            <p className="text-sm text-gray-500 mt-1">Track where your traffic is coming from</p>
          </div>

          <div className="overflow-x-auto">
            {clicks.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                <LinkIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No clicks yet</p>
                <p className="text-sm mt-2">Share your referral link to start tracking clicks!</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Traffic Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clicks.map((click) => (
                    <tr key={click.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(click.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {extractDomain(click.referrer_url)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          click.converted
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {click.converted ? 'Converted' : 'Not converted'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Payout History */}
        <div className="bg-white rounded-lg shadow mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Payout History</h2>
            <p className="text-sm text-gray-500 mt-1">Track your payout requests and transactions</p>
          </div>

          <div className="overflow-x-auto">
            {payoutHistory.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                <CurrencyDollarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No payout requests yet</p>
                <p className="text-sm mt-2">Request a payout when your pending balance reaches $50</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Requested
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Processed Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payoutHistory.map((payout) => (
                    <tr key={payout.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(payout.requested_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${payout.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {payout.payout_method === 'paypal' ? 'PayPal' : payout.payout_method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          payout.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : payout.status === 'processing'
                            ? 'bg-blue-100 text-blue-800'
                            : payout.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {payout.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {payout.processed_at
                          ? new Date(payout.processed_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : '-'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
