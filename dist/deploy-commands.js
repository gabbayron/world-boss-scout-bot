"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("./config");
const cmds = [
    new discord_js_1.SlashCommandBuilder()
        .setName("setup-board")
        .setDescription("Create board")
        .addChannelOption((o) => o
        .setName("channel")
        .setDescription("Channel")
        .addChannelTypes(discord_js_1.ChannelType.GuildText)
        .setRequired(true)),
    new discord_js_1.SlashCommandBuilder()
        .setName("scout")
        .setDescription("Register scouting")
        .addStringOption((o) => o
        .setName("boss")
        .setDescription("Boss")
        .setRequired(true)
        .addChoices(...config_1.BOSSES.map((b) => ({ name: b, value: b }))))
        .addStringOption((o) => o.setName("layer").setDescription("Layer").setRequired(true)),
    new discord_js_1.SlashCommandBuilder()
        .setName("scout-remove")
        .setDescription("Remove one of your scout entries")
        .addStringOption((o) => o
        .setName("boss")
        .setDescription("Boss")
        .setRequired(true)
        .addChoices(...config_1.BOSSES.map((b) => ({ name: b, value: b }))))
        .addStringOption((o) => o.setName("layer").setDescription("Layer").setRequired(true)),
    new discord_js_1.SlashCommandBuilder()
        .setName("boss-dead")
        .setDescription("Clear boss")
        .addStringOption((o) => o
        .setName("boss")
        .setDescription("Boss")
        .setRequired(true)
        .addChoices(...config_1.BOSSES.map((b) => ({ name: b, value: b })))),
    new discord_js_1.SlashCommandBuilder()
        .setName("refresh-board")
        .setDescription("Refresh board"),
].map((c) => c.toJSON());
const rest = new discord_js_1.REST({ version: "10" }).setToken(config_1.TOKEN);
async function main() {
    await rest.put(discord_js_1.Routes.applicationGuildCommands(config_1.CLIENT_ID, config_1.GUILD_ID), {
        body: cmds,
    });
    console.log("Commands deployed");
}
main();
