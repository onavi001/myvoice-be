import AppFeedback, { FeedbackCategory } from "../models/AppFeedback";
import { CreateFeedbackInput } from "../validators/feedbackValidators";

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

const COOLDOWN_MS = 60_000;

export async function createFeedback(
  userId: string,
  input: CreateFeedbackInput
): Promise<ServiceResult<{ id: string; createdAt: Date }>> {
  const recent = await AppFeedback.findOne({ userId })
    .sort({ createdAt: -1 })
    .select("createdAt")
    .lean();

  if (recent?.createdAt && Date.now() - new Date(recent.createdAt).getTime() < COOLDOWN_MS) {
    return {
      ok: false,
      status: 429,
      message: "Espera un momento antes de enviar otro comentario.",
    };
  }

  const doc = await AppFeedback.create({
    userId,
    category: input.category,
    message: input.message,
    rating: input.rating,
    platform: input.platform,
    appVersion: input.appVersion,
    status: "new",
  });

  return {
    ok: true,
    data: { id: doc._id.toString(), createdAt: doc.createdAt },
  };
}

export async function listMyFeedback(userId: string): Promise<
  ServiceResult<
    Array<{
      id: string;
      category: FeedbackCategory;
      message: string;
      rating?: number;
      status: string;
      createdAt: Date;
    }>
  >
> {
  const rows = await AppFeedback.find({ userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return {
    ok: true,
    data: rows.map((r) => ({
      id: r._id.toString(),
      category: r.category,
      message: r.message,
      rating: r.rating,
      status: r.status,
      createdAt: r.createdAt,
    })),
  };
}

export async function listAllFeedbackForAdmin(): Promise<
  ServiceResult<
    Array<{
      id: string;
      userId: string;
      username?: string;
      email?: string;
      category: FeedbackCategory;
      message: string;
      rating?: number;
      platform?: string;
      appVersion?: string;
      status: string;
      createdAt: Date;
    }>
  >
> {
  const rows = await AppFeedback.find()
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("userId", "username email")
    .lean();

  return {
    ok: true,
    data: rows.map((r) => {
      const user = r.userId as { _id?: { toString(): string }; username?: string; email?: string } | null;
      const uid =
        user && typeof user === "object" && "_id" in user
          ? user._id?.toString() ?? String(r.userId)
          : String(r.userId);
      return {
        id: r._id.toString(),
        userId: uid,
        username: user && typeof user === "object" && "username" in user ? user.username : undefined,
        email: user && typeof user === "object" && "email" in user ? user.email : undefined,
        category: r.category,
        message: r.message,
        rating: r.rating,
        platform: r.platform,
        appVersion: r.appVersion,
        status: r.status,
        createdAt: r.createdAt,
      };
    }),
  };
}
