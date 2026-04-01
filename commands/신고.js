const {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const { addFine, findFineByMessageId, getFineAmount } = require("../database");

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName("신고")
    .setType(ApplicationCommandType.Message),

  adminOnly: false,

  async execute(interaction) {
    const reportedMessage = interaction.targetMessage;
    const target = reportedMessage.author;
    const reporter = interaction.user;

    if (target.id === reporter.id) {
      return interaction.reply({ content: "❌ 자신의 메시지는 신고할 수 없습니다.", flags: MessageFlags.Ephemeral });
    }
    if (target.bot) {
      return interaction.reply({ content: "❌ 봇의 메시지는 신고할 수 없습니다.", flags: MessageFlags.Ephemeral });
    }

    if (findFineByMessageId(reportedMessage.id)) {
      return interaction.reply({ content: "⚠️ 이 메시지는 이미 신고 또는 자동 감지된 상태입니다.", flags: MessageFlags.Ephemeral });
    }

    const fineAmount = getFineAmount();
    const content = reportedMessage.content || "(텍스트 없음)";

    // 메시지 내용 그대로 저장, 상태는 pending (관리자 검토 대기)
    addFine({
      userId: target.id,
      username: target.username,
      wordUsed: "[신고 접수]",
      messageContent: content,
      messageId: reportedMessage.id,
      amount: fineAmount,
      reporterId: reporter.id,
      status: "pending",
    });

    const embed = new EmbedBuilder()
      .setTitle("📢 신고 접수됨")
      .setColor(0xf39c12)
      .setDescription(
        `<@${reporter.id}>님이 <@${target.id}>님의 메시지를 신고했습니다.\n` +
          `관리자 검토 후 벌금이 확정됩니다.`
      )
      .addFields({
        name: "📄 신고된 메시지 내용",
        value: `> ${content.slice(0, 500)}`,
        inline: false,
      })
      .setTimestamp()
      .setFooter({ text: "💰 수금봇 | 허위 신고 시 책임은 신고자에게 있습니다" });

    await interaction.reply({ embeds: [embed] });
  },
};
