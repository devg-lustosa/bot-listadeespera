require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

let contador = 1;
let esperaLista = [];
let apelidosOriginais = {};

const ESPERA_CHANNEL_ID = process.env.ESPERA_CHANNEL_ID;

client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  const member = newState.member || oldState.member;
  if (!member || !member.user) return;

  console.log(`🎧 Movimento detectado: ${member.user.username}`);

  const entrouNaEspera = newState.channelId === ESPERA_CHANNEL_ID;
  const saiuDaEspera =
    oldState.channelId === ESPERA_CHANNEL_ID &&
    newState.channelId !== ESPERA_CHANNEL_ID;

  if (entrouNaEspera) {
    if (esperaLista.includes(member.id)) return;

    // Salva apelido original
    apelidosOriginais[member.id] = member.nickname || null;

    const apelidoNovo = `E-${String(contador).padStart(2, "0")} ${
      member.user.username
    }`;
    try {
      await member.setNickname(apelidoNovo);
      console.log(`✅ Apelido alterado para: ${apelidoNovo}`);
    } catch (err) {
      console.error(
        `❌ Erro ao alterar apelido de ${member.user.username}:`,
        err.message
      );
    }

    esperaLista.push(member.id);
    contador++;
  }

  if (saiuDaEspera) {
    esperaLista = esperaLista.filter((id) => id !== member.id);

    const apelidoOriginal = apelidosOriginais[member.id];
    try {
      await member.setNickname(apelidoOriginal);
      console.log(
        `🔄 Apelido restaurado para: ${apelidoOriginal || member.user.username}`
      );
    } catch (err) {
      console.error(
        `❌ Erro ao restaurar apelido de ${member.user.username}:`,
        err.message
      );
    }

    delete apelidosOriginais[member.id];
  }
});

client.login(process.env.DISCORD_TOKEN);
