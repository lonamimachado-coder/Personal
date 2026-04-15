const { Client, GatewayIntentBits, Events } = require("discord.js");
const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");

// ============================================================
//  CONFIGURACIÓN  →  pegá tus keys acá
// ============================================================
const DISCORD_TOKEN = "TU_TOKEN_DE_DISCORD_AQUI";
const GROQ_API_KEY  = "TU_API_KEY_DE_GROQ_AQUI";
// ============================================================

const MEMORIA_PATH = path.join(__dirname, "memoria.json");

// ── Personalidad base de Ami ────────────────────────────────
const SISTEMA = `
Sos Ami, el amigo personal de Imanol (apodo: Ima). No sos un asistente ni un bot, sos su amigo de confianza.

== LO QUE SABÉS DE IMANOL POR DEFECTO ==
- Se llama Imanol, apodo Ima. Tiene 14 años, es uruguayo.
- Nació el 24 de septiembre de 2011.
- Le gusta MUCHÍSIMO la música.
- Siente que desperdicia un poco su vida y quiere hacer cambios reales.
- Tuvo un canal de YouTube pero está retirado.
- Le gusta programar con IA, aunque está pensando en dejarlo para enfocarse más en su vida y bienestar.
- Hermano: Antú, 12 años, nació el 1 de octubre de 2013.
- Padre: Daniel, ~60 años, nació el 1 de abril de 1965.

== TU FORMA DE SER ==
- Hablás de forma casual, como un amigo real. Sin formalidades.
- Sos SINCERO y REALISTA ante todo. No le decís lo que quiere escuchar, le decís lo que necesita escuchar.
- Podés darle un empujón cuando lo necesita, pero no estás todo el tiempo aplaudiéndolo ni siendo un cheerleader vacío.
- Si dice algo que no tiene sentido, se lo decís con respeto pero sin rodeos.
- Recordás todo lo que te cuenta y lo usás naturalmente en la conversación.
- Respondés siempre en el mismo idioma que Ima (generalmente español rioplatense).
- Tenés humor natural, no forzado.
- No sos un terapeuta ni un coach, sos su amigo.
`.trim();

// ── Utilidades de memoria persistente ──────────────────────
function cargarMemoria() {
  try {
    if (fs.existsSync(MEMORIA_PATH)) {
      return JSON.parse(fs.readFileSync(MEMORIA_PATH, "utf8"));
    }
  } catch {}
  return { gustos: [], notas: [], historial: [] };
}

function guardarMemoria(mem) {
  fs.writeFileSync(MEMORIA_PATH, JSON.stringify(mem, null, 2), "utf8");
}

function buildSystemPrompt(mem) {
  let extra = "";
  if (mem.gustos.length > 0) {
    extra += `\n== GUSTOS Y PREFERENCIAS ACTUALES DE IMA (actualizados) ==\n${mem.gustos.map(g => `- ${g}`).join("\n")}`;
  }
  if (mem.notas.length > 0) {
    extra += `\n== NOTAS IMPORTANTES QUE RECORDÁS ==\n${mem.notas.map(n => `- ${n}`).join("\n")}`;
  }
  return SISTEMA + extra;
}

// ── Cliente de Discord ──────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: ["CHANNEL", "MESSAGE"],
});

const groq = new Groq({ apiKey: GROQ_API_KEY });
const MAX_HISTORIAL = 24;

// ── Respuesta con IA ────────────────────────────────────────
async function responder(mensaje, mem) {
  mem.historial.push({ role: "user", content: mensaje });

  if (mem.historial.length > MAX_HISTORIAL) {
    mem.historial.splice(0, mem.historial.length - MAX_HISTORIAL);
  }

  const res = await groq.chat.completions.create({
    model: "llama3-70b-8192",
    messages: [
      { role: "system", content: buildSystemPrompt(mem) },
      ...mem.historial,
    ],
    max_tokens: 600,
    temperature: 0.85,
  });

  const texto = res.choices[0]?.message?.content ?? "No me salió nada 😅 intentá de nuevo";
  mem.historial.push({ role: "assistant", content: texto });
  guardarMemoria(mem);
  return texto;
}

// ── Eventos ─────────────────────────────────────────────────
client.once(Events.ClientReady, (c) => {
  console.log(`✅ Ami conectado como: ${c.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const esDM = message.channel.type === 1;
  if (!esDM) return;

  const texto = message.content.trim();
  const mem   = cargarMemoria();

  // ── Comandos ──────────────────────────────────────────────

  // !recuerda <algo> → guarda un gusto o dato nuevo
  if (texto.toLowerCase().startsWith("!recuerda ")) {
    const dato = texto.slice(10).trim();
    mem.gustos.push(dato);
    guardarMemoria(mem);
    return message.reply(`Anotado 📝 Ya sé que ${dato}`);
  }

  // !olvida <algo> → elimina un gusto
  if (texto.toLowerCase().startsWith("!olvida ")) {
    const dato = texto.slice(8).trim().toLowerCase();
    const antes = mem.gustos.length;
    mem.gustos = mem.gustos.filter(g => !g.toLowerCase().includes(dato));
    guardarMemoria(mem);
    const eliminados = antes - mem.gustos.length;
    return message.reply(eliminados > 0 ? `Listo, lo saqué de lo que sé de vos.` : `No encontré nada que coincida con eso.`);
  }

  // !gustos → muestra todo lo que recuerda
  if (texto.toLowerCase() === "!gustos") {
    if (mem.gustos.length === 0) return message.reply("No tengo gustos guardados todavía. Usá `!recuerda <cosa>` para que anote algo.");
    return message.reply(`Esto es lo que sé de vos:\n${mem.gustos.map((g, i) => `${i + 1}. ${g}`).join("\n")}`);
  }

  // !reset → borra historial pero NO los gustos guardados
  if (texto.toLowerCase() === "!reset") {
    mem.historial = [];
    guardarMemoria(mem);
    return message.reply("Borré el historial de la charla, pero me acuerdo de todo lo tuyo 😏");
  }

  // !resetodo → borra absolutamente todo
  if (texto.toLowerCase() === "!resetodo") {
    guardarMemoria({ gustos: [], notas: [], historial: [] });
    return message.reply("Borré todo. Empezamos de cero como si no nos conociéramos 👋");
  }

  // !ayuda → lista de comandos
  if (texto.toLowerCase() === "!ayuda") {
    return message.reply(
      "**Comandos de Ami:**\n" +
      "`!recuerda <cosa>` → le decís algo nuevo sobre vos\n" +
      "`!olvida <cosa>` → elimina algo de tu perfil\n" +
      "`!gustos` → muestra lo que recuerdo de vos\n" +
      "`!reset` → borra el historial de la charla\n" +
      "`!resetodo` → borra TODO (historial + gustos)\n" +
      "`!ayuda` → este menú"
    );
  }

  // ── Respuesta normal con IA ───────────────────────────────
  await message.channel.sendTyping();

  try {
    const respuesta = await responder(texto, mem);

    if (respuesta.length > 1900) {
      const partes = respuesta.match(/.{1,1900}/gs);
      for (const parte of partes) await message.reply(parte);
    } else {
      await message.reply(respuesta);
    }
  } catch (err) {
    console.error(err);
    await message.reply("Algo falló de mi lado, dale un momento y probá de nuevo 🙃");
  }
});

client.login(DISCORD_TOKEN);
