import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../../lib/mongodb";
import Subscription from "../../../models/Subscription";

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface ResponseData {
  message: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  await dbConnect();

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  try {
    const subscription: PushSubscriptionData = req.body;

    // Verificar si la suscripción ya existe
    const existing = await Subscription.findOne({ endpoint: subscription.endpoint });
    if (existing) {
      return res.status(200).json({ message: "Suscripción ya registrada" });
    }

    // Guardar nueva suscripción
    const newSubscription = new Subscription({
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    });
    await newSubscription.save();

    return res.status(201).json({ message: "Suscripción guardada" });
  } catch (error) {
    console.error("Error saving subscription:", error);
    return res.status(500).json({ message: "Error al guardar suscripción" });
  }
}