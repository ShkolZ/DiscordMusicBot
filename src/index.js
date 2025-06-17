import { configDotenv } from "dotenv";
import { Client, Routes, GatewayIntentBits } from "discord.js";
import { REST } from "@discordjs/rest";
import { SlashCommandBuilder } from "@discordjs/builders";
import { Player, useQueue } from "discord-player";
import { DefaultExtractors } from "@discord-player/extractor";
import { YoutubeiExtractor } from "discord-player-youtubei";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

configDotenv();

const player = new Player(client);
await player.extractors.loadMulti(DefaultExtractors);
await player.extractors.register(YoutubeiExtractor, {});

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.APP_ID;
const SERVER_ID = process.env.SERVER_ID;
const rest = new REST({ version: "10" }).setToken(TOKEN);

client.on("ready", () => {
  console.log(`${client.user.tag} has logged in!`);
});

const newCommand = new SlashCommandBuilder().a;

const main = async () => {
  try {
    console.log("started refreshing");
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, SERVER_ID), {
      body: [
        new SlashCommandBuilder()
          .setName("play")
          .setDescription("Play Music")
          .addStringOption((option) =>
            option.setName("link").setDescription("idk").setRequired(true)
          )
          .toJSON(),
        new SlashCommandBuilder()
          .setName("skip")
          .setDescription("skipping current track")
          .toJSON(),
        new SlashCommandBuilder()
          .setName("stop")
          .setDescription("stopping player")
          .toJSON(),
      ],
    });
    client.login(TOKEN);
  } catch (err) {
    console.log(err);
  }
};

client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    //handle play command
    if (interaction.commandName === "play") {
      await interaction.deferReply();
      const queue = useQueue(interaction.guildId);
      const query = interaction.options.getString("link");
      let queueStatus;
      if (!queue) {
        queueStatus = false;
      } else {
        queueStatus = true;
      }
      const result = await player.search(query);

      if (result.isEmpty()) {
        return interaction.editReply("Анлак нічо не найшов :(");
      }

      try {
        const { track } = await player.play(
          interaction.member.voice.channel,
          result
        );
        if (queueStatus) {
          return interaction.editReply({
            content: `Добавив трек: ${track.title} в очередь!`,
          });
        }
        return interaction.editReply({
          content: `Трек: ${track.title} - Уже хуярить!`,
        });
      } catch (err) {
        console.log(err, "some error in playing track");
        return interaction.editReply({ content: `Ебать ти долбайоб` });
      }
      // }
    }
  }

  if (interaction.commandName === "stop") {
    await interaction.deferReply();
    const queue = useQueue(interaction.guildId);

    if (player.off) {
      return interaction.editReply({
        content: "Нема шо стопати долбаеба кусень",
      });
    }

    player.destroy();

    return interaction.editReply({ content: "Уже стопнув плеєр" });
  }
  if (interaction.commandName === "skip") {
    await interaction.deferReply();

    const queue = useQueue(interaction.guildId);

    if (player.off || !queue.isPlaying()) {
      return interaction.editReply({
        content: "Нема шо скіпати кусок клоуна на каті",
      });
    }

    queue.node.skip();
    return interaction.editReply({
      content: `Скіпнув трек. Мелкаш сосе хуй!\nЩас іграє: ${queue.currentTrack.title}`,
    });
  }
});

main();
