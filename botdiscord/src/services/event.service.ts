import { db } from './db.js';

export class EventService {
  /**
   * Creates a new event based on a composition.
   */
  static async createEvent(guildId: string, compositionId: string, name: string, description?: string) {
    return db.event.create({
      data: {
        guildId,
        compositionId,
        name,
        description,
      },
      include: {
        composition: true,
      },
    });
  }

  /**
   * Links an event to its Discord message and thread identifiers.
   */
  static async attachDiscordEntities(eventId: string, messageId: string, threadId: string) {
    return db.event.update({
      where: { id: eventId },
      data: { messageId, threadId },
    });
  }

  /**
   * Fetches an event by its associated Discord thread ID.
   * Includes the base composition and current participants.
   */
  static async getEventByThreadId(threadId: string) {
    return db.event.findFirst({
      where: { threadId },
      include: {
        composition: true,
        participants: true,
      },
    });
  }

  /**
   * Fetches an event by its Prisma ID.
   */
  static async getEventById(eventId: string) {
    return db.event.findUnique({
      where: { id: eventId },
      include: {
        composition: true,
        participants: true,
      },
    });
  }

  /**
   * Lists all events for a given guild
   */
  static async listEvents(guildId: string) {
    return db.event.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
      include: { composition: true },
    });
  }

  /**
   * Updates an event's title and description
   */
  static async updateEvent(eventId: string, name: string, description?: string) {
    return db.event.update({
      where: { id: eventId },
      data: { name, description },
    });
  }

  /**
   * Deletes an event completely from the database (Cascades participants)
   */
  static async deleteEvent(eventId: string) {
    return db.$transaction(async (tx) => {
      await tx.participant.deleteMany({
        where: { eventId },
      });
      return tx.event.delete({
        where: { id: eventId },
      });
    });
  }

  /**
   * Fetches all events linked to a specific composition.
   */
  static async getEventsByCompositionId(compositionId: string) {
    return db.event.findMany({
      where: { compositionId },
      include: {
        composition: true,
        participants: true,
      },
    });
  }

  /**
   * Removes participants who are assigned to a role index that no longer exists (e.g. comp shrunk).
   */
  static async pruneParticipantsByMaxRole(eventId: string, maxRoleIndex: number) {
    return db.participant.deleteMany({
      where: {
        eventId,
        roleIndex: {
          gt: maxRoleIndex,
        },
      },
    });
  }
}
