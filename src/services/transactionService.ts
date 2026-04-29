import mongoose, { ClientSession } from 'mongoose';

function isTransactionUnsupported(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Transaction numbers are only allowed') ||
    message.includes('replica set') ||
    message.includes('not supported')
  );
}

export async function runWithOptionalTransaction<T>(
  operation: (session: ClientSession) => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await operation(session);
    });
    return result;
  } catch (error) {
    if (isTransactionUnsupported(error)) {
      return fallback();
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

