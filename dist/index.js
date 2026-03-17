"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("./config");
const storage_1 = require("./lib/storage");
const board_1 = require("./lib/board");
const commands_1 = require("./commands");
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
});
const client = new discord_js_1.Client({
    intents: [discord_js_1.GatewayIntentBits.Guilds],
});
let state;
function formatDateTime(ts) {
    return new Date(ts).toLocaleString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}
function parseStartTime(input) {
    const trimmed = input.trim();
    // Accept: "DD/MM HH:mm" (e.g. "25/03 12:02")
    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})[\sT](\d{1,2}):(\d{2})$/);
    if (!match)
        return null;
    const [, dayStr, monthStr, hourStr, minuteStr] = match;
    const day = Number(dayStr);
    const month = Number(monthStr);
    const hour = Number(hourStr);
    const minute = Number(minuteStr);
    if (!Number.isFinite(day) ||
        !Number.isFinite(month) ||
        !Number.isFinite(hour) ||
        !Number.isFinite(minute) ||
        day < 1 ||
        day > 31 ||
        month < 1 ||
        month > 12 ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59) {
        return null;
    }
    const now = new Date();
    // Always use the current year (past dates are allowed and will be "closed").
    const date = new Date(now.getFullYear(), month - 1, day, hour, minute, 0, 0);
    if (Number.isNaN(date.getTime()))
        return null;
    // Guard against invalid dates like 31/02
    if (date.getMonth() !== month - 1 || date.getDate() !== day)
        return null;
    return date.getTime();
}
function isLayerActive(layer) {
    return layer.endTime > Date.now();
}
function getAvailableLayers() {
    return state.layers
        .filter(isLayerActive)
        .sort((a, b) => a.startTime - b.startTime);
}
async function registerCommands() {
    const rest = new discord_js_1.REST({ version: "10" }).setToken(config_1.TOKEN);
    await rest.put(discord_js_1.Routes.applicationGuildCommands(config_1.CLIENT_ID, config_1.GUILD_ID), {
        body: commands_1.commands,
    });
    console.log("Commands registered automatically");
}
async function updateBoard(channel) {
    if (!state.boardMessageId)
        return;
    const msg = await channel.messages.fetch(state.boardMessageId);
    const embed = (0, board_1.build)(state);
    await msg.edit({ embeds: [embed] });
}
async function getBoardChannelFromState() {
    if (!state.boardChannelId)
        return null;
    const ch = await client.channels.fetch(state.boardChannelId);
    if (!ch || ch.type !== discord_js_1.ChannelType.GuildText) {
        return null;
    }
    return ch;
}
async function handleLayerAutocomplete(i) {
    state = await (0, storage_1.load)();
    const focused = i.options.getFocused().toLowerCase();
    const layers = i.commandName === "remove-layer"
        ? [...state.layers].sort((a, b) => a.startTime - b.startTime)
        : getAvailableLayers();
    const filtered = layers
        .filter((layer) => layer.id.toLowerCase().includes(focused))
        .slice(0, 25)
        .map((layer) => ({
        name: layer.id,
        value: layer.id,
    }));
    await i.respond(filtered);
}
client.on("interactionCreate", async (i) => {
    try {
        if (i.isAutocomplete()) {
            if (i.commandName === "scout" ||
                i.commandName === "scout-remove" ||
                i.commandName === "remove-layer" ||
                i.commandName === "boss-dead") {
                await handleLayerAutocomplete(i);
            }
            return;
        }
        if (!i.isChatInputCommand())
            return;
        if (i.commandName === "setup-board") {
            const ch = i.options.getChannel("channel", true);
            if (ch.type !== discord_js_1.ChannelType.GuildText) {
                await i.reply({
                    content: "Please choose a normal text channel.",
                    ephemeral: true,
                });
                return;
            }
            const textChannel = ch;
            // If a board already exists in the selected channel, edit it instead of creating a new one.
            if (state.boardChannelId === textChannel.id && state.boardMessageId) {
                try {
                    const existingMsg = await textChannel.messages.fetch(state.boardMessageId);
                    await existingMsg.edit({ embeds: [(0, board_1.build)(state)] });
                    await i.reply({ content: "Board updated", ephemeral: true });
                    return;
                }
                catch {
                    // Fall through to creating a new board message.
                }
            }
            const msg = await textChannel.send({ embeds: [(0, board_1.build)(state)] });
            state.boardChannelId = textChannel.id;
            state.boardMessageId = msg.id;
            await (0, storage_1.save)(state);
            await i.reply({ content: "Board created", ephemeral: true });
            return;
        }
        if (i.commandName === "create-layer") {
            const layerId = i.options.getString("layer_id", true).trim();
            const startTimeInput = i.options.getString("start_time", true);
            const existing = state.layers.find((layer) => layer.id.toLowerCase() === layerId.toLowerCase());
            if (existing) {
                await i.reply({
                    content: `Layer **${layerId}** already exists.`,
                    ephemeral: true,
                });
                return;
            }
            const startTime = parseStartTime(startTimeInput);
            if (!startTime) {
                await i.reply({
                    content: "Invalid start_time format. Use **DD/MM HH:mm** (24h), for example: **25/03 12:02**",
                    ephemeral: true,
                });
                return;
            }
            const endTime = startTime + 24 * 60 * 60 * 1000;
            state.layers.push({
                id: layerId,
                startTime,
                endTime,
                createdAt: Date.now(),
            });
            state.layers.sort((a, b) => a.startTime - b.startTime);
            await (0, storage_1.save)(state);
            await i.reply({
                content: `Created layer **${layerId}**\n` +
                    `Start: **${formatDateTime(startTime)}**\n` +
                    `End: **${formatDateTime(endTime)}**`,
                ephemeral: true,
            });
            const boardChannel = await getBoardChannelFromState();
            if (boardChannel) {
                await updateBoard(boardChannel);
            }
            return;
        }
        if (i.commandName === "remove-layer") {
            const layerId = i.options.getString("layer_id", true);
            const beforeLayers = state.layers.length;
            state.layers = state.layers.filter((layer) => layer.id !== layerId);
            if (beforeLayers === state.layers.length) {
                await i.reply({
                    content: `Layer **${layerId}** was not found.`,
                    ephemeral: true,
                });
                return;
            }
            state.scouts = state.scouts.filter((scout) => scout.layer !== layerId);
            await (0, storage_1.save)(state);
            const boardChannel = await getBoardChannelFromState();
            if (boardChannel) {
                await updateBoard(boardChannel);
            }
            await i.reply({
                content: `Removed layer **${layerId}** and cleared scouts on it.`,
                ephemeral: true,
            });
            return;
        }
        if (i.commandName === "boss-dead") {
            if (!state.boardChannelId) {
                await i.reply({
                    content: "Board is not set up yet. Run /setup-board first.",
                    ephemeral: true,
                });
                return;
            }
            const boss = i.options.getString("boss", true);
            const layer = i.options.getString("layer", true);
            const validLayer = state.layers.find((l) => l.id === layer);
            if (!validLayer) {
                await i.reply({
                    content: `Layer **${layer}** does not exist.`,
                    ephemeral: true,
                });
                return;
            }
            state.bossKills = state.bossKills.filter((k) => !(k.boss === boss && k.layer === layer));
            state.bossKills.push({
                boss,
                layer,
                killedAt: Date.now(),
            });
            await (0, storage_1.save)(state);
            const ch = await getBoardChannelFromState();
            if (!ch) {
                await i.reply({
                    content: "Configured board channel is invalid.",
                    ephemeral: true,
                });
                return;
            }
            await updateBoard(ch);
            await i.reply({
                content: `Marked **${boss}** as dead on layer **${layer}**`,
                ephemeral: true,
            });
            return;
        }
        if (i.commandName === "scout") {
            if (!state.boardChannelId) {
                await i.reply({
                    content: "Board is not set up yet. Run /setup-board first.",
                    ephemeral: true,
                });
                return;
            }
            const boss = i.options.getString("boss", true);
            const layer = i.options.getString("layer", true);
            const validLayer = getAvailableLayers().find((l) => l.id === layer);
            if (!validLayer) {
                await i.reply({
                    content: `Layer **${layer}** is not available.`,
                    ephemeral: true,
                });
                return;
            }
            const isDead = state.bossKills.some((k) => k.boss === boss && k.layer === layer);
            if (isDead) {
                await i.reply({
                    content: `**${boss}** is already marked as dead on layer **${layer}**.`,
                    ephemeral: true,
                });
                return;
            }
            const alreadyExists = state.scouts.some((s) => s.userId === i.user.id && s.boss === boss && s.layer === layer);
            if (alreadyExists) {
                await i.reply({
                    content: `You are already scouting **${boss}** on layer **${layer}**.`,
                    ephemeral: true,
                });
                return;
            }
            state.scouts.push({
                userId: i.user.id,
                username: i.user.username,
                boss,
                layer,
                timestamp: Date.now(),
            });
            await (0, storage_1.save)(state);
            const ch = await getBoardChannelFromState();
            if (!ch) {
                await i.reply({
                    content: "Configured board channel is invalid.",
                    ephemeral: true,
                });
                return;
            }
            await updateBoard(ch);
            await i.reply({
                content: `Added: **${boss}** on layer **${layer}**`,
                ephemeral: true,
            });
            return;
        }
        if (i.commandName === "scout-remove") {
            if (!state.boardChannelId) {
                await i.reply({
                    content: "Board is not set up yet.",
                    ephemeral: true,
                });
                return;
            }
            const boss = i.options.getString("boss", true);
            const layer = i.options.getString("layer", true);
            const before = state.scouts.length;
            state.scouts = state.scouts.filter((s) => !(s.userId === i.user.id && s.boss === boss && s.layer === layer));
            const removed = before !== state.scouts.length;
            if (!removed) {
                await i.reply({
                    content: `You do not have a scout entry for **${boss}** on layer **${layer}**.`,
                    ephemeral: true,
                });
                return;
            }
            await (0, storage_1.save)(state);
            const ch = await getBoardChannelFromState();
            if (!ch) {
                await i.reply({
                    content: "Configured board channel is invalid.",
                    ephemeral: true,
                });
                return;
            }
            await updateBoard(ch);
            await i.reply({
                content: `Removed: **${boss}** on layer **${layer}**`,
                ephemeral: true,
            });
            return;
        }
    }
    catch (error) {
        console.error("Interaction error:", error);
        if (i.isRepliable() && !i.replied && !i.deferred) {
            await i.reply({
                content: "Something went wrong while handling that command.",
                ephemeral: true,
            });
        }
    }
});
async function main() {
    state = await (0, storage_1.load)();
    client.on("error", (error) => {
        console.error("Discord client error:", error);
    });
    client.on("shardError", (error) => {
        console.error("Discord shard error:", error);
    });
    client.on("warn", (info) => {
        console.warn("Discord warning:", info);
    });
    client.once("ready", async () => {
        try {
            console.log(`Bot ready as ${client.user?.tag ?? "unknown user"}`);
            await registerCommands();
            console.log("Startup finished");
        }
        catch (error) {
            console.error("Failed during startup command registration:", error);
        }
    });
    await client.login(config_1.TOKEN);
}
main().catch((error) => {
    console.error("Startup error:", error);
    process.exit(1);
});
