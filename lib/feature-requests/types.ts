// Feature Requests System - Type Definitions

export type FeatureCategory =
  | 'analytics'
  | 'posting'
  | 'ui_ux'
  | 'integration'
  | 'automation'
  | 'collaboration'
  | 'ai_features'
  | 'mobile'
  | 'other';

export type FeatureStatus =
  | 'submitted'
  | 'under_review'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'declined';

export type FeaturePriority = 'low' | 'medium' | 'high' | 'critical';

export interface FeatureRequest {
  id: string;
  title: string;
  description: string | null;
  category: FeatureCategory;
  status: FeatureStatus;
  priority: FeaturePriority;
  vote_count: number;
  is_custom: boolean;
  requested_by: string | null;
  admin_notes: string | null;
  estimated_completion_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeatureVote {
  id: string;
  user_id: string;
  feature_request_id: string;
  created_at: string;
}

export interface FeatureNotification {
  id: string;
  user_id: string;
  feature_request_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  feature_request?: FeatureRequest;
}

export interface FeatureRequestWithVote extends FeatureRequest {
  hasVoted: boolean;
}

// API Response Types
export interface GetFeatureRequestsResponse {
  requests: FeatureRequest[];
  votedFeatures: string[];
  categories: FeatureCategory[];
}

export interface FeatureRequestStats {
  total: number;
  byCategory: Record<FeatureCategory, number>;
  byStatus: Record<FeatureStatus, number>;
  totalVotes: number;
  customRequests: number;
  suggestedRequests: number;
}

export interface VoteFeatureResponse {
  success: boolean;
  newVoteCount: number;
  message: string;
}

export interface CreateFeatureRequestResponse {
  success: boolean;
  featureId: string;
  message: string;
}

export interface GetNotificationsResponse {
  notifications: FeatureNotification[];
  unreadCount: number;
}

// Form Types
export interface CreateFeatureRequestForm {
  title: string;
  description: string;
  category: FeatureCategory;
}

export interface UpdateFeatureRequestForm {
  status?: FeatureStatus;
  priority?: FeaturePriority;
  admin_notes?: string;
  estimated_completion_date?: string | null;
  completed_at?: string | null;
}
