import {
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  StringSelectMenuBuilder,
  TextChannel,
  ThreadAutoArchiveDuration,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { CompositionService } from '../services/composition.service.js';
import { EventService } from '../services/event.service.js';
import { logger } from '../core/logger.js';

export async function buildEventsUI(guildId: string, selectedType?: 'create' | 'manage', selectedId?: string) {
  const compositions = await CompositionService.listCompositions(guildId);
  const events = await EventService.listEvents(guildId);

  const components: any[] = [];
  const isCreate = selectedType === 'create';
  const isManage = selectedType === 'manage';

  if (compositions.length > 0) {
    const compOptions = compositions.map((c) => ({
      label: c.name,
      value: c.id,
      default: isCreate && c.id === selectedId,
    }));
    components.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('event_create_select')
          .setPlaceholder('CRÉER : Sélectionner une composition...')
          .addOptions(compOptions)
      )
    );
  }

  if (events.length > 0) {
    const eventOptions = events.map((e) => ({
      label: e.name.substring(0, 100),
      value: e.id,
      description: `Base : ${e.composition.name}`.substring(0, 100),
      default: isManage && e.id === selectedId,
    }));
    components.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('event_manage_select')
          .setPlaceholder('GÉRER : Sélectionner un événement...')
          .addOptions(eventOptions)
      )
    );
  }

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(isCreate ? `event_create_btn_${selectedId}` : 'event_create_btn_none')
      .setLabel('Créer Nouvel Événement')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!isCreate),
    new ButtonBuilder()
      .setCustomId(isManage ? `event_edit_btn_${selectedId}` : 'event_edit_btn_none')
      .setLabel('Modifier l\'Événement')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!isManage),
    new ButtonBuilder()
      .setCustomId(isManage ? `event_delete_btn_${selectedId}` : 'event_delete_btn_none')
      .setLabel('Annuler l\'Événement')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!isManage)
  );

  components.push(buttonRow);
  return components;
}

export async function handleEventSelects(interaction: StringSelectMenuInteraction) {
  const isCreate = interaction.customId === 'event_create_select';
  const isManage = interaction.customId === 'event_manage_select';

  if (!isCreate && !isManage) return;

  const value = interaction.values[0];
  const guildId = interaction.guildId!;

  const components = await buildEventsUI(guildId, isCreate ? 'create' : 'manage', value);

  await interaction.update({ components });
}

