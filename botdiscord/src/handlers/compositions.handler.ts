import {
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { CompositionService } from '../services/composition.service.js';
import { EventService } from '../services/event.service.js';
import { redrawEventMessage } from './events.handler.js';
import { logger } from '../core/logger.js';

export async function buildCompositionsUI(guildId: string, selectedCompId?: string) {
  const compositions = await CompositionService.listCompositions(guildId);

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('comp_create_init')
      .setLabel('Créer une Composition')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(selectedCompId ? `comp_edit_btn_${selectedCompId}` : 'comp_edit_btn_none')
      .setLabel('Modifier la sélection')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!selectedCompId),
    new ButtonBuilder()
      .setCustomId(selectedCompId ? `comp_delete_btn_${selectedCompId}` : 'comp_delete_btn_none')
      .setLabel('Supprimer la sélection')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!selectedCompId)
  );

  if (compositions.length > 0) {
    const compOptions = compositions.map((c) => ({
      label: c.name,
      value: c.id,
      default: c.id === selectedCompId,
    }));

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('comp_base_select')
        .setPlaceholder('Sélectionner une composition à gérer...')
        .addOptions(compOptions)
    );
    
    return [selectRow, buttonRow];
  } else {
    return [buttonRow];
  }
}

export async function handleCompositionSelects(interaction: StringSelectMenuInteraction) {
  if (interaction.customId === 'comp_base_select') {
    const compId = interaction.values[0];
    const guildId = interaction.guildId!;

    const components = await buildCompositionsUI(guildId, compId);

    await interaction.update({
      components,
    });
  }
}

export async function handleCompositionButtons(interaction: ButtonInteraction) {
  const guildId = interaction.guildId;
  if (!guildId) return;

  if (interaction.customId === 'comp_create_init') {
    const modal = new ModalBuilder()
      .setCustomId('comp_create_modal')
      .setTitle('Créer une nouvelle Composition');

    const nameInput = new TextInputBuilder()
      .setCustomId('comp_name')
      .setLabel('Nom de la Composition')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('ex. Sortie RZ 21h')
      .setRequired(true);

    const rolesInput = new TextInputBuilder()
      .setCustomId('comp_roles')
      .setLabel('Liste des Rôles (Un par ligne)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Tank\nHeal\nDPS')
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(rolesInput),
    );

    await interaction.showModal(modal);
  } else if (interaction.customId.startsWith('comp_edit_btn_')) {
    const compId = interaction.customId.replace('comp_edit_btn_', '');
    
    // Safety check
    if (compId === 'none') {
      await interaction.reply({ content: 'Sélectionne d\'abord une composition.', flags: MessageFlags.Ephemeral});
      return;
    }

    const compositions = await CompositionService.listCompositions(guildId);
    const compToEdit = compositions.find((c) => c.id === compId);

    if (!compToEdit) {
      await interaction.reply({ content: 'Composition introuvable.', flags: MessageFlags.Ephemeral });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(`comp_edit_modal_${compToEdit.id}`)
      .setTitle(`Modifier ${compToEdit.name.substring(0, 20)}`);

    const nameInput = new TextInputBuilder()
      .setCustomId('comp_name')
      .setLabel('Nom de la Composition')
      .setStyle(TextInputStyle.Short)
      .setValue(compToEdit.name)
      .setRequired(true);

    const rolesInput = new TextInputBuilder()
      .setCustomId('comp_roles')
      .setLabel('Liste des Rôles (Un par ligne)')
      .setStyle(TextInputStyle.Paragraph)
      .setValue(compToEdit.roles.join('\n'))
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(rolesInput),
    );

    await interaction.showModal(modal);
  } else if (interaction.customId.startsWith('comp_delete_btn_')) {
    const compId = interaction.customId.replace('comp_delete_btn_', '');
    if (compId === 'none') return;

    await interaction.deferUpdate();

    try {
      await CompositionService.deleteComposition(compId);
      const components = await buildCompositionsUI(guildId);
      await interaction.editReply({ components });
    } catch (err) {
      await interaction.followUp({
        content: 'Impossible de supprimer la composition. Des événements y sont peut-être attachés !',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

export async function handleCompositionModals(interaction: ModalSubmitInteraction) {
  const guildId = interaction.guildId;
  if (!guildId) return;

  if (interaction.customId === 'comp_create_modal') {
    const name = interaction.fields.getTextInputValue('comp_name');
    const roles = interaction.fields.getTextInputValue('comp_roles');

    await interaction.deferUpdate();

    try {
      const newComp = await CompositionService.createComposition(guildId, name, roles);
      const components = await buildCompositionsUI(guildId, newComp.id);
      await interaction.editReply({ components });
    } catch (err) {
      logger.error(err, 'Failed to create composition');
      await interaction.followUp({
        content: 'Impossible de créer la composition. Réessaie plus tard.',
        flags: MessageFlags.Ephemeral,
      });
    }
  } else if (interaction.customId.startsWith('comp_edit_modal_')) {
    const compId = interaction.customId.replace('comp_edit_modal_', '');
    const name = interaction.fields.getTextInputValue('comp_name');
    const roles = interaction.fields.getTextInputValue('comp_roles');

    await interaction.deferUpdate();

    try {
      await CompositionService.updateComposition(compId, name, roles);
      
      // Cascade update all linked events
      const updatedRoles = roles.split('\n').map(r => r.trim());
      const linkedEvents = await EventService.getEventsByCompositionId(compId);
      
      for (const event of linkedEvents) {
        try {
          // Prune participants if roles shrunk
          await EventService.pruneParticipantsByMaxRole(event.id, updatedRoles.length - 1);
          // Redraw the main message
          await redrawEventMessage(event.id, interaction.client);
        } catch (e) {
          logger.warn({ err: e, eventId: event.id }, 'Failed to cascade update event');
        }
      }

      const components = await buildCompositionsUI(guildId, compId);
      await interaction.editReply({ components });
    } catch (err) {
      logger.error(err, 'Failed to update composition');
      await interaction.followUp({
        content: 'Impossible de mettre à jour la composition.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
