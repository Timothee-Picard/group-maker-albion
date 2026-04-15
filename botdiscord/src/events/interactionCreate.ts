import { Events, Interaction } from 'discord.js';
import { logger } from '../core/logger.js';
import type { GroupMakerClient } from '../core/client.js';
import { handleCompositionButtons, handleCompositionModals, handleCompositionSelects } from '../handlers/compositions.handler.js';
import { handleEventButtons, handleEventModals, handleEventSelects } from '../handlers/events.handler.js';

export const name = Events.InteractionCreate;
export const once = false;

export async function execute(interaction: Interaction) {
  const client = interaction.client as GroupMakerClient;

  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) {
      logger.warn(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error({ err: error }, `Error executing command ${interaction.commandName}`);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
      } else {
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
      }
    }
  } else if (interaction.isButton()) {
    if (interaction.customId.startsWith('comp_')) {
      await handleCompositionButtons(interaction);
    } else if (interaction.customId.startsWith('event_')) {
      await handleEventButtons(interaction);
    }
  } else if (interaction.isStringSelectMenu()) {
    if (interaction.customId.startsWith('comp_')) {
      await handleCompositionSelects(interaction);
    } else if (interaction.customId.startsWith('event_')) {
      await handleEventSelects(interaction);
    }
  } else if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('comp_')) {
      await handleCompositionModals(interaction);
    } else if (interaction.customId.startsWith('event_')) {
      await handleEventModals(interaction);
    }
  }
}
