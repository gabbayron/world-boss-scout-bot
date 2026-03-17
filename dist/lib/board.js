"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.build = build;
const discord_js_1 = require("discord.js");
const config_1 = require("../config");
function formatDiscordRelativeTime(tsMs) {
    return `<t:${Math.floor(tsMs / 1000)}:R>`;
}
function build(state) {
    const { scouts, layers, bossKills } = state;
    if (!layers.length) {
        return new discord_js_1.EmbedBuilder()
            .setTitle("World Boss Scout Board")
            .setDescription("No layers configured yet.")
            .setColor(0xff9900);
    }
    const layerBlocks = [...layers]
        .sort((a, b) => a.startTime - b.startTime)
        .map((layer) => {
        const now = Date.now();
        const isClosed = layer.endTime <= now;
        const isUpcoming = layer.startTime > now;
        const opens = `Opens: ${formatDiscordRelativeTime(layer.startTime)}`;
        const closes = `Closes: ${formatDiscordRelativeTime(layer.endTime)}`;
        const timerLine = isClosed
            ? `Status: **CLOSED** (${formatDiscordRelativeTime(layer.endTime)})`
            : isUpcoming
                ? `Status: **UPCOMING**\n${opens}\n${closes}`
                : `Status: **OPEN**\n${closes}`;
        const layerScouts = scouts.filter((s) => s.layer === layer.id);
        const bossLines = config_1.BOSSES.map((boss) => {
            const isKilled = bossKills.some((k) => k.boss === boss && k.layer === layer.id);
            const status = isKilled ? "❌" : "✅";
            const bossScouts = layerScouts.filter((s) => s.boss === boss);
            const scoutList = bossScouts.length
                ? bossScouts.map((s) => `• <@${s.userId}>`).join("\n")
                : "• (no scouts)";
            return `**${boss}**: ${status}\n${scoutList}`;
        }).join("\n");
        return `**Layer ${layer.id}**\n${timerLine}\n\n${bossLines}`;
    });
    return new discord_js_1.EmbedBuilder()
        .setTitle("World Boss Scout Board")
        .setDescription(layerBlocks.join("\n\n"))
        .setColor(0xff9900);
}
