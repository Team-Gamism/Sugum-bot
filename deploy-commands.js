require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const commands = [];
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`📡 ${commands.length}개의 슬래시 커맨드를 등록 중...`);

    // GUILD_ID가 있으면 특정 서버에만 등록 (즉시 반영), 없으면 전체 등록 (최대 1시간 소요)
    const route = process.env.GUILD_ID
      ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
      : Routes.applicationCommands(process.env.CLIENT_ID);

    await rest.put(route, { body: commands });

    console.log("✅ 슬래시 커맨드 등록 완료!");
    if (!process.env.GUILD_ID) {
      console.log("⚠️  전체 등록은 Discord 반영까지 최대 1시간이 걸릴 수 있습니다.");
    }
  } catch (error) {
    console.error("❌ 커맨드 등록 실패:", error);
    process.exit(1);
  }
})();
