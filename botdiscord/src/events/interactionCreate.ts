import { Events, Interaction, MessageFlags } from 'discord.js';
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
    } catch (error: any) {
      logger.error({ err: error }, `Error executing command ${interaction.commandName}`);
      
      const errorMessage = 'Une erreur est survenue lors de l\'exécution de cette commande.';
      
      // If it's a "Ghost Instance" error (Unknown Interaction or Already Acknowledged), 
      // we don't try to answer as it will fail again and clutter logs.
      if (error.code === 10062 || error.code === 40060) {
        logger.warn('Interaction already dead (ghost instance detected or manual acknowledgement). Skipping error response.');
        return;
      }
      
      // Handle the case where the interaction was already acknowledged (deferred or replied)
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
        }
      } catch (innerError) {
        logger.error({ err: innerError }, 'Failed to send error message to Discord');
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
