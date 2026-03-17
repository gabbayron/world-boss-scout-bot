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
        const isClosed = layer.endTime <= Date.now();
        const timerLine = isClosed
            ? `Status: **CLOSED** (${formatDiscordRelativeTime(layer.endTime)})`
            : `Closes: ${formatDiscordRelativeTime(layer.endTime)}`;
        const bossLines = config_1.BOSSES.map((boss) => {
            const isKilled = bossKills.some((k) => k.boss === boss && k.layer === layer.id);
            const status = isKilled ? "❌" : "✅";
            return `${boss}: ${status}`;
        }).join("\n");
        const layerScouts = scouts.filter((s) => s.layer === layer.id);
        const scoutsSection = layerScouts.length
            ? layerScouts.map((s) => `• <@${s.userId}> — ${s.boss}`).join("\n")
            : "No scouts";
        return `**Layer ${layer.id}**\n${timerLine}\n${bossLines}\nScouts\n${scoutsSection}`;
    });
    return new discord_js_1.EmbedBuilder()
        .setTitle("World Boss Scout Board")
        .setDescription(layerBlocks.join("\n\n"))
        .setColor(0xff9900);
}
