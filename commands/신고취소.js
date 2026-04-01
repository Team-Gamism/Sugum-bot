const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { cancelFine, getFineById } = require("../database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("신고취소")
    .setDescription("벌금 기록을 취소합니다 (관리자 전용)")
    .addIntegerOption((option) =>
      option
        .setName("id")
        .setDescription("취소할 벌금 ID (/내역 또는 /검토에서 확인)")
        .setRequired(true)
        .setMinValue(1)
    ),

  adminOnly: true,

  async execute(interaction) {
    const id = interaction.options.getInteger("id");

    const fine = getFineById(id);

    if (!fine) {
      return interaction.reply({
        content: `❌ ID **#${id}**에 해당하는 벌금 기록이 없습니다.`,
        ephemeral: true,
      });
    }

    if (fine.status === "rejected") {
      return interaction.reply({
        content: `⚠️ 벌금 **#${id}**는 이미 취소된 상태입니다.`,
        ephemeral: true,
      });
    }

    cancelFine(id);

    const statusLabel = { auto: "자동 감지", pending: "신고 대기", approved: "신고 승인" };

    const embed = new EmbedBuilder()
      .setTitle("🗑️ 벌금 취소 완료")
      .setColor(0x95a5a6)
      .addFields(
        { name: "벌금 ID", value: `#${fine.id}`, inline: true },
        { name: "대상자", value: `<@${fine.user_id}> (${fine.username})`, inline: true },
        { name: "이전 상태", value: statusLabel[fine.status] ?? fine.status, inline: true },
        { name: "감지 내용", value: `\`${fine.word_used}\``, inline: true },
        { name: "금액", value: `~~${fine.amount.toLocaleString()}원~~`, inline: true },
        { name: "처리자", value: `<@${interaction.user.id}>`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: "💰 수금봇" });

    await interaction.reply({ embeds: [embed] });
  },
};
