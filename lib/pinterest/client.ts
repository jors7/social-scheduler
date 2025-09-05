export class PinterestClient {
  private accessToken: string;
  private apiBaseUrl: string;

  constructor(accessToken: string, useSandbox: boolean = true) {
    this.accessToken = accessToken;
    // Use sandbox API for trial apps, production API for approved apps
    this.apiBaseUrl = useSandbox 
      ? 'https://api-sandbox.pinterest.com/v5'
      : 'https://api.pinterest.com/v5';
  }

  async getUserInfo() {
    console.log('Making Pinterest API request to user_account endpoint...');
    console.log('Token length:', this.accessToken.length);
    
    const response = await fetch(
      `${this.apiBaseUrl}/user_account`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Pinterest API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pinterest API error response:', errorText);
      throw new Error(`Failed to get Pinterest user info: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Pinterest user data:', data);
    return data;
  }

  async getUserBoards() {
    const response = await fetch(
      `${this.apiBaseUrl}/boards`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get Pinterest boards');
    }

    return response.json();
  }

  async getUserPins() {
    const response = await fetch(
      `${this.apiBaseUrl}/pins`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get Pinterest pins');
    }

    return response.json();
  }

  // This would need pins:write permission (not available in testing token)
  async createPin(boardId: string, pinData: any) {
    const requestBody = {
      board_id: boardId,
      ...pinData,
    };
    
    console.log('=== Pinterest Pin Creation Debug ===');
    console.log('API Endpoint:', `${this.apiBaseUrl}/pins`);
    console.log('Using Sandbox:', this.apiBaseUrl.includes('sandbox'));
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    console.log('Token (first 20 chars):', this.accessToken.substring(0, 20) + '...');
    
    const response = await fetch(
      `${this.apiBaseUrl}/pins`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('=== Pinterest API Error ===');
      console.error('Status:', response.status);
      console.error('Error Response:', errorText);
      
      // Try to parse error as JSON for better debugging
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
        console.error('Parsed Error:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        // Not JSON, that's okay
      }
      
      throw new Error(`Pinterest API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('=== Pin Created Successfully ===');
    console.log('Result:', JSON.stringify(result, null, 2));
    return result;
  }
}