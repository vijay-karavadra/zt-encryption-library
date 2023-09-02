export class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async fetchPost(endpoint: string, payload: any) {
    try {
      const payloadData = JSON.stringify(payload);
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payloadData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // write a code to convert response to json
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Fetch Error:", error);
      throw error;
    }
  }


  async fetchGet(endpoint: string) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const responseData= await response.json();
      return responseData;
    } catch (error) {
      console.error("Fetch Error:", error);
      throw error;
    }
  }
}
