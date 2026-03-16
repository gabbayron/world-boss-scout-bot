import { REST, Routes } from "discord.js";
import { CLIENT_ID, GUILD_ID, TOKEN } from "./config";
import { commands } from "./commands";

const rest = new REST({ version: "10" }).setToken(TOKEN);

async function main() {
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: commands,
  });

  console.log("Commands deployed");
}

main().catch((error) => {
  console.error("Failed to deploy commands:", error);
  process.exit(1);
});
