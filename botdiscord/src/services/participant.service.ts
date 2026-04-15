import { db } from './db.js';

export class ParticipantService {
  /**
   * Assigns a highly-concurrent slot to a user.
   * - Ensures a slot can only be taken by one user at a time.
   * - Ensures a user can only have one slot per event at a time (previous slot freed).
   */
  static async assignSlot(eventId: string, userId: string, roleIndex: number) {
    return db.$transaction(async (tx) => {
      // 1. Ensure the slot is free
      const existingInSlot = await tx.participant.findUnique({
        where: { eventId_roleIndex: { eventId, roleIndex } },
      });

      if (existingInSlot) {
        if (existingInSlot.userId !== userId) {
          throw new Error('SLOT_TAKEN');
        } else {
          throw new Error('ALREADY_IN_SLOT');
        }
      }

      // 2. Free up any previous slot this exact user might be holding for this event
      await tx.participant.deleteMany({
        where: { eventId, userId },
      });

      // 3. Assign them to the requested slot
      return tx.participant.create({
        data: {
          eventId,
          userId,
          roleIndex,
        },
      });
    });
  }

  /**
   * Unassigns a given user from whatever slot they hold in the event.
   */
  static async removeParticipant(eventId: string, userId: string) {
    const res = await db.participant.deleteMany({
      where: { eventId, userId },
    });

    if (res.count === 0) {
      throw new Error('NOT_PARTICIPATING');
    }

    return true;
  }
}
