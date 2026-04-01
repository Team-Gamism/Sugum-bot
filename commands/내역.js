const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getUserAllFines, getUserUnpaidFines } = require("../database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("내역")
    .setDescription("특정 유저의 벌금 내역을 봅니다 (관리자 전용)")
    .setDefaultMemberPermissions(0)
    .addUserOption((option) =>
      option.setName("유저").setDescription("조회할 유저").setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("전체")
        .setDescription("납부 완료 내역도 포함 (기본: 미납만)")
        .setRequired(false)
    ),

  adminOnly: true,

  async execute(interaction) {
    const target = interaction.options.getUser("유저");
    const showAll = interaction.options.getBoolean("전체") ?? false;

    const fines = showAll
      ? getUserAllFines(target.id)
      : getUserUnpaidFines(target.id);

    if (fines.length === 0) {
      return interaction.reply({
        content: showAll
          ? `✅ <@${target.id}>의 벌금 내역이 없습니다.`
          : `✅ <@${target.id}>의 미납 벌금이 없습니다.`,
        ephemeral: true,
      });
    }

    const totalUnpaid = fines
      .filter((f) => !f.paid)
      .reduce((sum, f) => sum + f.amount, 0);

    const embed = new EmbedBuilder()
      .setTitle(`📄 ${target.username}의 벌금 내역`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0xe67e22)
      .setTimestamp()
      .setFooter({ text: "💰 수금봇" });

    // 최근 15건만 표시 (임베드 글자 제한)
    const display = fines.slice(0, 15);
    let description = "";

    for (const fine of display) {
      const status = fine.paid ? "~~납부~~" : "**미납**";
      const date = fine.created_at.slice(0, 16);
      const source = fine.reporter_id ? ` 📢<@${fine.reporter_id}>신고` : "";
      const msgPreview = fine.message_content
        ? `> ${fine.message_content.slice(0, 80)}${fine.message_content.length > 80 ? "…" : ""}`
        : `> \`${fine.word_used}\``;
      description += `${status} ${fine.amount.toLocaleString()}원 (${date})${source}\n${msgPreview}\n\n`;
    }

    if (fines.length > 15) {
      description += `\n_…외 ${fines.length - 15}건_`;
    }

    embed.setDescription(description);

    if (totalUnpaid > 0) {
      embed.addFields({
        name: "💸 미납 합계",
        value: `**${totalUnpaid.toLocaleString()}원** (${fines.filter((f) => !f.paid).length}건)`,
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
