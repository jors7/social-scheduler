export class PinterestClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getUserInfo() {
    console.log('Making Pinterest API request to user_account endpoint...');
    console.log('Token length:', this.accessToken.length);
    
    const response = await fetch(
      'https://api.pinterest.com/v5/user_account',
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
      'https://api.pinterest.com/v5/boards',
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
      'https://api.pinterest.com/v5/pins',
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
    const response = await fetch(
      'https://api.pinterest.com/v5/pins',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          board_id: boardId,
          ...pinData,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create Pinterest pin');
    }

    return response.json();
  }
}