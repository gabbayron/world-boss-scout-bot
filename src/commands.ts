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
    .setName("boss-dead")
    .setDescription("Clear boss")
    .addStringOption((o) =>
      o
        .setName("boss")
        .setDescription("Boss")
        .setRequired(true)
        .addChoices(...BOSSES.map((b) => ({ name: b, value: b }))),
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
        .setDescription("Optional. Format: YYYY-MM-DD HH:mm (24h)")
        .setRequired(false),
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
    .setName("refresh-board")
    .setDescription("Refresh board"),
].map((c) => c.toJSON());
