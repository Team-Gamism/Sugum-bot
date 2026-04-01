require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Collection,
  EmbedBuilder,
  Events,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const { detectProfanity } = require("./profanityList");
const { addFine, getFineAmount, approveReport, rejectReport } = require("./database");

const ADMIN_ROLE_NAME = process.env.ADMIN_ROLE_NAME || "관리자";

// ── 클라이언트 설정 ──────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ── 슬래시 커맨드 로드 ───────────────────────────────────────────────────────
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
  console.log(`📌 커맨드 로드: /${command.data.name}`);
}

// ── 봇 준비 ─────────────────────────────────────────────────────────────────
client.once(Events.ClientReady, (c) => {
  const fineAmount = getFineAmount();
  console.log(`✅ 봇 로그인: ${c.user.tag}`);
  console.log(`📡 ${c.guilds.cache.size}개 서버에 연결됨`);
  console.log(`💰 현재 벌금: ${fineAmount.toLocaleString()}원`);
  c.user.setActivity("욕설 감시 중 👀", { type: 3 }); // WATCHING
});

// ── 메시지 감지 (욕설 탐지) ──────────────────────────────────────────────────
client.on(Events.MessageCreate, async (message) => {
  // 봇 메시지, DM 무시
  if (message.author.bot || !message.guild) return;

  const { detected, words } = detectProfanity(message.content);
  if (!detected) return;

  const userId = message.author.id;
  const username = message.author.username;
  const fineAmount = getFineAmount(); // 실시간으로 DB에서 읽어 최신 금액 반영

  for (const word of words) {
    addFine({ userId, username, wordUsed: word, amount: fineAmount, messageContent: message.content });
  }

  const totalFine = words.length * fineAmount;

  const embed = new EmbedBuilder()
    .setTitle("🚨 욕설 감지!")
    .setColor(0xe74c3c)
    .setDescription(
      `<@${userId}>님, 욕설을 사용하셨습니다.\n` +
        `**${fineAmount.toLocaleString()}원**이 벌금으로 부과됩니다!`
    )
    .addFields(
      {
        name: "🤬 감지된 욕설",
        value: words.map((w) => `\`${w}\``).join(", "),
        inline: true,
      },
      {
        name: "💸 이번 벌금",
        value: `**${totalFine.toLocaleString()}원**`,
        inline: true,
      }
    )
    .setFooter({ text: `욕설 1회 = ${fineAmount.toLocaleString()}원 | /순위 로 현황 확인` })
    .setTimestamp();

  try {
    await message.reply({ embeds: [embed] });
  } catch {
    await message.channel.send({ embeds: [embed] });
  }
});

// ── 버튼 처리 (신고 승인/기각) ───────────────────────────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const [, action, id] = interaction.customId.split("_"); // report_approve_123
  if (action !== "approve" && action !== "reject") return;

  // 관리자 권한 확인
  const member = interaction.member;
  const isAdmin =
    member.roles.cache.some((r) => r.name === ADMIN_ROLE_NAME) ||
    member.permissions.has("Administrator");

  if (!isAdmin) {
    return interaction.reply({ content: "❌ 관리자만 처리할 수 있습니다.", ephemeral: true });
  }

  if (action === "approve") {
    const changed = approveReport(Number(id));
    if (!changed) {
      return interaction.update({ content: `⚠️ 신고 #${id}는 이미 처리되었습니다.`, components: [], embeds: [] });
    }
    await interaction.update({
      content: `✅ 신고 #${id} **승인** — 벌금이 확정되었습니다.`,
      components: [],
      embeds: [],
    });
  } else {
    const changed = rejectReport(Number(id));
    if (!changed) {
      return interaction.update({ content: `⚠️ 신고 #${id}는 이미 처리되었습니다.`, components: [], embeds: [] });
    }
    await interaction.update({
      content: `❌ 신고 #${id} **기각** — 벌금이 취소되었습니다.`,
      components: [],
      embeds: [],
    });
  }
});

// ── 슬래시 커맨드 처리 ───────────────────────────────────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isMessageContextMenuCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  // 관리자 전용 커맨드 권한 확인
  if (command.adminOnly) {
    const member = interaction.member;
    const hasAdminRole = member.roles.cache.some(
      (role) => role.name === ADMIN_ROLE_NAME
    );
    const isServerAdmin = member.permissions.has("Administrator");

    if (!hasAdminRole && !isServerAdmin) {
      return interaction.reply({
        content: `❌ 이 커맨드는 **${ADMIN_ROLE_NAME}** 역할이 필요합니다.`,
        ephemeral: true,
      });
    }
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`❌ /${interaction.commandName} 오류:`, error);
    const errorMsg = { content: "❌ 커맨드 실행 중 오류가 발생했습니다.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMsg);
    } else {
      await interaction.reply(errorMsg);
    }
  }
});

// ── 봇 시작 ─────────────────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error("❌ 봇 로그인 실패:", err.message);
  process.exit(1);
});
