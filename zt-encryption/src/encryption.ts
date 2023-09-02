import { ApiService } from "./utils/apiService";
import { EncryptionSettings } from "./models/encryptionSettings";
import { crypto, buffer } from "./utils/helperService";
import { shouldEncryptProperty } from "./utils/helperService";
import { SchemaType } from "./models/schemaType";

function encryptData(data: any, sharedSecretHex: string, iv: Buffer): any {
  try {
    const aliceSharedSecret = Buffer.from(sharedSecretHex, "hex");
    const cipher = crypto.createCipheriv("aes-256-cbc", aliceSharedSecret, iv);
    cipher.setAutoPadding(true); // Ensure PKCS7 padding
    const encryptedMessage = Buffer.concat([
      cipher.update(data, "utf8"),
      cipher.final(),
    ]);
    const encryptedMessageBase64 = encryptedMessage.toString("base64");
    return encryptedMessageBase64;
  } catch (error) {
    console.error("Error during encryption:", error);
    return data;
  }
}

// export async function encryptProperties(data: { [key: string]: any }, schema: SchemaType,sharedSecretHex: string,iv: Buffer): Promise<{ [key: string]: any }> {
export function encryptProperties(
  data: { [key: string]: any },
  schema: SchemaType,
  sharedSecretHex: string,
  iv: Buffer
): { [key: string]: any } {
  try {
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(schema, key)) {
        if (
          typeof data[key] === "object" &&
          data[key] !== null &&
          typeof schema[key] === "object"
        ) {
          data[key] = encryptProperties(
            data[key],
            schema[key] as SchemaType,
            sharedSecretHex,
            iv
          );
        } else if (shouldEncryptProperty(key, schema)) {
          // Encrypt only if the schema value is true
          data[key] = encryptData(data[key].toString(), sharedSecretHex, iv);
        }
      }
    }
  } catch (error) {
    console.error("Error during encryption:", error);
  }
  return data;
}

