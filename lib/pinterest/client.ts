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
    
    console.log('Creating pin with data:', JSON.stringify(requestBody, null, 2));
    console.log('Using API URL:', `${this.apiBaseUrl}/pins`);
    
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pinterest API error:', response.status, errorText);
      throw new Error(`Pinterest API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
}