import { Events, Client } from 'discord.js';
import { logger } from '../core/logger.js';

export const name = Events.ClientReady;
export const once = true;

export function execute(client: Client<true>) {
  logger.info(`Bot is ready! Logged in as ${client.user.tag}`);
}
