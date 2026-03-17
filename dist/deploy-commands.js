"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("./config");
const commands_1 = require("./commands");
const rest = new discord_js_1.REST({ version: "10" }).setToken(config_1.TOKEN);
async function main() {
    await rest.put(discord_js_1.Routes.applicationGuildCommands(config_1.CLIENT_ID, config_1.GUILD_ID), {
        body: commands_1.commands,
    });
    console.log("Commands deployed");
}
main().catch((error) => {
    console.error("Failed to deploy commands:", error);
    process.exit(1);
});
