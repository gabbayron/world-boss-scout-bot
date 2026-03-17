import { EmbedBuilder } from "discord.js";
import { State } from "../types";
import { BOSSES } from "../config";

function formatDiscordRelativeTime(tsMs: number) {
  return `<t:${Math.floor(tsMs / 1000)}:R>`;
}

export function build(state: State) {
  const { scouts, layers, bossKills } = state;

  if (!layers.length) {
    return new EmbedBuilder()
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

      const bossLines = BOSSES.map((boss) => {
        const isKilled = bossKills.some(
          (k) => k.boss === boss && k.layer === layer.id,
        );

        const status = isKilled ? "❌" : "✅";

        return `${boss}: ${status}`;
      }).join("\n");

      const layerScouts = scouts.filter((s) => s.layer === layer.id);

      const scoutsSection = layerScouts.length
        ? layerScouts.map((s) => `• <@${s.userId}> — ${s.boss}`).join("\n")
        : "No scouts";

      return `**Layer ${layer.id}**\n${timerLine}\n${bossLines}\nScouts\n${scoutsSection}`;
    });

  return new EmbedBuilder()
    .setTitle("World Boss Scout Board")
    .setDescription(layerBlocks.join("\n\n"))
    .setColor(0xff9900);
}
