import { Request, Response } from "express";
import { sendError, sendSuccess } from "../utils/apiResponse";
import {
  APP_ANDROID_LATEST_VERSION,
  APP_ANDROID_LATEST_VERSION_CODE,
  APP_ANDROID_MIN_VERSION,
  APP_ANDROID_MIN_VERSION_CODE,
  APP_ANDROID_STORE_URL,
  APP_IOS_LATEST_VERSION,
  APP_IOS_MIN_VERSION,
  APP_IOS_STORE_URL,
} from "../config/appVersion";

type Platform = "android" | "ios";

function parsePlatform(raw: unknown): Platform | null {
  if (raw === "android" || raw === "ios") return raw;
  return null;
}

/**
 * @openapi
 * /api/app/version:
 *   get:
 *     tags: [App]
 *     summary: Versiones mínima y actual de la app móvil
 *     parameters:
 *       - in: query
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [android, ios]
 *     responses:
 *       200:
 *         description: Configuración de versión para la plataforma
 *       400:
 *         description: Plataforma inválida
 */
export const getAppVersion = (req: Request, res: Response) => {
  const platform = parsePlatform(req.query.platform);
  if (!platform) {
    return sendError(res, 400, "Parámetro platform requerido (android | ios)");
  }

  if (platform === "android") {
    return sendSuccess(res, 200, "Versión de app", {
      platform: "android",
      minVersion: APP_ANDROID_MIN_VERSION,
      latestVersion: APP_ANDROID_LATEST_VERSION,
      minVersionCode: APP_ANDROID_MIN_VERSION_CODE,
      latestVersionCode: APP_ANDROID_LATEST_VERSION_CODE,
      storeUrl: APP_ANDROID_STORE_URL,
    });
  }

  return sendSuccess(res, 200, "Versión de app", {
    platform: "ios",
    minVersion: APP_IOS_MIN_VERSION,
    latestVersion: APP_IOS_LATEST_VERSION,
    storeUrl: APP_IOS_STORE_URL,
  });
};
