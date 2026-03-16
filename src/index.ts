import {
  Client,
  GatewayIntentBits,
  TextChannel,
  ChannelType,
  AutocompleteInteraction,
  REST,
  Routes,
} from "discord.js";
import { TOKEN, CLIENT_ID, GUILD_ID } from "./config";
import { load, save } from "./lib/storage";
import { build } from "./lib/board";
import { Layer, State } from "./types";
import { commands } from "./commands";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

let state: State;

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: commands,
  });

  console.log("Commands registered automatically");
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function parseStartTime(input: string): number | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2})$/);

  if (!match) return null;

  const [, year, month, day, hour, minute] = match;

  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0,
    0,
  );

  if (Number.isNaN(date.getTime())) return null;

  return date.getTime();
}

function isLayerActive(layer: Layer) {
  return layer.endTime > Date.now();
}

function getAvailableLayers() {
  return state.layers
    .filter(isLayerActive)
    .sort((a, b) => a.startTime - b.startTime);
}

async function updateBoard(channel: TextChannel) {
  if (!state.boardMessageId) return;

  const msg = await channel.messages.fetch(state.boardMessageId);
  const embed = build(state);

  await msg.edit({ embeds: [embed] });
}

async function getBoardChannelFromState(): Promise<TextChannel | null> {
  if (!state.boardChannelId) return null;

  const ch = await client.channels.fetch(state.boardChannelId);
  if (!ch || ch.type !== ChannelType.GuildText) {
    return null;
  }

  return ch as TextChannel;
}

async function handleLayerAutocomplete(i: AutocompleteInteraction) {
  state = await load();

  const focused = i.options.getFocused().toLowerCase();
  const availableLayers = getAvailableLayers();

  const filtered = availableLayers
    .filter((layer) => layer.id.toLowerCase().includes(focused))
    .slice(0, 25)
    .map((layer) => ({
      name: `${layer.id} | ${formatDateTime(layer.startTime)} -> ${formatDateTime(layer.endTime)}`,
      value: layer.id,
    }));

  await i.respond(filtered);
}

client.on("interactionCreate", async (i) => {
  try {
    if (i.isAutocomplete()) {
      if (
        i.commandName === "scout" ||
        i.commandName === "scout-remove" ||
        i.commandName === "remove-layer"
      ) {
        await handleLayerAutocomplete(i);
      }
      return;
    }

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

    if (i.commandName === "create-layer") {
      const layerId = i.options.getString("layer_id", true).trim();
      const startTimeInput = i.options.getString("start_time");

      const existing = state.layers.find(
        (layer) => layer.id.toLowerCase() === layerId.toLowerCase(),
      );

      if (existing) {
        await i.reply({
          content: `Layer **${layerId}** already exists.`,
          ephemeral: true,
        });
        return;
      }

      let startTime: number;

      if (startTimeInput) {
        const parsed = parseStartTime(startTimeInput);

        if (!parsed) {
          await i.reply({
            content:
              "Invalid start_time format. Use **YYYY-MM-DD HH:mm** (24h), for example: **2026-03-17 21:30**",
            ephemeral: true,
          });
          return;
        }

        startTime = parsed;
      } else {
        startTime = Date.now() + 24 * 60 * 60 * 1000;
      }

      const endTime = startTime + 24 * 60 * 60 * 1000;

      state.layers.push({
        id: layerId,
        startTime,
        endTime,
        createdAt: Date.now(),
      });

      state.layers.sort((a, b) => a.startTime - b.startTime);

      await save(state);

      await i.reply({
        content:
          `Created layer **${layerId}**\n` +
          `Start: **${formatDateTime(startTime)}**\n` +
          `End: **${formatDateTime(endTime)}**`,
        ephemeral: true,
      });
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
      await save(state);

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

      const ch = await getBoardChannelFromState();
      if (!ch) {
        await i.reply({
          content: "Configured board channel is invalid.",
          ephemeral: true,
        });
        return;
      }

      await updateBoard(ch);

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

      const ch = await getBoardChannelFromState();
      if (!ch) {
        await i.reply({
          content: "Configured board channel is invalid.",
          ephemeral: true,
        });
        return;
      }

      await updateBoard(ch);

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

  client.once("ready", async () => {
    try {
      console.log(`Bot ready as ${client.user?.tag ?? "unknown user"}`);
      await registerCommands();
      console.log("Startup finished");
    } catch (error) {
      console.error("Failed during startup command registration:", error);
    }
  });

  await client.login(TOKEN);
}

main().catch((error) => {
  console.error("Startup error:", error);
  process.exit(1);
});
