import dotenv from "dotenv";
dotenv.config();

export const BOSSES = (process.env.BOSSES || "Kazzak,Doomwalker").split(",");
export const TOKEN = process.env.DISCORD_TOKEN!;
export const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
export const GUILD_ID = process.env.DISCORD_GUILD_ID!;
