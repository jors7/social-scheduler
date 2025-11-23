'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  UserGroupIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import type { AffiliateApplicationForm } from '@/types/affiliate';

export default function AffiliateSignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AffiliateApplicationForm>({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirm: '',
    company: '',
    website: '',
    payout_method: 'paypal',
    paypal_email: '',
    application_reason: '',
    audience_size: '',
    primary_platform: '',
    promotional_methods: [],
    social_media_profiles: [{ platform: '', url: '', followers: '' }],
    affiliate_experience: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const validatePassword = (password: string) => {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    return errors;
  };

  const handlePasswordChange = (password: string) => {
    setFormData({ ...formData, password });
    setPasswordErrors(validatePassword(password));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password
    const errors = validatePassword(formData.password);
    if (errors.length > 0) {
      setPasswordErrors(errors);
      toast.error('Please fix password errors');
      return;
    }

    // Check password confirmation
    if (formData.password !== formData.password_confirm) {
      toast.error('Passwords do not match');
      return;
    }

    // Validate application reason (100-500 chars)
    if (!formData.application_reason || formData.application_reason.length < 100) {
      toast.error('Application reason must be at least 100 characters');
      return;
    }
    if (formData.application_reason.length > 500) {
      toast.error('Application reason must be less than 500 characters');
      return;
    }

    // Validate promotional methods (at least one required)
    if (formData.promotional_methods.length === 0) {
      toast.error('Please select at least one promotional method');
      return;
    }

    // Validate social media profiles (at least one with platform and URL)
    const validProfiles = formData.social_media_profiles.filter(
      p => p.platform && p.url && p.followers
    );
    if (validProfiles.length === 0) {
      toast.error('Please add at least one social media profile');
      return;
    }

    // Validate required fields
    if (!formData.audience_size || !formData.primary_platform || !formData.affiliate_experience) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      // Prepare data with only valid social media profiles
      const submitData = {
        ...formData,
        social_media_profiles: formData.social_media_profiles.filter(
          p => p.platform && p.url && p.followers
        ),
      };

      const response = await fetch('/api/affiliate/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Application submitted successfully! We\'ll review it within 24-48 hours and send you an email when approved.');

        setTimeout(() => {
          router.push('/affiliate/login?message=Application submitted - you\'ll receive approval email within 24-48 hours');
        }, 2000);
      } else {
        toast.error(data.error || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Join the SocialCal Affiliate Program
          </h1>
          <p className="text-xl text-gray-300">
            Earn 30% lifetime recurring commission on every referral
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 text-center">
            <CurrencyDollarIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">30% Commission</h3>
            <p className="text-gray-300 text-sm">
              Lifetime recurring commissions on all subscription payments
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 text-center">
            <ChartBarIcon className="h-12 w-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Real-time Tracking</h3>
            <p className="text-gray-300 text-sm">
              Dashboard with detailed analytics and conversion tracking
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 text-center">
            <SparklesIcon className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Easy Payouts</h3>
            <p className="text-gray-300 text-sm">
              Get paid via PayPal with $50 minimum
            </p>
          </div>
        </div>

        {/* Application Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Apply Now</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-200 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  id="first_name"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-gray-300/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="John"
                />
              </div>

              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-200 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  id="last_name"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-gray-300/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                Email *
              </label>
              <input
                type="email"
                id="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-white/10 border border-gray-300/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="john@example.com"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  id="password"
                  required
                  value={formData.password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-gray-300/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="••••••••"
                />
                {passwordErrors.length > 0 && (
                  <ul className="mt-2 text-xs text-red-400 space-y-1">
                    {passwordErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-200 mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  id="password_confirm"
                  required
                  value={formData.password_confirm}
                  onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-gray-300/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="••••••••"
                />
                {formData.password_confirm && formData.password !== formData.password_confirm && (
                  <p className="mt-2 text-xs text-red-400">Passwords do not match</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-200 mb-2">
                  Company (Optional)
                </label>
                <input
                  type="text"
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-gray-300/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Your Company"
                />
              </div>

              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-200 mb-2">
                  Website (Optional)
                </label>
                <input
                  type="url"
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-gray-300/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Payout Method *
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="paypal"
                    checked={formData.payout_method === 'paypal'}
                    onChange={(e) => setFormData({ ...formData, payout_method: e.target.value as 'paypal' })}
                    className="mr-3 h-4 w-4 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-gray-200">PayPal (Recommended - Instant Setup)</span>
                </label>
              </div>
            </div>

            {formData.payout_method === 'paypal' && (
              <div>
                <label htmlFor="paypal_email" className="block text-sm font-medium text-gray-200 mb-2">
                  PayPal Email *
                </label>
                <input
                  type="email"
                  id="paypal_email"
                  required={formData.payout_method === 'paypal'}
                  value={formData.paypal_email}
                  onChange={(e) => setFormData({ ...formData, paypal_email: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-gray-300/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="paypal@example.com"
                />
                <p className="mt-2 text-sm text-gray-400">
                  Make sure this is your active PayPal email address
                </p>
              </div>
            )}

            {/* About Your Audience Section */}
            <div className="border-t border-gray-300/20 pt-6">
              <h3 className="text-xl font-semibold text-white mb-4">About Your Audience</h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="audience_size" className="block text-sm font-medium text-gray-200 mb-2">
                    Audience Size *
                  </label>
                  <select
                    id="audience_size"
                    required
                    value={formData.audience_size}
                    onChange={(e) => setFormData({ ...formData, audience_size: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-gray-300/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select audience size</option>
                    <option value="< 1k">Less than 1,000</option>
                    <option value="1k-10k">1,000 - 10,000</option>
                    <option value="10k-50k">10,000 - 50,000</option>
                    <option value="50k-100k">50,000 - 100,000</option>
                    <option value="100k+">100,000+</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="primary_platform" className="block text-sm font-medium text-gray-200 mb-2">
                    Primary Platform *
                  </label>
                  <select
                    id="primary_platform"
                    required
                    value={formData.primary_platform}
                    onChange={(e) => setFormData({ ...formData, primary_platform: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-gray-300/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select primary platform</option>
                    <option value="Instagram">Instagram</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Blog/Website">Blog/Website</option>
                    <option value="Email List">Email List</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Twitter/X">Twitter/X</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Social Media Profiles * (At least one required)
                </label>
                {formData.social_media_profiles.map((profile, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 mb-3">
                    <div className="col-span-3">
                      <select
                        value={profile.platform}
                        onChange={(e) => {
                          const newProfiles = [...formData.social_media_profiles];
                          newProfiles[index].platform = e.target.value;
                          setFormData({ ...formData, social_media_profiles: newProfiles });
                        }}
                        className="w-full px-3 py-2 bg-white/10 border border-gray-300/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      >
                        <option value="">Platform</option>
                        <option value="Instagram">Instagram</option>
                        <option value="YouTube">YouTube</option>
                        <option value="Blog">Blog</option>
                        <option value="TikTok">TikTok</option>
                        <option value="Twitter/X">Twitter/X</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Facebook">Facebook</option>
                      </select>
                    </div>
                    <div className="col-span-5">
                      <input
                        type="url"
                        placeholder="Profile URL"
                        value={profile.url}
                        onChange={(e) => {
                          const newProfiles = [...formData.social_media_profiles];
                          newProfiles[index].url = e.target.value;
                          setFormData({ ...formData, social_media_profiles: newProfiles });
                        }}
                        className="w-full px-3 py-2 bg-white/10 border border-gray-300/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        placeholder="Followers"
                        value={profile.followers}
                        onChange={(e) => {
                          const newProfiles = [...formData.social_media_profiles];
                          newProfiles[index].followers = e.target.value;
                          setFormData({ ...formData, social_media_profiles: newProfiles });
                        }}
                        className="w-full px-3 py-2 bg-white/10 border border-gray-300/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                    </div>
                    <div className="col-span-1 flex items-center">
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newProfiles = formData.social_media_profiles.filter((_, i) => i !== index);
                            setFormData({ ...formData, social_media_profiles: newProfiles });
                          }}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {formData.social_media_profiles.length < 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        social_media_profiles: [
                          ...formData.social_media_profiles,
                          { platform: '', url: '', followers: '' }
                        ]
                      });
                    }}
                    className="text-purple-400 hover:text-purple-300 text-sm"
                  >
                    + Add another profile (up to 3)
                  </button>
                )}
              </div>
            </div>

            {/* Promotional Strategy Section */}
            <div className="border-t border-gray-300/20 pt-6">
              <h3 className="text-xl font-semibold text-white mb-4">Promotional Strategy</h3>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  How will you promote SocialCal? * (Select all that apply)
                </label>
                <div className="space-y-2">
                  {['Social Media Posts', 'Blog Reviews', 'Email Marketing', 'YouTube Videos', 'Paid Ads', 'SEO/Organic', 'Other'].map((method) => (
                    <label key={method} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.promotional_methods.includes(method)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              promotional_methods: [...formData.promotional_methods, method]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              promotional_methods: formData.promotional_methods.filter(m => m !== method)
                            });
                          }
                        }}
                        className="mr-3 h-4 w-4 text-purple-600 focus:ring-purple-500 rounded"
                      />
                      <span className="text-gray-200">{method}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <label htmlFor="affiliate_experience" className="block text-sm font-medium text-gray-200 mb-2">
                  Affiliate Marketing Experience *
                </label>
                <select
                  id="affiliate_experience"
                  required
                  value={formData.affiliate_experience}
                  onChange={(e) => setFormData({ ...formData, affiliate_experience: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-gray-300/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select experience level</option>
                  <option value="First time">First time (This is my first affiliate program)</option>
                  <option value="Less than 1 year">Less than 1 year</option>
                  <option value="1-3 years">1-3 years</option>
                  <option value="3+ years">3+ years</option>
                </select>
              </div>
            </div>

            {/* Application Section */}
            <div className="border-t border-gray-300/20 pt-6">
              <h3 className="text-xl font-semibold text-white mb-4">Application</h3>

              <div>
                <label htmlFor="application_reason" className="block text-sm font-medium text-gray-200 mb-2">
                  Why do you want to promote SocialCal? * (100-500 characters)
                </label>
                <textarea
                  id="application_reason"
                  required
                  rows={5}
                  value={formData.application_reason}
                  onChange={(e) => setFormData({ ...formData, application_reason: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-gray-300/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Tell us about your audience, why SocialCal is a good fit for them, and how you plan to promote it..."
                />
                <p className="mt-2 text-sm text-gray-400">
                  {formData.application_reason.length} / 500 characters
                  {formData.application_reason.length < 100 && formData.application_reason.length > 0 && (
                    <span className="text-yellow-400"> (minimum 100 characters)</span>
                  )}
                </p>
              </div>
            </div>

            <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">What happens next?</h3>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Your application will be submitted for admin review</li>
                <li>• We'll review your application within 24-48 hours</li>
                <li>• Once approved, you'll receive an email with login instructions</li>
                <li>• You'll get your unique referral code and start earning!</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
