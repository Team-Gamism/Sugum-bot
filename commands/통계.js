const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { getStats, getAllCaughtUsers, getFineAmount } = require("../database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("통계")
    .setDescription("전체 벌금 통계를 봅니다 (관리자 전용)")
    .setDefaultMemberPermissions(0),

  adminOnly: true,

  async execute(interaction) {
    const stats = getStats(interaction.guildId);
    const caughtUsers = getAllCaughtUsers(interaction.guildId);

    const embed = new EmbedBuilder()
      .setTitle("📊 전체 벌금 통계")
      .setColor(0x3498db)
      .setTimestamp()
      .setFooter({ text: "💰 수금봇" });

    const fineAmount = getFineAmount(interaction.guildId);

    embed.addFields(
      {
        name: "⚙️ 현재 벌금",
        value: `**${fineAmount.toLocaleString()}원 / 회**`,
        inline: true,
      },
      {
        name: "📢 신고 접수",
        value: `**${stats.reported_count}건**`,
        inline: true,
      },
      { name: "\u200B", value: "\u200B", inline: true },
      {
        name: "🔢 총 적발 건수",
        value: `**${stats.total_count}건**`,
        inline: true,
      },
      {
        name: "👤 적발된 유저 수",
        value: `**${stats.unique_users}명**`,
        inline: true,
      },
      { name: "\u200B", value: "\u200B", inline: true },
      {
        name: "💵 총 벌금 금액",
        value: `**${(stats.total_amount || 0).toLocaleString()}원**`,
        inline: true,
      },
      {
        name: "❌ 미납 금액",
        value: `**${(stats.unpaid_amount || 0).toLocaleString()}원**`,
        inline: true,
      },
      {
        name: "✅ 납부 금액",
        value: `**${(stats.paid_amount || 0).toLocaleString()}원**`,
        inline: true,
      }
    );

    if (caughtUsers.length > 0) {
      const userList = caughtUsers
        .map((u, i) => {
          const unpaidMark = u.unpaid > 0 ? ` *(미납 ${u.unpaid.toLocaleString()}원)*` : "";
          return `**${i + 1}.** <@${u.user_id}> (${u.username}) — ${u.count}회 / ${u.total.toLocaleString()}원${unpaidMark}`;
        })
        .join("\n");
      embed.addFields({
        name: "👥 적발된 유저 목록",
        value: userList,
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
