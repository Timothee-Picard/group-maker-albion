import { db } from './db.js';

export class CompositionService {
  /**
   * Ensures the Guild exists in the database.
   */
  private static async ensureGuild(guildId: string) {
    await db.guild.upsert({
      where: { id: guildId },
      update: {},
      create: { id: guildId },
    });
  }

  /**
   * Parses the raw roles string into a clean array of strings.
   */
  private static parseRoles(rolesInput: string): string[] {
    return rolesInput
      .split('\n')
      .map((r) => r.trim());
    // Empty lines are intentionally kept as "" to act as visual separators
  }

  /**
   * Creates a new composition for a guild.
   */
  static async createComposition(guildId: string, name: string, rolesInput: string) {
    await this.ensureGuild(guildId);
    const roles = this.parseRoles(rolesInput);

    return db.composition.create({
      data: {
        guildId,
        name,
        roles,
      },
    });
  }

  /**
   * Updates an existing composition.
   */
  static async updateComposition(id: string, name: string, rolesInput: string) {
    const roles = this.parseRoles(rolesInput);

    return db.composition.update({
      where: { id },
      data: { name, roles },
    });
  }

  /**
   * Lists all compositions for a given guild.
   */
  static async listCompositions(guildId: string) {
    return db.composition.findMany({
      where: { guildId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Deletes a composition by ID.
   */
  static async deleteComposition(id: string) {
    return db.composition.delete({
      where: { id },
    });
  }
}
