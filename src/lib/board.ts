import { EmbedBuilder } from "discord.js";
import { State } from "../types";
import { BOSSES } from "../config";

export function build(state: State) {
  const scouts = state.scouts;

  const blocks = BOSSES.map((b) => {
    const list = scouts.filter((s) => s.boss === b);

    if (!list.length) return `**${b}**\nNo scouts`;

    const rows = list
      .map((s) => `• Layer ${s.layer} — <@${s.userId}>`)
      .join("\n");

    return `**${b}**\n${rows}`;
  });

  return new EmbedBuilder()
    .setTitle("World Boss Scout Board")
    .setDescription(blocks.join("\n\n"))
    .setColor(0xff9900);
}
