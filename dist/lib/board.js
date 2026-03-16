"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.build = build;
const discord_js_1 = require("discord.js");
const config_1 = require("../config");
function build(state) {
    const now = Date.now();
    const scouts = state.scouts.filter(s => now - s.timestamp < config_1.STALE_MINUTES * 60 * 1000);
    const blocks = config_1.BOSSES.map(b => {
        const list = scouts.filter(s => s.boss === b);
        if (!list.length)
            return `**${b}**\nNo scouts`;
        const rows = list.map(s => `• Layer ${s.layer} — <@${s.userId}>`).join("\n");
        return `**${b}**\n${rows}`;
    });
    return new discord_js_1.EmbedBuilder()
        .setTitle("World Boss Scout Board")
        .setDescription(blocks.join("\n\n"))
        .setColor(0xff9900);
}
