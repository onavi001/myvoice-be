import type { NextApiRequest, NextApiResponse } from "next";
import webPush from "web-push";
import { dbConnect } from "../../../lib/mongodb";
import Subscription from "../../../models/Subscription";

interface PushPayload {
  title: string;
  body: string;
}

interface ResponseData {
  message: string;
}

// Configurar web-push
webPush.setVapidDetails(
  "mailto:onavi.001@gmail.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  await dbConnect();

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  try {
    const { title, body } = req.body as Partial<PushPayload>;
    if (!title || !body) {
      return res.status(400).json({ message: "Faltan título o cuerpo" });
    }

    const subscriptions = await Subscription.find();
    if (subscriptions.length === 0) {
      return res.status(200).json({ message: "No hay suscriptores" });
    }

    const payload = JSON.stringify({ title, body });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          payload
        );
      } catch (error) {
        console.error("Error sending notification to", sub.endpoint, error);
        await Subscription.deleteOne({ endpoint: sub.endpoint }); // Eliminar suscripciones inválidas
      }
    });

    await Promise.all(sendPromises);
    return res.status(200).json({ message: "Notificaciones enviadas" });
  } catch (error) {
    console.error("Error sending notifications:", error);
    return res.status(500).json({ message: "Error al enviar notificaciones" });
  }
}