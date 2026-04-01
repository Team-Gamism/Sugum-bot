const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getAllUnpaidSummary } = require("../database");

const MEDALS = ["🥇", "🥈", "🥉"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("순위")
    .setDescription("미납 벌금 순위 (리더보드)를 봅니다"),

  adminOnly: false,

  async execute(interaction) {
    const summary = getAllUnpaidSummary();

    if (summary.length === 0) {
      return interaction.reply({
        content: "✅ 현재 미납 벌금이 없습니다. 모두 깨끗하네요!",
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("🏆 욕설 벌금 리더보드")
      .setDescription("많이 욕할수록 더 많이 냅니다 👀")
      .setColor(0x9b59b6)
      .setTimestamp()
      .setFooter({ text: "💰 수금봇 | 욕하면 5,000원" });

    let board = "";
    let rank = 1;

    for (const row of summary.slice(0, 10)) {
      const medal = MEDALS[rank - 1] || `**${rank}.**`;
      board += `${medal} <@${row.user_id}> — **${row.total.toLocaleString()}원** (${row.count}회)\n`;
      rank++;
    }

    embed.setDescription(`**미납 벌금 TOP ${Math.min(summary.length, 10)}**\n\n${board}`);

    await interaction.reply({ embeds: [embed] });
  },
};
