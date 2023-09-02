import { LocalStorageKeys } from "./constant";

export function setEcryptionSettings(settings: any) {
    setData(LocalStorageKeys.UserEncryptionSettings, settings);
}

export function getEcryptionSettings(): any {
    return getData(LocalStorageKeys.UserEncryptionSettings);
}

function setData(key: string, data: any) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.log(error);
  }
}

export function setDataAsString(key: string, data: any) {
    try {
      localStorage.setItem(key, data);
    } catch (error) {
      console.log(error);
    }
  }


function getData(key: string):any {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch (error) {
    console.log(error);
    return null;
  }
}

export function getDataAsString(key: string):string | null{
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.log(error);
      return '';
    }
  }