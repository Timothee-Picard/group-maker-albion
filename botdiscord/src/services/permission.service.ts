import { GuildMember, PermissionFlagsBits } from 'discord.js';
import { db } from './db.js';

export class PermissionService {
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
   * Checks if a member has permission to use administrative commands.
   * Authorized if:
   * - Has MANAGE_GUILD permission.
   * - Has one of the roles stored in the database for this guild.
   */
  static async isUserAuthorized(member: GuildMember): Promise<boolean> {
    // 1. Check for Manage Guild permission
    if (member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return true;
    }

    // 2. Check for authorized roles in DB
    const authorizedRoles = await db.authorizedRole.findMany({
      where: { guildId: member.guild.id },
    });

    if (authorizedRoles.length === 0) {
      return false;
    }

    const authorizedRoleIds = authorizedRoles.map((r) => r.roleId);
    return member.roles.cache.some((role) => authorizedRoleIds.includes(role.id));
  }

  /**
   * Adds a role to the authorized roles for a guild.
   */
  static async addAuthorizedRole(guildId: string, roleId: string) {
    await this.ensureGuild(guildId);
    
    return db.authorizedRole.upsert({
      where: { roleId },
      update: {},
      create: {
        roleId,
        guildId,
      },
    });
  }

  /**
   * Removes a role from the authorized roles for a guild.
   */
  static async removeAuthorizedRole(guildId: string, roleId: string) {
    const result = await db.authorizedRole.deleteMany({
      where: {
        roleId,
        guildId,
      },
    });

    if (result.count === 0) {
      throw new Error('ROLE_NOT_FOUND');
    }

    return result;
  }

  /**
   * Lists all authorized roles for a guild.
   */
  static async listAuthorizedRoles(guildId: string) {
    return db.authorizedRole.findMany({
      where: { guildId },
    });
  }
}
