const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { markUserPaid, getUserUnpaidFines } = require("../database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("납부")
    .setDescription("유저의 미납 벌금을 납부 처리합니다 (관리자 전용)")
    .addUserOption((option) =>
      option.setName("유저").setDescription("납부 처리할 유저").setRequired(true)
    ),

  adminOnly: true,

  async execute(interaction) {
    const target = interaction.options.getUser("유저");

    // 납부 처리 전 금액 확인
    const unpaidFines = getUserUnpaidFines(target.id);
    if (unpaidFines.length === 0) {
      return interaction.reply({
        content: `✅ <@${target.id}>는 미납 벌금이 없습니다.`,
        ephemeral: true,
      });
    }

    const totalAmount = unpaidFines.reduce((sum, f) => sum + f.amount, 0);
    const count = unpaidFines.length;

    const changed = markUserPaid(target.id);

    const embed = new EmbedBuilder()
      .setTitle("✅ 납부 처리 완료")
      .setColor(0x2ecc71)
      .setDescription(
        `<@${target.id}> (${target.username})의 미납 벌금 **${count}건 / ${totalAmount.toLocaleString()}원**을 납부 처리했습니다.`
      )
      .addFields({
        name: "처리자",
        value: `<@${interaction.user.id}>`,
        inline: true,
      })
      .setTimestamp()
      .setFooter({ text: "💰 수금봇" });

    await interaction.reply({ embeds: [embed] });
  },
};
