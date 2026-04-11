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
    .setName("announce")
    .setDescription("Announce a /cw invite message for a boss")
    .addStringOption((o) =>
      o.setName("character").setDescription("Character name").setRequired(true),
    )
    .addStringOption((o) =>
      o
        .setName("invites_keyword")
        .setDescription("Invites keyword")
        .setRequired(true),
    )
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
        .setName("open_duration")
        .setDescription(
          "How long the layer has been open: e.g. 1d2h39m, 18h30m, 39m, or 5h20 (=5h20m)",
        )
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
