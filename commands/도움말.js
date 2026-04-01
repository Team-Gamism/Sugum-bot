const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const ADMIN_ROLE_NAME = process.env.ADMIN_ROLE_NAME || "관리자";

const publicCommands = [
  { name: "/순위", desc: "미납 벌금 TOP 10 리더보드를 표시합니다." },
  {
    name: "신고 (메시지 우클릭 → 앱 → 신고)",
    desc: "메시지를 욕설로 신고합니다. 관리자 검토 후 벌금이 부과됩니다.",
  },
  { name: "/도움말", desc: "사용 가능한 커맨드 목록을 표시합니다." },
];

const adminCommands = [
  { name: "/목록", desc: "미납 벌금 전체 목록을 유저별로 요약해서 표시합니다." },
  {
    name: "/내역 @유저",
    desc: "특정 유저의 벌금 상세 내역을 최대 15건 표시합니다. `전체` 옵션으로 납부 내역도 확인 가능합니다.",
  },
  { name: "/납부 @유저", desc: "유저의 미납 벌금을 모두 납부 처리합니다." },
  { name: "/검토", desc: "대기 중인 신고 목록을 확인하고 승인/거절합니다." },
  { name: "/신고취소 [ID]", desc: "벌금 기록을 ID로 취소합니다." },
  { name: "/벌금설정 [금액]", desc: "욕설 1회당 벌금 금액을 변경합니다. (100 ~ 1,000,000원)" },
  { name: "/통계", desc: "전체 통계 및 욕설 TOP 10 랭킹을 표시합니다." },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("도움말")
    .setDescription("사용 가능한 커맨드 목록을 확인합니다"),

  adminOnly: false,

  async execute(interaction) {
    const member = interaction.member;
    const isAdmin =
      member.roles.cache.some((r) => r.name === ADMIN_ROLE_NAME) ||
      member.permissions.has("Administrator");

    const embed = new EmbedBuilder()
      .setTitle("📖 수금봇 커맨드 도움말")
      .setColor(0x3498db)
      .setTimestamp()
      .setFooter({ text: "💰 수금봇 | 욕하면 벌금" });

    const publicList = publicCommands
      .map((c) => `\`${c.name}\`\n↳ ${c.desc}`)
      .join("\n\n");

    embed.addFields({ name: "🌐 전체 공개", value: publicList, inline: false });

    if (isAdmin) {
      const adminList = adminCommands
        .map((c) => `\`${c.name}\`\n↳ ${c.desc}`)
        .join("\n\n");

      embed.addFields({ name: "🔒 관리자 전용", value: adminList, inline: false });
    } else {
      embed.addFields({
        name: "🔒 관리자 전용",
        value: `**${ADMIN_ROLE_NAME}** 역할이 있어야 사용할 수 있는 커맨드가 있습니다.`,
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
