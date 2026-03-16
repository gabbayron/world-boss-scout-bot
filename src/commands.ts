import { SlashCommandBuilder, ChannelType } from "discord.js";
import { BOSSES } from "./config";

export const commands = [
  new SlashCommandBuilder()
    .setName("setup-board")
    .setDescription("Create board")
    .addChannelOption((o) =>
      o
        .setName("channel")
        .setDescription("Channel")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("scout")
    .setDescription("Register scouting")
    .addStringOption((o) =>
      o
        .setName("boss")
        .setDescription("Boss")
        .setRequired(true)
        .addChoices(...BOSSES.map((b) => ({ name: b, value: b }))),
    )
    .addStringOption((o) =>
      o
        .setName("layer")
        .setDescription("Choose a layer")
        .setRequired(true)
        .setAutocomplete(true),
    ),

  new SlashCommandBuilder()
    .setName("scout-remove")
    .setDescription("Remove one of your scout entries")
    .addStringOption((o) =>
      o
        .setName("boss")
        .setDescription("Boss")
        .setRequired(true)
        .addChoices(...BOSSES.map((b) => ({ name: b, value: b }))),
    )
    .addStringOption((o) =>
      o
        .setName("layer")
        .setDescription("Choose a layer")
        .setRequired(true)
        .setAutocomplete(true),
    ),

  new SlashCommandBuilder()
    .setName("create-layer")
    .setDescription("Create a scout layer")
    .addStringOption((option) =>
      option.setName("layer_id").setDescription("Layer ID").setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("start_time")
        .setDescription("Required format: DD/MM HH:mm (24h)")
        .setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("remove-layer")
    .setDescription("Remove an existing layer")
    .addStringOption((option) =>
      option
        .setName("layer_id")
        .setDescription("Choose a layer to remove")
        .setRequired(true)
        .setAutocomplete(true),
    ),

  new SlashCommandBuilder()
    .setName("boss-dead")
    .setDescription("Mark a boss as dead on a layer")
    .addStringOption((o) =>
      o
        .setName("boss")
        .setDescription("Boss")
        .setRequired(true)
        .addChoices(...BOSSES.map((b) => ({ name: b, value: b }))),
    )
    .addStringOption((o) =>
      o
        .setName("layer")
        .setDescription("Choose a layer")
        .setRequired(true)
        .setAutocomplete(true),
    ),
].map((c) => c.toJSON());
