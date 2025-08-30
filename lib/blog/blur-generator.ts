// Utility to generate blur data for blog images

export async function generateBlurForImage(imageUrl: string): Promise<string | null> {
  if (!imageUrl) return null;
  
  try {
    const response = await fetch('/api/generate-blur', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl }),
    });

    if (!response.ok) {
      console.error('Failed to generate blur:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.blur;
  } catch (error) {
    console.error('Error generating blur:', error);
    return null;
  }
}