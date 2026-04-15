import { Client, Collection, Interaction } from 'discord.js';

export interface CommandDefinition {
  data: any; // We'll refine this with discord.js SlashCommandBuilder types later
  execute: (interaction: any) => Promise<void>;
}

export class GroupMakerClient extends Client {
  public commands: Collection<string, CommandDefinition>;

  constructor(options: any) {
    super(options);
    this.commands = new Collection();
  }
}
