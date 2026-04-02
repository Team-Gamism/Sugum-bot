const { SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require("discord.js");
const { getFineAmount, getFalseReportThreshold, setSetting } = require("../database");

const MIN_AMOUNT = 100;
const MAX_AMOUNT = 1_000_000;
const MIN_THRESHOLD = 1;
const MAX_THRESHOLD = 20;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("벌금설정")
    .setDescription("벌금 관련 설정을 변경합니다 (관리자 전용)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption((option) =>
      option
        .setName("금액")
        .setDescription(`벌금 금액 (${MIN_AMOUNT.toLocaleString()}원 ~ ${MAX_AMOUNT.toLocaleString()}원)`)
        .setRequired(false)
        .setMinValue(MIN_AMOUNT)
        .setMaxValue(MAX_AMOUNT)
    )
    .addIntegerOption((option) =>
      option
        .setName("허위신고임계값")
        .setDescription(`허위 신고 몇 회마다 벌금 부과 (${MIN_THRESHOLD}~${MAX_THRESHOLD}, 기본: 3)`)
        .setRequired(false)
        .setMinValue(MIN_THRESHOLD)
        .setMaxValue(MAX_THRESHOLD)
    ),

  adminOnly: true,

  async execute(interaction) {
    const newAmount = interaction.options.getInteger("금액");
    const newThreshold = interaction.options.getInteger("허위신고임계값");

    if (newAmount === null && newThreshold === null) {
      return interaction.reply({
        content: "❌ `금액` 또는 `허위신고임계값` 중 하나 이상을 입력해주세요.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const fields = [];

    if (newAmount !== null) {
      const prevAmount = getFineAmount(interaction.guildId);
      setSetting(interaction.guildId, "fine_amount", newAmount);
      fields.push(
        { name: "💸 이전 벌금 금액", value: `~~${prevAmount.toLocaleString()}원~~`, inline: true },
        { name: "💸 새 벌금 금액", value: `**${newAmount.toLocaleString()}원**`, inline: true },
        { name: "\u200b", value: "\u200b", inline: false }
      );
    }

    if (newThreshold !== null) {
      const prevThreshold = getFalseReportThreshold(interaction.guildId);
      setSetting(interaction.guildId, "false_report_threshold", newThreshold);
      fields.push(
        { name: "⚠️ 이전 허위 신고 임계값", value: `~~${prevThreshold}회~~`, inline: true },
        { name: "⚠️ 새 허위 신고 임계값", value: `**${newThreshold}회마다 벌금**`, inline: true }
      );
    }

    fields.push({ name: "변경자", value: `<@${interaction.user.id}>`, inline: false });

    const embed = new EmbedBuilder()
      .setTitle("⚙️ 설정 변경")
      .setColor(0x3498db)
      .addFields(...fields)
      .setTimestamp()
      .setFooter({ text: "💰 수금봇" });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
