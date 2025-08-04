import { TwitterApi } from 'twitter-api-v2';

// Initialize Twitter client with app credentials
export const getAppClient = () => {
  if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET) {
    throw new Error('Twitter API credentials not configured');
  }

  return new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
  });
};

// Initialize Twitter client with user credentials (for posting)
export const getUserClient = (accessToken: string, accessSecret: string) => {
  if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET) {
    throw new Error('Twitter API credentials not configured');
  }

  return new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken,
    accessSecret,
  });
};

// Initialize OAuth client for authentication flow
export const getOAuthClient = (callbackUrl: string) => {
  if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET) {
    throw new Error('Twitter API credentials not configured');
  }

  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
  });

  return client;
};

// OAuth 2.0 client for new authentication flow (optional - only if you have OAuth 2.0 credentials)
export const getOAuth2Client = () => {
  if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
    console.warn('Twitter OAuth2 credentials not configured, using OAuth 1.0a instead');
    return null;
  }

  return new TwitterApi({
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
  });
};