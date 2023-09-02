import { EncryptionSettings } from "../models/encryptionSettings";
import { LocalStorageKeys } from "./constant";
import { getDataAsString, setDataAsString } from "./dataService";
import { ApiService } from "./apiService";
import { SchemaType } from "../models/schemaType";

export const crypto = require("crypto-browserify");
export const buffer = require("buffer/").Buffer;
window.Buffer = buffer;

export function performKeyExchange(host: string): string {

  let sharedSecret: string | null = getDataAsString(LocalStorageKeys.SecretKey);
  if (sharedSecret) {
    return sharedSecret;
  }

  const alice = crypto.createECDH("prime256v1");
  const alicePublicKey = alice.generateKeys("base64");
  const apiService = new ApiService(host);

  apiService
    .fetchPost("/api/handshake/key-exchange", { alicePublicKey })
    .then((response) => {
      const keyExchangeResponse = response;
      const adjustedBobPublicKeyHex = keyExchangeResponse.bobPublicKeyHex;
      const aliceSharedSecretHex = alice.computeSecret(
        adjustedBobPublicKeyHex,
        "base64",
        "hex"
      );
      sharedSecret = aliceSharedSecretHex.toString("hex");
      if (sharedSecret != null) {
        setDataAsString(LocalStorageKeys.SecretKey, sharedSecret);
      }
    })
    .catch((error) => {
      console.error("Fetch performKeyExchange Error:", error);
    });

  if (sharedSecret == null) return "";
  return sharedSecret;
}

export function shouldEncryptProperty(
  propertyName: string,
  schema: SchemaType
): boolean {
  const propertyNames = propertyName.split(".");
  let currentSchema: boolean | SchemaType | undefined = schema;

  for (const name of propertyNames) {
    if (
      currentSchema === undefined ||
      typeof currentSchema === "boolean" ||
      currentSchema[name] === undefined
    ) {
      return false;
    }
    currentSchema = currentSchema[name];
  }

  const result = currentSchema === true;
  return result;
}

// export async function getIv(): Promise<Buffer> {
export function getIv(): Buffer {
  // Retrive from localstorage
  const byteHash = getDataAsString(LocalStorageKeys.IvHash);
  if (byteHash != undefined) {
    return Buffer.from(byteHash, "base64");
  }

  const iv = crypto.randomBytes(16);
  const base64RandomBytes = iv.toString("base64");

  //Set to local storage
  setDataAsString(LocalStorageKeys.IvHash, base64RandomBytes);
  return iv;
}

export function isInternalApis(url: string): boolean {
  const internalApis = [
    "/api/handshake/key-exchange",
    "/api/handshake/key-exchange-response",
  ];
  return internalApis.includes(url);
}

export function isEncryptionEnabled(
  encryptionSettingsArray: EncryptionSettings[],
  currentUrl: string,
  currentHttpMethod: string
): EncryptionSettings | undefined {
  let enSettings: EncryptionSettings | undefined;

  for (const settings of encryptionSettingsArray) {
    // Check if the absoluteRequestUrl matches the given URL
    if (
      settings.absoluteRequestUrl === currentUrl &&
      settings.httpMethod === currentHttpMethod
    ) {
      enSettings = settings;
      break;
    }
  }
  return enSettings;
}


export async function fetchEncryptionSchema(
    host: string,
    userId: string
  ): Promise<any> {
    try {
      const apiService = new ApiService(host);
      let responseData: any;
      const encryptionSettings = await apiService.fetchGet(
        `/api/EncryptionSettings/apis?userId=${userId}`
      );
      return encryptionSettings;
    } catch (error) {
      console.error("Error fetching encryption schema:", error);
      return [];
    }
  }