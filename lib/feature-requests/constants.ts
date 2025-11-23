// Feature Requests System - Constants and Configuration

import type { FeatureCategory, FeatureStatus, FeaturePriority } from './types';

// ============================================================================
// FEATURE CATEGORIES
// ============================================================================

export interface CategoryConfig {
  id: FeatureCategory;
  name: string;
  icon: string;
  description: string;
  color: string;
}

export const FEATURE_CATEGORIES: CategoryConfig[] = [
  {
    id: 'analytics',
    name: 'Analytics & Reporting',
    icon: '📊',
    description: 'Better insights and performance metrics',
    color: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  {
    id: 'posting',
    name: 'Content Creation',
    icon: '✍️',
    description: 'Posting and scheduling features',
    color: 'bg-purple-100 text-purple-700 border-purple-200'
  },
  {
    id: 'ui_ux',
    name: 'User Interface',
    icon: '🎨',
    description: 'Design and usability improvements',
    color: 'bg-pink-100 text-pink-700 border-pink-200'
  },
  {
    id: 'integration',
    name: 'Platform Integration',
    icon: '🔗',
    description: 'New social media platforms',
    color: 'bg-green-100 text-green-700 border-green-200'
  },
  {
    id: 'automation',
    name: 'Automation',
    icon: '🤖',
    description: 'Automated workflows and actions',
    color: 'bg-orange-100 text-orange-700 border-orange-200'
  },
  {
    id: 'collaboration',
    name: 'Team Features',
    icon: '👥',
    description: 'Collaboration and team management',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200'
  },
  {
    id: 'ai_features',
    name: 'AI Features',
    icon: '✨',
    description: 'AI-powered tools and suggestions',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200'
  },
  {
    id: 'mobile',
    name: 'Mobile Experience',
    icon: '📱',
    description: 'Mobile app and responsiveness',
    color: 'bg-teal-100 text-teal-700 border-teal-200'
  },
  {
    id: 'other',
    name: 'Other',
    icon: '💡',
    description: 'Everything else',
    color: 'bg-gray-100 text-gray-700 border-gray-200'
  }
];

// ============================================================================
// FEATURE STATUSES
// ============================================================================

export interface StatusConfig {
  id: FeatureStatus;
  label: string;
  color: string;
  icon: string;
  description: string;
}

export const STATUS_CONFIG: Record<FeatureStatus, StatusConfig> = {
  submitted: {
    id: 'submitted',
    label: 'Submitted',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: '📝',
    description: 'Feature request has been submitted and is awaiting review'
  },
  under_review: {
    id: 'under_review',
    label: 'Under Review',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: '👀',
    description: 'Feature is being evaluated by our team'
  },
  planned: {
    id: 'planned',
    label: 'Planned',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: '📋',
    description: 'Feature is on our roadmap and will be built'
  },
  in_progress: {
    id: 'in_progress',
    label: 'In Progress',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: '🚧',
    description: 'Feature is currently being developed'
  },
  completed: {
    id: 'completed',
    label: 'Completed',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: '✅',
    description: 'Feature has been released and is available'
  },
  declined: {
    id: 'declined',
    label: 'Declined',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: '❌',
    description: 'Feature will not be implemented at this time'
  }
};

// ============================================================================
// PRIORITY LEVELS
// ============================================================================

export interface PriorityConfig {
  id: FeaturePriority;
  label: string;
  color: string;
  description: string;
}

export const PRIORITY_CONFIG: Record<FeaturePriority, PriorityConfig> = {
  low: {
    id: 'low',
    label: 'Low',
    color: 'bg-gray-100 text-gray-600',
    description: 'Nice to have, but not urgent'
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    color: 'bg-blue-100 text-blue-600',
    description: 'Important feature for many users'
  },
  high: {
    id: 'high',
    label: 'High',
    color: 'bg-orange-100 text-orange-600',
    description: 'Critical feature that many users need'
  },
  critical: {
    id: 'critical',
    label: 'Critical',
    color: 'bg-red-100 text-red-600',
    description: 'Urgent feature or bug fix needed ASAP'
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getCategoryConfig(categoryId: FeatureCategory): CategoryConfig {
  return FEATURE_CATEGORIES.find(c => c.id === categoryId) || FEATURE_CATEGORIES[FEATURE_CATEGORIES.length - 1];
}

export function getStatusConfig(statusId: FeatureStatus): StatusConfig {
  return STATUS_CONFIG[statusId];
}

export function getPriorityConfig(priorityId: FeaturePriority): PriorityConfig {
  return PRIORITY_CONFIG[priorityId];
}

// ============================================================================
// SORT OPTIONS
// ============================================================================

export type SortOption = 'votes' | 'newest' | 'oldest' | 'updated';

export interface SortConfig {
  id: SortOption;
  label: string;
  icon: string;
}

export const SORT_OPTIONS: SortConfig[] = [
  { id: 'votes', label: 'Most Voted', icon: '🔥' },
  { id: 'newest', label: 'Newest', icon: '🆕' },
  { id: 'oldest', label: 'Oldest', icon: '📅' },
  { id: 'updated', label: 'Recently Updated', icon: '🔄' }
];

// ============================================================================
// VALIDATION
// ============================================================================

export const VALIDATION = {
  TITLE_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 1000,
  TITLE_MIN_LENGTH: 5,
  MAX_VOTES_PER_USER: 50, // Optional rate limit
  MAX_CUSTOM_REQUESTS_PER_DAY: 3 // Optional rate limit
} as const;

// ============================================================================
// MESSAGES
// ============================================================================

export const MESSAGES = {
  VOTE_SUCCESS: 'Thanks for voting! Your feedback helps us prioritize.',
  UNVOTE_SUCCESS: 'Vote removed successfully.',
  REQUEST_SUBMITTED: 'Feature request submitted! We\'ll review it soon.',
  TITLE_TOO_SHORT: `Title must be at least ${VALIDATION.TITLE_MIN_LENGTH} characters`,
  TITLE_TOO_LONG: `Title must be less than ${VALIDATION.TITLE_MAX_LENGTH} characters`,
  DESCRIPTION_TOO_LONG: `Description must be less than ${VALIDATION.DESCRIPTION_MAX_LENGTH} characters`,
  CATEGORY_REQUIRED: 'Please select a category',
  ALREADY_VOTED: 'You\'ve already voted for this feature',
  ERROR_GENERIC: 'Something went wrong. Please try again.',
  ERROR_NOT_AUTHENTICATED: 'Please sign in to vote or submit requests',
  ERROR_LOADING: 'Failed to load feature requests',
  NOTIFICATION_MARKED_READ: 'Notification marked as read',
  ALL_NOTIFICATIONS_READ: 'All notifications marked as read'
} as const;
