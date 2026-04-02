const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { getAllUnpaidSummary } = require("../database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("목록")
    .setDescription("미납 벌금 전체 목록을 봅니다 (관리자 전용)")
    .setDefaultMemberPermissions(0),

  adminOnly: true,

  async execute(interaction) {
    const summary = getAllUnpaidSummary(interaction.guildId);

    if (summary.length === 0) {
      return interaction.reply({
        content: "✅ 미납 벌금이 없습니다!",
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("📋 미납 벌금 목록")
      .setColor(0xe74c3c)
      .setTimestamp()
      .setFooter({ text: "💰 수금봇" });

    let description = "";
    let rank = 1;
    let grandTotal = 0;

    for (const row of summary) {
      description += `**${rank}.** <@${row.user_id}> (${row.username})\n`;
      description += `　　${row.count}회 × 5,000원 = **${row.total.toLocaleString()}원**\n\n`;
      grandTotal += row.total;
      rank++;
    }

    embed.setDescription(description);
    embed.addFields({
      name: "💵 총 미납 금액",
      value: `**${grandTotal.toLocaleString()}원**`,
      inline: false,
    });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
