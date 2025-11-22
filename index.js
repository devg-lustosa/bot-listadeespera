require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const ESPERA_CHANNEL_IDS = (process.env.ESPERA_CHANNEL_IDS || "")
  .split(",")
  .filter((id) => id);

let servidores = {};

client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  const member = newState.member || oldState.member;
  if (!member || !member.user || !member.guild) return;

  const guildId = member.guild.id;

  if (!servidores[guildId]) {
    servidores[guildId] = {
      contador: 1,
      esperaLista: [],
      apelidosOriginais: {},
      timeouts: {},
    };
  }

  const dados = servidores[guildId];

  const entrouNaEspera =
    newState.channelId && ESPERA_CHANNEL_IDS.includes(newState.channelId);
  const saiuDaEspera =
    oldState.channelId &&
    ESPERA_CHANNEL_IDS.includes(oldState.channelId) &&
    (!newState.channelId || !ESPERA_CHANNEL_IDS.includes(newState.channelId));

  if (entrouNaEspera) {
    // Se tinha timeout pendente, cancela
    if (dados.timeouts[member.id]) {
      clearTimeout(dados.timeouts[member.id]);
      delete dados.timeouts[member.id];
      console.log(
        `⏳ [${member.guild.name}] Timeout cancelado para ${member.user.username}, voltou a tempo.`
      );
    }

    if (dados.esperaLista.includes(member.id)) return;

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
    // Inicia timeout de 5 minutos antes de restaurar apelido
    dados.timeouts[member.id] = setTimeout(async () => {
      const apelidoOriginal = dados.apelidosOriginais[member.id];
      try {
        // Buscar o membro novamente pelo guild
        const membroAtual = await oldState.guild.members.fetch(member.id);
        await membroAtual.setNickname(apelidoOriginal);
        console.log(
          `🔄 [${member.guild.name}] Apelido restaurado para: ${
            apelidoOriginal || membroAtual.user.username
          }`
        );
      } catch (err) {
        console.error(
          `❌ [${member.guild.name}] Erro ao restaurar apelido de ${member.user.username}:`,
          err.message
        );
      }

      dados.esperaLista = dados.esperaLista.filter((id) => id !== member.id);
      delete dados.apelidosOriginais[member.id];
      delete dados.timeouts[member.id];

      const canal = oldState.channel;
      if (canal && canal.members.size === 0) {
        dados.contador = 1;
        dados.esperaLista = [];
        dados.apelidosOriginais = {};
        console.log(
          `♻️ [${member.guild.name}] Canal vazio, lista e contador resetados!`
        );
      }
    }, 3 * 60 * 1000); // 3 minutos

    console.log(
      `⏳ [${member.guild.name}] Timeout iniciado para ${member.user.username} (5 min).`
    );
  }
});

client.login(process.env.DISCORD_TOKEN);
