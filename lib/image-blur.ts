import blurDataJson from './blur-data.json';

export interface BlurData {
  base64: string;
  width: number;
  height: number;
  url: string;
  description: string;
}

export type BlurDataMap = {
  [key: string]: BlurData;
};

// Type-safe blur data
export const blurData: BlurDataMap = blurDataJson;

// Helper function to get blur data for a specific image
export function getBlurData(imageId: string): BlurData | undefined {
  return blurData[imageId];
}

// Helper to get just the base64 placeholder
export function getBlurPlaceholder(imageId: string): string | undefined {
  return blurData[imageId]?.base64;
}