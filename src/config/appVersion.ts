const DEFAULT_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.onavi001.myvoicefit";

function parseVersionCode(value: string | undefined, fallback: number): number {
  if (!value?.trim()) return fallback;
  const n = Number.parseInt(value.trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Versión mínima obligatoria (semver). Por debajo → actualización forzada. */
export const APP_ANDROID_MIN_VERSION = process.env.APP_ANDROID_MIN_VERSION?.trim() || "1.1.13";

/** Última versión publicada en Play Store (semver). Por debajo → aviso de actualización. */
export const APP_ANDROID_LATEST_VERSION =
  process.env.APP_ANDROID_LATEST_VERSION?.trim() || "1.1.19";

export const APP_ANDROID_MIN_VERSION_CODE = parseVersionCode(
  process.env.APP_ANDROID_MIN_VERSION_CODE,
  20
);

export const APP_ANDROID_LATEST_VERSION_CODE = parseVersionCode(
  process.env.APP_ANDROID_LATEST_VERSION_CODE,
  26
);

export const APP_ANDROID_STORE_URL =
  process.env.APP_ANDROID_STORE_URL?.trim() || DEFAULT_STORE_URL;

export const APP_IOS_MIN_VERSION = process.env.APP_IOS_MIN_VERSION?.trim() || "1.0.0";
export const APP_IOS_LATEST_VERSION =
  process.env.APP_IOS_LATEST_VERSION?.trim() || APP_IOS_MIN_VERSION;
export const APP_IOS_STORE_URL = process.env.APP_IOS_STORE_URL?.trim() || "";
