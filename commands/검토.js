const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
} = require("discord.js");
const { getPendingReports } = require("../database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("검토")
    .setDescription("신고 접수된 항목을 검토합니다 (관리자 전용)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  adminOnly: true,

  async execute(interaction) {
    const reports = getPendingReports(interaction.guildId);

    if (reports.length === 0) {
      return interaction.reply({ content: "✅ 검토 대기 중인 신고가 없습니다.", flags: MessageFlags.Ephemeral });
    }

    await interaction.reply({
      content: `📋 검토 대기 중인 신고 **${reports.length}건**입니다.`,
      flags: MessageFlags.Ephemeral,
    });

    // 신고 항목을 하나씩 개별 메시지로 전송 (버튼 포함)
    for (const report of reports) {
      const date = report.created_at.slice(0, 16);
      const content = report.message_content || "(내용 없음)";

      const embed = new EmbedBuilder()
        .setTitle(`🔍 신고 #${report.id}`)
        .setColor(0xf39c12)
        .addFields(
          { name: "피신고자", value: `<@${report.user_id}> (${report.username})`, inline: true },
          { name: "신고자", value: `<@${report.reporter_id}>`, inline: true },
          { name: "접수 시각", value: date, inline: true },
          { name: "💬 메시지 내용", value: `> ${content.slice(0, 500)}`, inline: false },
          { name: "💸 확정 시 벌금", value: `**${report.amount.toLocaleString()}원**`, inline: true },
        )
        .setFooter({ text: "💰 수금봇" });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`report_approve_${report.id}`)
          .setLabel("✅ 승인 (벌금 확정)")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`report_reject_${report.id}`)
          .setLabel("❌ 기각 (벌금 취소)")
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.followUp({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
    }
  },
};
