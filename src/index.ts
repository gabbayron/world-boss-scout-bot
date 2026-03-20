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

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

let state: State;

// Bot interprets all layer times as UTC+1 (fixed offset).
const LAYER_TZ_OFFSET_MINUTES = 60;
const LAYER_TZ_OFFSET_MS = LAYER_TZ_OFFSET_MINUTES * 60 * 1000;
const LAYER_TIMEZONE = "Etc/GMT-1"; // UTC+1 (fixed, no DST)
const BOSS_KILL_ANNOUNCE_CHANNEL_ID = "1478812273169666281";
const ANNOUNCE_CHANNEL_ID = "1478812929779564738";
const BOSS_SCOUT_CHANNELS: Record<string, string> = {
  Kazzak: "1478812328446267433",
  Doomwalker: "1478812363619569835",
};

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function interactionActor(i: { user?: { tag?: string; id: string } }) {
  const tag = i.user?.tag ?? "unknown";
  const id = i.user?.id ?? "unknown";
  return `${tag} (${id})`;
}

function logCommandStart(i: any) {
  const actor = interactionActor(i);
  const guildId = i.guildId ?? "unknown";
  const channelId = i.channelId ?? "unknown";
  console.log(
    `[cmd:start] ${i.commandName} actor=${actor} guild=${guildId} channel=${channelId}`,
  );
}