export async function handleEventButtons(interaction: ButtonInteraction) {
  if (interaction.customId.startsWith('event_create_btn_')) {
    const compId = interaction.customId.replace('event_create_btn_', '');
    if (compId === 'none') return;

    const modal = new ModalBuilder()
      .setCustomId(`event_create_modal_${compId}`)
      .setTitle(`Détails de l'Événement`);

    const titleInput = new TextInputBuilder()
      .setCustomId('event_title')
      .setLabel('Titre de l\'Événement')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('ex. Sortie RZ 21h')
      .setRequired(true);

    const descInput = new TextInputBuilder()
      .setCustomId('event_desc')
      .setLabel('Description (tu peux utiliser @everyone)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Bienvenue, inscrivez-vous !')
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(descInput)
    );

    await interaction.showModal(modal);
  } else if (interaction.customId.startsWith('event_edit_btn_')) {
    const eventId = interaction.customId.replace('event_edit_btn_', '');
    if (eventId === 'none') return;

    const event = await EventService.getEventById(eventId);
    if (!event) {
      await interaction.reply({ content: 'Événement introuvable.', flags: MessageFlags.Ephemeral });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(`event_edit_modal_${eventId}`)
      .setTitle(`Modifier les Détails`);

    const titleInput = new TextInputBuilder()
      .setCustomId('event_title')
      .setLabel('Titre de l\'Événement')
      .setStyle(TextInputStyle.Short)
      .setValue(event.name)
      .setRequired(true);

    const descInput = new TextInputBuilder()
      .setCustomId('event_desc')
      .setLabel('Description')
      .setStyle(TextInputStyle.Paragraph)
      .setValue(event.description || '')
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(descInput)
    );

    await interaction.showModal(modal);
  } else if (interaction.customId.startsWith('event_delete_btn_')) {
    const eventId = interaction.customId.replace('event_delete_btn_', '');
    if (eventId === 'none') return;

    await interaction.deferUpdate();

    const evt = await EventService.getEventById(eventId);
    if (!evt) {
      await interaction.followUp({ content: 'Événement introuvable, peut-être déjà supprimé ?', flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      if (evt.threadId) {
        try {
          const threadChannel = await interaction.client.channels.fetch(evt.threadId);
          if (threadChannel && threadChannel.isThread()) {
            await threadChannel.setArchived(true, 'L\'événement a été annulé par un administrateur.');
          }
        } catch (e) {
          logger.warn(e, 'Could not archive thread');
        }
      }

      if (evt.messageId && evt.threadId) {
         try {
            const tempThread = await interaction.client.channels.fetch(evt.threadId).catch(()=>null);
            if(tempThread && tempThread.isThread() && tempThread.parent) {
                const parentMsg = await (tempThread.parent as TextChannel).messages.fetch(evt.messageId).catch(()=>null);
                if (parentMsg && parentMsg.deletable) {
                    await parentMsg.delete();
                }
            }
         } catch(e) {}
      }

      await EventService.deleteEvent(eventId);
      
      const guildId = interaction.guildId!;
      const components = await buildEventsUI(guildId);
      await interaction.editReply({ components });
    } catch (err) {
      logger.error(err, 'Failed to fully delete event');
      await interaction.followUp({ content: 'Impossible de nettoyer complètement l\'événement sur Discord.', flags: MessageFlags.Ephemeral });
    }
  }
}

export async function handleEventModals(interaction: ModalSubmitInteraction) {
  const guildId = interaction.guildId;
  if (!guildId) return;

  if (interaction.customId.startsWith('event_create_modal_')) {
    const compId = interaction.customId.replace('event_create_modal_', '');
    const title = interaction.fields.getTextInputValue('event_title');
    const desc = interaction.fields.getTextInputValue('event_desc');

    await interaction.deferUpdate();

    try {
      const evt = await EventService.createEvent(guildId, compId, title, desc);

      let rosterText = '';
      let rosterIndex = 1;
      evt.composition.roles.forEach((r) => {
        if (r === '') {
          rosterText += '\n';
        } else {
          rosterText += `${rosterIndex}. ${r} \n`;
          rosterIndex++;
        }
      });

      const messageContent = `# ${title}\n${desc ? desc + '\n\n' : ''}**Roster:**\n${rosterText}`;
      const channel = interaction.channel as TextChannel;
      const eventMessage = await channel.send({ content: messageContent });

      const thread = await eventMessage.startThread({
        name: title.substring(0, 50),
        autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
      });

      await EventService.attachDiscordEntities(evt.id, eventMessage.id, thread.id);
      await thread.send('Utilisez `Numéro` (ex. `1`), `Numéro @pseudo`, `-` ou `- @pseudo` pour gérer vos places.');

      const components = await buildEventsUI(guildId, 'manage', evt.id);
      await interaction.editReply({ components });
    } catch (err) {
      logger.error(err, 'Failed to create event');
      await interaction.followUp({ content: 'Impossible de créer l\'événement.', flags: MessageFlags.Ephemeral });
    }
  } else if (interaction.customId.startsWith('event_edit_modal_')) {
    const eventId = interaction.customId.replace('event_edit_modal_', '');
    const title = interaction.fields.getTextInputValue('event_title');
    const desc = interaction.fields.getTextInputValue('event_desc');

    await interaction.deferUpdate();

    try {
      await EventService.updateEvent(eventId, title, desc);

      const evt = await EventService.getEventById(eventId);
      if (evt && evt.threadId) {
          try {
            const threadChannel = await interaction.client.channels.fetch(evt.threadId);
            if (threadChannel && threadChannel.isThread()) {
                await threadChannel.setName(title.substring(0, 50));
            }
          } catch(e) {}
      }

      await redrawEventMessage(eventId, interaction.client);

      const components = await buildEventsUI(guildId, 'manage', eventId);
      await interaction.editReply({ components });
    } catch (err) {
      logger.error(err, 'Failed to edit event');
      await interaction.followUp({ content: 'Impossible de modifier l\'événement.', flags: MessageFlags.Ephemeral });
    }
  }
}

/**
 * Utility to redraw the event message based on the DB state.
 */
export async function redrawEventMessage(eventId: string, client: any) {
    const evt = await EventService.getEventById(eventId);
    if (!evt || !evt.messageId || !evt.threadId) return;

    try {
      const threadChannel = await client.channels.fetch(evt.threadId);
      if (!threadChannel || !threadChannel.isThread()) return;

      const parentChannel = threadChannel.parent as TextChannel;
      if (!parentChannel) return;

      const parentMessage = await parentChannel.messages.fetch(evt.messageId);
      if (!parentMessage) return;

      let rosterText = '';
      let rosterIndex = 1;
      evt.composition.roles.forEach((roleName, idx) => {
        if (roleName === '') {
          rosterText += '\n'; // Just a blank line, no number
          return;
        }

        const participant = evt.participants.find(p => p.roleIndex === idx);
        if (participant) {
          rosterText += `${rosterIndex}. ${roleName} <@${participant.userId}>\n`;
        } else {
          rosterText += `${rosterIndex}. ${roleName}\n`;
        }
        rosterIndex++;
      });

      const messageContent = `# ${evt.name}\n${evt.description ? evt.description + '\n\n' : ''}**Roster:**\n${rosterText}`;
      
      await parentMessage.edit({ content: messageContent });
    } catch (err) {
      logger.error(err, 'Failed to redraw event message');
    }
}
