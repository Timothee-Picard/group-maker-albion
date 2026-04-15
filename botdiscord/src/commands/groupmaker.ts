import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  MessageFlags,
  GuildMember,
} from 'discord.js';
import { CompositionService } from '../services/composition.service.js';
import { EventService } from '../services/event.service.js';
import { PermissionService } from '../services/permission.service.js';
import { buildCompositionsUI } from '../handlers/compositions.handler.js';
import { buildEventsUI } from '../handlers/events.handler.js';

export const data = new SlashCommandBuilder()
  .setName('groupmaker')
  .setDescription('Commandes d\'administration du Group Maker')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('compositions')
      .setDescription('Gérer les compositions de groupes')
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('events')
      .setDescription('Gérer les événements du serveur')
  )
  .addSubcommandGroup((group) =>
    group
      .setName('permissions')
      .setDescription('Gérer les rôles autorisés à utiliser le bot')
      .addSubcommand((subcommand) =>
        subcommand
          .setName('add')
          .setDescription('Ajouter un rôle autorisé')
          .addRoleOption((option) =>
            option.setName('role').setDescription('Le rôle à autoriser').setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('remove')
          .setDescription('Retirer un rôle autorisé')
          .addRoleOption((option) =>
            option.setName('role').setDescription('Le rôle à retirer').setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('list')
          .setDescription('Lister les rôles autorisés')
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId;
  if (!guildId) return;

  const member = interaction.member as GuildMember;
  if (!member) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const subcommandGroup = interaction.options.getSubcommandGroup();
  const subcommand = interaction.options.getSubcommand();

  // 1. Check permissions
  // Only users with ManageGuild OR Authorized Role can access administrative subcommands
  const isAuthorized = await PermissionService.isUserAuthorized(member);
  
  if (!isAuthorized) {
    await interaction.editReply({
      content: '❌ Tu n\'as pas la permission d\'utiliser les commandes d\'administration de Group Maker.',
    });
    return;
  }

  // 2. Handle Permissions Management (Only for MANAGE_GUILD users to prevent lock-out)
  if (subcommandGroup === 'permissions') {
    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.editReply({
            content: '❌ Seuls les administrateurs du serveur (Gérer le serveur) peuvent modifier les permissions.',
        });
        return;
    }

    if (subcommand === 'add') {
      const role = interaction.options.getRole('role', true);
      await PermissionService.addAuthorizedRole(guildId, role.id);
      await interaction.editReply({ content: `✅ Le rôle **${role.name}** est maintenant autorisé à gérer Group Maker.` });
    } else if (subcommand === 'remove') {
      const role = interaction.options.getRole('role', true);
      try {
        await PermissionService.removeAuthorizedRole(guildId, role.id);
        await interaction.editReply({ content: `✅ Le rôle **${role.name}** a été retiré des permissions Group Maker.` });
      } catch (e) {
        await interaction.editReply({ content: `❌ Le rôle **${role.name}** n'est pas dans la liste des rôles autorisés.` });
      }
    } else if (subcommand === 'list') {
      const roles = await PermissionService.listAuthorizedRoles(guildId);
      if (roles.length === 0) {
        await interaction.editReply({ content: 'Aucun rôle spécifique n\'est configuré. Seuls les administrateurs ont accès.' });
      } else {
        const roleMentions = roles.map((r) => `<@&${r.roleId}>`).join(', ');
        await interaction.editReply({ content: `Rôles autorisés : ${roleMentions}` });
      }
    }
    return;
  }

  // 3. Handle Compositions
  if (subcommand === 'compositions') {
    const components = await buildCompositionsUI(guildId);
    await interaction.editReply({
      content: '**Group Maker** - Gestion des Compositions\nSélectionne une composition ci-dessous pour la modifier/supprimer, ou clique sur "Créer une Composition".',
      components,
    });
  }

  // 4. Handle Events
  if (subcommand === 'events') {
    const compositions = await CompositionService.listCompositions(guildId);
    const events = await EventService.listEvents(guildId);

    if (compositions.length === 0 && events.length === 0) {
      await interaction.editReply({
        content: 'Tu dois créer au moins une Composition (avec `/groupmaker compositions`) avant de pouvoir gérer des événements !',
      });
      return;
    }

    const components = await buildEventsUI(guildId);
    await interaction.editReply({
      content: '**Group Maker** - Gestionnaire d\'Événements\nUtilise les menus ci-dessous pour créer un nouvel événement ou gérer un événement actif.',
      components,
    });
  }
}
