import { EmbedBuilder } from "discord.js";
import { State } from "../types";
import { BOSSES } from "../config";
import { compareLayerIdsAsc } from "./layers";

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

  const layerBlocks = [...layers].sort(compareLayerIdsAsc).map((layer) => {
    const now = Date.now();

    const isClosed = layer.endTime <= now;
    const isUpcoming = layer.startTime > now;
    const isOpen = !isClosed && !isUpcoming;

    const timerLine = isClosed
      ? `Layer ${layer.id}: **closed** ${formatDiscordRelativeTime(layer.endTime)}`
      : isUpcoming
        ? `Layer ${layer.id}: **opens** ${formatDiscordRelativeTime(layer.startTime)}`
        : `Layer ${layer.id}: **closes** ${formatDiscordRelativeTime(layer.endTime)}`;

    const layerScouts = scouts.filter((s) => s.layer === layer.id);

    const bossLines = BOSSES.map((boss) => {
      const isKilled = bossKills.some(
        (k) => k.boss === boss && k.layer === layer.id,
      );

      const status = isKilled ? "❌" : "✅";

      const bossScouts = layerScouts.filter((s) => s.boss === boss);
      const showScouts = isOpen && !isKilled;
      const scoutList = showScouts
        ? bossScouts.length
          ? bossScouts.map((s) => `• <@${s.userId}>`).join("\n")
          : "• (no scouts)"
        : "";

      return scoutList
        ? `${status} **${boss}**\n${scoutList}`
        : `${status} **${boss}**`;
    }).join("\n");

    return `${timerLine}\n${bossLines}`;
  });

  return new EmbedBuilder()
    .setTitle("World Boss Scout Board")
    .setDescription(layerBlocks.join("\n\n"))
    .setColor(0xff9900);
}
