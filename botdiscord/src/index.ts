import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { GatewayIntentBits } from 'discord.js';
import { GroupMakerClient } from './core/client.js';
import { logger } from './core/logger.js';

import * as readyEvent from './events/ready.js';
import * as interactionCreateEvent from './events/interactionCreate.js';
import * as messageCreateEvent from './events/messageCreate.js';

import * as groupmakerCommand from './commands/groupmaker.js';

const client = new GroupMakerClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

// Event registry (hardcoded for brevity, though dynamic loading could be used)
client.once(readyEvent.name, readyEvent.execute);
client.on(interactionCreateEvent.name, interactionCreateEvent.execute);
client.on(messageCreateEvent.name, messageCreateEvent.execute);

// Load commands into the Collection
client.commands.set(groupmakerCommand.data.name, groupmakerCommand as any);

const token = process.env.DISCORD_TOKEN;

if (!token) {
  logger.error('Missing DISCORD_TOKEN environment variable');
  process.exit(1);
}

client.login(token)
  .catch((err) => logger.error({ err }, 'Failed to login'));

process.on('SIGINT', () => {
  logger.info('Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});
