import { REST, Routes, SlashCommandBuilder, ChannelType } from "discord.js";
import { CLIENT_ID, GUILD_ID, TOKEN, BOSSES } from "./config";

const cmds = [
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
      o.setName("layer").setDescription("Layer").setRequired(true),
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
      o.setName("layer").setDescription("Layer").setRequired(true),
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
    .setName("refresh-board")
    .setDescription("Refresh board"),
].map((c) => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

async function main() {
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: cmds,
  });
  console.log("Commands deployed");
}

main();
