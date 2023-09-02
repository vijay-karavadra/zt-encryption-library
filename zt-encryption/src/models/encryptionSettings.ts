export interface EncryptionSettings {
    id: string;
    httpMethod: string;
    absoluteRequestUrl: string;
    bodyEncryptionSchema: string; // You can parse this string to EncryptionSchema
  }