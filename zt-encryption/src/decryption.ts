import { crypto, buffer } from "./utils/helperService";
import { shouldEncryptProperty } from "./utils/helperService";
import { SchemaType } from "./models/schemaType";

export function decryptData(
  encryptedDataBase64: string,
  sharedSecretHex: string,
  iv: Buffer
): any {
  try {
    if (!encryptedDataBase64 || !sharedSecretHex || !Buffer.isBuffer(iv)) {
      throw new Error("Invalid input parameters");
    }

    const encryptedData = Buffer.from(encryptedDataBase64, "base64");
    const sharedSecret = Buffer.from(sharedSecretHex, "hex");

    const decipher = crypto.createDecipheriv("aes-256-cbc", sharedSecret, iv);
    decipher.setAutoPadding(true);

    const decryptedMessage = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);

    return decryptedMessage.toString("utf8");
  } catch (error) {
    // console.error(`An error occurred during decryption: ${error}`);
    return encryptedDataBase64;
  }
}

export function decryptProperties(
  data: any,
  schema: SchemaType,
  sharedSecretHex: string,
  iv: Buffer
): any {
  try {
    if (Array.isArray(data)) {
      return decryptArrayOfObjects(data, schema, sharedSecretHex, iv);
    } else if (typeof data === "object" && data !== null) {
      return decryptObject(data, schema, sharedSecretHex, iv);
    }
  } catch (error) {
    console.error("Error during decryption:", error);
  }
  return data;
}

function decryptObject(
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
          data[key] = decryptProperties(
            data[key],
            schema[key] as SchemaType,
            sharedSecretHex,
            iv
          );
        } else if (shouldEncryptProperty(key, schema)) {
          // Encrypt only if the schema value is true
          if (data[key] != undefined) {
            data[key] = decryptData(data[key].toString(), sharedSecretHex, iv);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error during decryption:", error);
  }
  return data;
}

function decryptArrayOfObjects(
  dataArray: { [key: string]: any }[],
  schema: SchemaType,
  sharedSecretHex: string,
  iv: Buffer
): { [key: string]: any }[] {
  return dataArray.map((data) =>
    decryptProperties(data, schema, sharedSecretHex, iv)
  );
}