function logCommandEnd(i: any, startedAtMs: number) {
  const actor = interactionActor(i);
  const ms = Date.now() - startedAtMs;
  const replied = Boolean(i.replied);
  const deferred = Boolean(i.deferred);
  console.log(
    `[cmd:end] ${i.commandName} actor=${actor} ms=${ms} replied=${replied} deferred=${deferred}`,
  );
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString("en-GB", {
    timeZone: LAYER_TIMEZONE,
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

  // Accept: "DD/MM HH:mm" (e.g. "25/03 12:02")
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})[\sT](\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const [, dayStr, monthStr, hourStr, minuteStr] = match;

  const day = Number(dayStr);
  const month = Number(monthStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (
    !Number.isFinite(day) ||
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
    minute > 59
  ) {
    return null;
  }

  // Use "today's year" in UTC+1 (fixed) to match user expectations.
  const nowTz = new Date(Date.now() + LAYER_TZ_OFFSET_MS);
  const yearTz = nowTz.getUTCFullYear();

  // Interpret input as UTC+1 local time and convert to UTC timestamp.
  // UTC = (UTC+1 time) - 1 hour
  const ts = Date.UTC(yearTz, month - 1, day, hour - 1, minute, 0, 0);

  if (!Number.isFinite(ts)) return null;

  // Guard against invalid dates like 31/02 by converting back to UTC+1.
  const backTz = new Date(ts + LAYER_TZ_OFFSET_MS);
  if (backTz.getUTCMonth() !== month - 1 || backTz.getUTCDate() !== day) {
    return null;
  }

  return ts;
}

function isLayerActive(layer: Layer) {
  return layer.endTime > Date.now();
}

function getAvailableLayers() {
  return state.layers
    .filter(isLayerActive)
    .sort((a, b) => a.startTime - b.startTime);
}

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: commands,
  });

  console.log("Commands registered automatically");
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

  const layers =
    i.commandName === "remove-layer"
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
      if (
        i.commandName === "scout" ||
        i.commandName === "scout-remove" ||
        i.commandName === "remove-layer" ||
        i.commandName === "boss-dead"
      ) {
        await handleLayerAutocomplete(i);
      }
      return;
    }

    if (!i.isChatInputCommand()) return;

    const startedAtMs = Date.now();
    logCommandStart(i);

    try {
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

        // If a board already exists in the selected channel, edit it instead of creating a new one.
        if (state.boardChannelId === textChannel.id && state.boardMessageId) {
          try {
            const existingMsg = await textChannel.messages.fetch(
              state.boardMessageId,
            );
            await existingMsg.edit({ embeds: [build(state)] });

            await i.reply({ content: "Board updated", ephemeral: true });
            return;
          } catch {
            // Fall through to creating a new board message.
          }
        }

        const msg = await textChannel.send({ embeds: [build(state)] });

        state.boardChannelId = textChannel.id;
        state.boardMessageId = msg.id;
        await save(state);

        await i.reply({ content: "Board created", ephemeral: true });
        return;
      }

      if (i.commandName === "create-layer") {
        const layerId = i.options.getString("layer_id", true).trim();
        const startTimeInput = i.options.getString("start_time", true);

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

        const startTime = parseStartTime(startTimeInput);

        if (!startTime) {
          await i.reply({
            content:
              "Invalid start_time format. Use **DD/MM HH:mm** (24h), for example: **25/03 12:02**",
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

        await save(state);

        await i.reply({
          content:
            `Created layer **${layerId}**\n` +
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

        state.bossKills = state.bossKills.filter(
          (k) => !(k.boss === boss && k.layer === layer),
        );

        state.bossKills.push({
          boss,
          layer,
          killedAt: Date.now(),
        });

        state.scouts = state.scouts.filter(
          (s) => !(s.boss === boss && s.layer === layer),
        );

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

        try {
          const announceChannel = await client.channels.fetch(
            BOSS_KILL_ANNOUNCE_CHANNEL_ID,
          );
          if (
            announceChannel &&
            announceChannel.type === ChannelType.GuildText
          ) {
            const announceTextChannel = announceChannel as TextChannel;
            const nowTs = Date.now();
            const formattedNow = formatDateTime(nowTs);
            await announceTextChannel.send(
              `${boss} - ${layer} - ${formattedNow}`,
            );
          }
        } catch (err) {
          console.error("Failed to send boss kill announcement:", err);
        }

        await i.reply({
          content: `Marked **${boss}** as dead on layer **${layer}**`,
          ephemeral: true,
        });
        return;
      }

    if (i.commandName === "announce") {
      const characterName = i.options.getString("character", true);
      const invitesKeyword = i.options.getString("invites_keyword", true);
      const boss = i.options.getString("boss", true);

      try {
        const ch = await client.channels.fetch(ANNOUNCE_CHANNEL_ID);
        if (ch && ch.type === ChannelType.GuildText) {
          const textChannel = ch as TextChannel;
          const payload = `@everyone ${boss}\n\`\`\`/cw ${characterName} ${invitesKeyword}\`\`\``;

          await textChannel.send(payload);
          await i.reply({ content: "Announcement sent.", ephemeral: true });
        } else {
          await i.reply({
            content: "Announcement channel not found or not a text channel.",
            ephemeral: true,
          });
        }
      } catch (err) {
        console.error("Failed to send /announce message:", err);
        await i.reply({
          content: "Failed to send announcement.",
          ephemeral: true,
        });
      }

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

        const isDead = state.bossKills.some(
          (k) => k.boss === boss && k.layer === layer,
        );
        if (isDead) {
          await i.reply({
            content: `**${boss}** is already marked as dead on layer **${layer}**.`,
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

        try {
          const scoutChannelId = BOSS_SCOUT_CHANNELS[boss];
          if (scoutChannelId) {
            const scoutChannel = await client.channels.fetch(scoutChannelId);
            if (scoutChannel && scoutChannel.type === ChannelType.GuildText) {
              const textScoutChannel = scoutChannel as TextChannel;
              await textScoutChannel.send(
                `<@${i.user.id}> started scouting on layer ${layer}`,
              );
            }
          }
        } catch (err) {
          console.error("Failed to send scout start announcement:", err);
        }
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

        const removedEntry = state.scouts.find(
          (s) => s.userId === i.user.id && s.boss === boss && s.layer === layer,
        );
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

        try {
          const scoutChannelId = BOSS_SCOUT_CHANNELS[boss];
          if (scoutChannelId) {
            const scoutChannel = await client.channels.fetch(scoutChannelId);
            if (scoutChannel && scoutChannel.type === ChannelType.GuildText) {
              const textScoutChannel = scoutChannel as TextChannel;
              const hasStartTimestamp =
                typeof removedEntry?.timestamp === "number" &&
                Number.isFinite(removedEntry.timestamp);
              const durationText = hasStartTimestamp
                ? ` (total: ${formatDuration(Date.now() - removedEntry.timestamp)})`
                : "";
              await textScoutChannel.send(
                `<@${i.user.id}> finished scouting on layer ${layer}${durationText}`,
              );
            }
          }
        } catch (err) {
          console.error("Failed to send scout finish announcement:", err);
        }
        return;
      }
    } finally {
      logCommandEnd(i, startedAtMs);
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
