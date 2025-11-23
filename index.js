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
  .map((id) => id.trim())
  .filter((id) => id.length > 0);

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
    // Cancela timeout pendente (voltou a tempo)
    if (dados.timeouts[member.id]) {
      clearTimeout(dados.timeouts[member.id]);
      delete dados.timeouts[member.id];
      console.log(
        `⏳ [${member.guild.name}] Timeout cancelado para ${member.user.username}, voltou à espera.`
      );
    }

    if (dados.esperaLista.includes(member.id)) return;

    // Salva apelido original (null restaura ao username)
    dados.apelidosOriginais[member.id] = member.nickname ?? null;

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
        `❌ [${member.guild.name}] Erro ao alterar apelido de ${member.user.username}: ${err.message}`
      );
    }

    dados.esperaLista.push(member.id);
    dados.contador++;
  }

  if (saiuDaEspera) {
    const DURACAO_MS = 3 * 60 * 1000; // 3 minutos
    console.log(
      `⏳ [${member.guild.name}] Timeout iniciado para ${member.user.username} (3 min).`
    );

    const apelidoOriginal = dados.apelidosOriginais[member.id] ?? null;

    // Captura IDs para usar dentro do timeout
    const membroId = member.id;

    dados.timeouts[membroId] = setTimeout(async () => {
      try {
        const guild =
          client.guilds.cache.get(guildId) ||
          (await client.guilds.fetch(guildId));
        const membroAtual = await guild.members.fetch(membroId);

        await membroAtual.setNickname(apelidoOriginal); // null restaura
        console.log(
          `🔄 [${guild.name}] Apelido restaurado para: ${
            apelidoOriginal ?? membroAtual.user.username
          }`
        );
      } catch (err) {
        console.error(
          `❌ [${member.guild?.name || guildId}] Erro ao restaurar apelido de ${
            member.user.username
          }: ${err.message}`
        );
      } finally {
        // Limpeza
        dados.esperaLista = dados.esperaLista.filter((id) => id !== membroId);
        delete dados.apelidosOriginais[membroId];
        delete dados.timeouts[membroId];

        // Reset se o canal antigo ficou vazio (protege contra null)
        const canalAntigo = oldState.channel;
        if (canalAntigo && canalAntigo.members.size === 0) {
          dados.contador = 1;
          dados.esperaLista = [];
          dados.apelidosOriginais = {};
          console.log(
            `♻️ [${member.guild.name}] Canal vazio, lista e contador resetados!`
          );
        }
      }
    }, DURACAO_MS);
  }
});

client.login(process.env.DISCORD_TOKEN);
