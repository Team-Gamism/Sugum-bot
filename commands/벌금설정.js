const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getFineAmount, setSetting } = require("../database");

const MIN_AMOUNT = 100;
const MAX_AMOUNT = 1_000_000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("벌금설정")
    .setDescription("욕설 1회당 벌금 금액을 변경합니다 (관리자 전용)")
    .setDefaultMemberPermissions(0)
    .addIntegerOption((option) =>
      option
        .setName("금액")
        .setDescription(`벌금 금액 (${MIN_AMOUNT.toLocaleString()}원 ~ ${MAX_AMOUNT.toLocaleString()}원)`)
        .setRequired(true)
        .setMinValue(MIN_AMOUNT)
        .setMaxValue(MAX_AMOUNT)
    ),

  adminOnly: true,

  async execute(interaction) {
    const newAmount = interaction.options.getInteger("금액");
    const prevAmount = getFineAmount();

    setSetting("fine_amount", newAmount);

    const embed = new EmbedBuilder()
      .setTitle("⚙️ 벌금 금액 변경")
      .setColor(0x3498db)
      .addFields(
        {
          name: "이전 금액",
          value: `~~${prevAmount.toLocaleString()}원~~`,
          inline: true,
        },
        {
          name: "새 금액",
          value: `**${newAmount.toLocaleString()}원**`,
          inline: true,
        }
      )
      .setDescription("다음 욕설 감지부터 새 금액이 적용됩니다.")
      .addFields({
        name: "변경자",
        value: `<@${interaction.user.id}>`,
        inline: false,
      })
      .setTimestamp()
      .setFooter({ text: "💰 수금봇" });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
