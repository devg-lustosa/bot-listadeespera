require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Lista de IDs de canais de espera (vem do .env)
const ESPERA_CHANNEL_IDS = process.env.ESPERA_CHANNEL_IDS.split(",");

// Estrutura para armazenar dados por servidor
let servidores = {};

client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  const member = newState.member || oldState.member;
  if (!member || !member.user || !member.guild) return;

  const guildId = member.guild.id;

  // Inicializa dados do servidor se necessário
  if (!servidores[guildId]) {
    servidores[guildId] = {
      contador: 1,
      esperaLista: [],
      apelidosOriginais: {},
    };
  }

  const dados = servidores[guildId];

  console.log(
    `🎧 Movimento detectado em ${member.guild.name}: ${member.user.username}`
  );

  const entrouNaEspera =
    newState.channelId && ESPERA_CHANNEL_IDS.includes(newState.channelId);
  const saiuDaEspera =
    oldState.channelId &&
    ESPERA_CHANNEL_IDS.includes(oldState.channelId) &&
    (!newState.channelId || !ESPERA_CHANNEL_IDS.includes(newState.channelId));

  if (entrouNaEspera) {
    if (dados.esperaLista.includes(member.id)) return;

    // Salva apelido original
    dados.apelidosOriginais[member.id] = member.nickname || null;

    const apelidoNovo = `E-${String(dados.contador).padStart(2, "0")} ${
      member.user.username
    }`;
    try {
      await member.setNickname(apelidoNovo);
      console.log(
        `✅ [${member.guild.name}] Apelido alterado para: ${apelidoNovo}`
      );
    } catch (err) {
      console.error(
        `❌ [${member.guild.name}] Erro ao alterar apelido de ${member.user.username}:`,
        err.message
      );
    }

    dados.esperaLista.push(member.id);
    dados.contador++;
  }

  if (saiuDaEspera) {
    dados.esperaLista = dados.esperaLista.filter((id) => id !== member.id);

    const apelidoOriginal = dados.apelidosOriginais[member.id];
    try {
      await member.setNickname(apelidoOriginal);
      console.log(
        `🔄 [${member.guild.name}] Apelido restaurado para: ${
          apelidoOriginal || member.user.username
        }`
      );
    } catch (err) {
      console.error(
        `❌ [${member.guild.name}] Erro ao restaurar apelido de ${member.user.username}:`,
        err.message
      );
    }

    delete dados.apelidosOriginais[member.id];
  }
});

client.login(process.env.DISCORD_TOKEN);
