const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');
const http = require('http');

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('A Discord zenebot aktiv es fut!\n');
}).listen(PORT, () => {
    console.log(`HTTP szerver fut a ${PORT}-es porton.`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages
    ]
});

client.once('ready', async () => {
    console.log(`Bejelentkezve mint ${client.user.tag}!`);

    // Slash parancs regisztrálása globálisan
    const commands = [
        new SlashCommandBuilder()
            .setName('start')
            .setDescription('Elindítja a zenelejátszást a hangcsatornádban!')
            .addStringOption(option =>
                option.setName('url')
                    .setDescription('A lejátszandó YouTube videó linkje')
                    .setRequired(true))
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('Slash parancsok frissítése...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('Slash parancsok sikeresen regisztrálva!');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'start') {
        const url = interaction.options.getString('url');
        const channel = interaction.member.voice.channel;

        if (!channel) {
            return interaction.reply({ content: 'Előbb be kell lépned egy hangcsatornába!', ephemeral: true });
        }

        await interaction.deferReply();

        try {
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });

            const player = createAudioPlayer();
            connection.subscribe(player);

            const stream = await play.stream(url);
            const resource = createAudioResource(stream.stream, { inputType: stream.type });

            player.play(resource);

            player.on(AudioPlayerStatus.Playing, () => {
                interaction.editReply(`Zene elindítva: ${url}`);
            });

            player.on('error', error => {
                console.error('Hiba a lejátszóban:', error);
                interaction.editReply('Hiba történt a zene lejátszása közben.');
            });

        } catch (error) {
            console.error(error);
            interaction.editReply('Nem sikerült betölteni a zenét.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
