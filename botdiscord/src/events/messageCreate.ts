import { Events, Message, TextChannel } from 'discord.js';
import { logger } from '../core/logger.js';
import { EventService } from '../services/event.service.js';
import { ParticipantService } from '../services/participant.service.js';
import { redrawEventMessage } from '../handlers/events.handler.js';

export const name = Events.MessageCreate;
export const once = false;

export async function execute(message: Message) {
  // Ignore bots
  if (message.author.bot) return;

  // We are only interested in threads (active threads where events lie)
  if (!message.channel.isThread()) return;

  const content = message.content.trim();

  // Try parsing actions: '1', '1 @pseudo', '-', '- @pseudo'
  const isUntag = content.startsWith('-');
  const isTag = /^\d+/.test(content);

  if (!isUntag && !isTag) return; // Not an action message

  const event = await EventService.getEventByThreadId(message.channel.id);
  if (!event) return; // Thread does not belong to an event

  const targetUser = message.mentions.users.first() || message.author;
  
  try {
    if (isUntag) {
      await ParticipantService.removeParticipant(event.id, targetUser.id);
    } else if (isTag) {
      // Parse the slot index (1-based from user perspective)
        const match = content.match(/^(\d+)/);
        if (match) {
          const slotNumber = parseInt(match[1], 10);
          
          // Map the user-visible number (1, 2, 3...) to the actual array index
          // We must skip empty lines (separators) during this count
          let roleIndex = -1;
          let currentVisibleCount = 0;

          for (let i = 0; i < event.composition.roles.length; i++) {
            if (event.composition.roles[i] !== '') {
              currentVisibleCount++;
              if (currentVisibleCount === slotNumber) {
                roleIndex = i;
                break;
              }
            }
          }

          if (roleIndex === -1) {
            await message.react('❓');
            return;
          }

          await ParticipantService.assignSlot(event.id, targetUser.id, roleIndex);
        }
    }

    await message.react('✅');
    await redrawEventMessage(event.id, message.client);
  } catch (err: any) {
    const businessErrors = ['SLOT_TAKEN', 'ALREADY_IN_SLOT', 'NOT_PARTICIPATING'];
    if (!businessErrors.includes(err.message)) {
      logger.warn({ err }, 'Failed participant action');
    }
    await message.react('❌');
    if (err.message === 'SLOT_TAKEN') {
      await message.reply({ content: 'Ce rôle est déjà pris par quelqu\'un d\'autre !' });
    } else if (err.message === 'ALREADY_IN_SLOT') {
      await message.reply({ content: 'Tu es déjà inscrit(e) à ce rôle précis !' });
    } else if (err.message === 'NOT_PARTICIPATING') {
      await message.reply({ content: 'Tu n\'es inscrit(e) dans aucun rôle pour le moment !' });
    } else {
      await message.reply({ content: 'Une erreur technique s\'est produite !' });
    }
  }
}
