import {
  Client,
  GatewayIntentBits,
  TextChannel,
  ChannelType,
} from "discord.js";
import { TOKEN } from "./config";
import { load, save } from "./lib/storage";
import { build } from "./lib/board";
import { State } from "./types";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

let state: State;

async function updateBoard(channel: TextChannel) {
  if (!state.boardMessageId) return;

  const msg = await channel.messages.fetch(state.boardMessageId);
  const embed = build(state);

  await msg.edit({ embeds: [embed] });
}

client.on("interactionCreate", async (i) => {
  try {
    if (!i.isChatInputCommand()) return;

    if (i.commandName === "setup-board") {
      const ch = i.options.getChannel("channel", true);

      if (ch.type !== ChannelType.GuildText) {
        await i.reply({
          content: "Please choose a normal text channel.",
          ephemeral: true,
        });
        return;
      }

      const textChannel = ch as TextChannel;
      const msg = await textChannel.send({ embeds: [build(state)] });

      state.boardChannelId = textChannel.id;
      state.boardMessageId = msg.id;
      await save(state);

      await i.reply({ content: "Board created", ephemeral: true });
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

      const alreadyExists = state.scouts.some(
        (s) => s.userId === i.user.id && s.boss === boss && s.layer === layer,
      );

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

      await save(state);

      const ch = await client.channels.fetch(state.boardChannelId);
      if (!ch || ch.type !== ChannelType.GuildText) {
        await i.reply({
          content: "Configured board channel is invalid.",
          ephemeral: true,
        });
        return;
      }

      await updateBoard(ch as TextChannel);

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

      state.scouts = state.scouts.filter(
        (s) =>
          !(s.userId === i.user.id && s.boss === boss && s.layer === layer),
      );

      const removed = before !== state.scouts.length;

      if (!removed) {
        await i.reply({
          content: `You do not have a scout entry for **${boss}** on layer **${layer}**.`,
          ephemeral: true,
        });
        return;
      }

      await save(state);

      const ch = await client.channels.fetch(state.boardChannelId);
      if (!ch || ch.type !== ChannelType.GuildText) {
        await i.reply({
          content: "Configured board channel is invalid.",
          ephemeral: true,
        });
        return;
      }

      await updateBoard(ch as TextChannel);

      await i.reply({
        content: `Removed: **${boss}** on layer **${layer}**`,
        ephemeral: true,
      });
      return;
    }

    if (i.commandName === "boss-dead") {
      if (!state.boardChannelId) {
        await i.reply({
          content: "Board is not set up yet.",
          ephemeral: true,
        });
        return;
      }

      const boss = i.options.getString("boss", true);

      state.scouts = state.scouts.filter((s) => s.boss !== boss);
      await save(state);

      const ch = await client.channels.fetch(state.boardChannelId);
      if (!ch || ch.type !== ChannelType.GuildText) {
        await i.reply({
          content: "Configured board channel is invalid.",
          ephemeral: true,
        });
        return;
      }

      await updateBoard(ch as TextChannel);

      await i.reply({ content: "Boss cleared", ephemeral: true });
      return;
    }

    if (i.commandName === "refresh-board") {
      if (!state.boardChannelId) {
        await i.reply({
          content: "Board is not set up yet.",
          ephemeral: true,
        });
        return;
      }

      state = await load();

      const ch = await client.channels.fetch(state.boardChannelId ?? "");
      if (!ch || ch.type !== ChannelType.GuildText) {
        await i.reply({
          content: "Configured board channel is invalid.",
          ephemeral: true,
        });
        return;
      }

      await updateBoard(ch as TextChannel);

      await i.reply({ content: "Board refreshed", ephemeral: true });
      return;
    }
  } catch (error) {
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
  state = await load();

  client.once("ready", () => {
    console.log("Bot ready");
  });

  await client.login(TOKEN);
}

main().catch((error) => {
  console.error("Startup error:", error);
  process.exit(1);
});
