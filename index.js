const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const config = require('./config.json');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

client.once('ready', () => {
    console.log(`${client.user.tag} is online!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(config.prefix)) return;

    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'start') {
        // สร้าง embed โดยใช้ข้อความจาก config.json
        const embed = new EmbedBuilder()
            .setTitle(config.embed.title)
            .setDescription(config.embed.description)
            .setImage(config.embed.imageUrl)
            .setColor(config.embed.color);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('verify')
                    .setLabel(config.buttonLabel || 'เริ่มยืนยันตัวตน') // ใช้ label ปุ่มจาก config หรือข้อความเริ่มต้น
                    .setStyle(ButtonStyle.Primary)
            );

        await message.channel.send({ embeds: [embed], components: [row] });

        client.on('interactionCreate', async interaction => {
            if (!interaction.isButton()) return;

            if (interaction.customId === 'verify') {
                // สุ่มตัวเลข CAPTCHA ใหม่เมื่อกดปุ่ม
                const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
                
                // ดึงวันและเวลาปัจจุบัน
                const date = new Date();
                const formattedDate = date.toLocaleDateString('th-TH');
                const formattedTime = date.toLocaleTimeString('th-TH');
                
                // สร้าง Modal สำหรับกรอกข้อมูล CAPTCHA
                const modal = new ModalBuilder()
                    .setCustomId('captchaModal')
                    .setTitle(config.modalTitle || 'CAPTCHA SYSTEM ' + formattedDate + ' ' + formattedTime);

                const captchaInput = new TextInputBuilder()
                    .setCustomId('captchaInput')
                    .setLabel(`ใส่เลขนี้เพื่อยืนยันตัวตน: ${randomCode}`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const firstActionRow = new ActionRowBuilder().addComponents(captchaInput);
                modal.addComponents(firstActionRow);

                await interaction.showModal(modal);

                // รอการตอบจาก Modal
                client.on('interactionCreate', async interaction => {
                    if (interaction.type !== InteractionType.ModalSubmit) return;

                    if (interaction.customId === 'captchaModal') {
                        const userInput = interaction.fields.getTextInputValue('captchaInput');

                        // ตอบสนองทันทีเพื่อเลี่ยงข้อผิดพลาด
                        await interaction.deferReply({ ephemeral: true });

                        if (userInput === randomCode) {
                            await interaction.followUp({ content: config.successMessage || 'ยืนยันตัวตนสำเร็จ', ephemeral: true });

                            // ให้ยศตามที่กำหนด
                            const role = message.guild.roles.cache.find(r => r.name === config.roleOnSuccess);
                            if (role) {
                                const member = await message.guild.members.fetch(interaction.user.id);
                                await member.roles.add(role);
                            } else {
                                await interaction.followUp({ content: 'ไม่พบยศที่ต้องการ', ephemeral: true });
                            }
                        } else {
                            await interaction.followUp({ content: config.failureMessage || 'โค้ดไม่ถูกต้อง กรุณาลองอีกครั้ง.', ephemeral: true });
                        }
                    }
                });
            }
        });
    }
});

client.login(process.env.DISCORD_TOKEN);
