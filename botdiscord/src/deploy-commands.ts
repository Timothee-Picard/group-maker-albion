import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { REST, Routes } from 'discord.js';
import { data as groupmakerCommand } from './commands/groupmaker.js';
import { logger } from './core/logger.js';

const commands = [groupmakerCommand.toJSON()];

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
  logger.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID environment variable.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    logger.info(`Started refreshing ${commands.length} application (/) commands.`);

    // The put method is used to fully refresh all commands globally with the current set
    const data: any = await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands },
    );

    logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    logger.error(error);
  }
})();
