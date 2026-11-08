import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { joinVoiceChannel, getVoiceConnection } from '@discordjs/voice';
import http from 'http';

const PORT = process.env.PORT || 3000;
const GUILD_ID = '1531628276156469348'; // A te szervered ID-je

// HTTP szerver a Rendernek, hogy ne aludjon el
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('A zenebot aktív és fut!\n');
}).listen(PORT, () => {
    console.log(`HTTP szerver fut a ${PORT}-es porton.`);
});

// A bot kliens inicializálása a szükséges jogosultságokkal (Intents + Voice State)
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates // Ez KELL ahhoz, hogy lássa a hangcsatornákat és csatlakozni tudjon!
    ]
});

client.once('ready', async () => {
    console.log(`Bejelentkezve mint ${client.user.tag}!`);

    // Regisztráljuk a /ping és a /join parancsokat
    const commands = [
        new SlashCommandBuilder()
            .setName('ping')
            .setDescription('Válaszol egy Pong!-gal!'),
        newSlashCommandWithChannel()
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('Parancsok regisztrálása a szerverre...');
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, GUILD_ID),
            { body: commands },
        );
        console.log('A parancsok sikeresen regisztrálva lettek!');
    } catch (error) {
        console.error('Hiba a regisztrációkor:', error);
    }
});

// Segédfüggvény a /join parancs felépítéséhez, amely megköveteli egy hangcsatorna kiválasztását
function newSlashCommandWithChannel() {
    return new SlashCommandBuilder()
        .setName('join')
        .setDescription('Csatlakozik ahhoz a hangcsatornához, amiben benne vagy!');
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // 1. /ping parancs kezelése
    if (interaction.commandName === 'ping') {
        await interaction.reply('Pong! 🏓');
    }

    // 2. /join parancs kezelése
    if (interaction.commandName === 'join') {
        // Megnézzük, hogy a felhasználó, aki írta a parancsot, benne van-e egyáltalán valamilyen hangcsatornában
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return await interaction.reply({ 
                content: '❌ Előbb be kell lépned egy hangcsatornába, hogy csatlakozni tudjak!', 
                ephemeral: true 
            });
        }

        try {
            // Csatlakozás a hangcsatornához
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });

            await interaction.reply(`🔊 Sikeresen csatlakoztam ide: **${voiceChannel.name}**!`);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ Hiba történt a hangcsatornához való csatlakozás közben.', ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
