import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';
import http from 'http';

const PORT = process.env.PORT || 3000;

// HTTP szerver a Cloudflare Worker kéréseinek és a Render életben tartásához
const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'POST' && req.url === '/join-voice') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const { guildId, userId } = data;

                const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
                if (!guild) {
                    res.writeHead(404);
                    return res.end(JSON.stringify({ success: false, error: 'A bot nincs ezen a szerveren' }));
                }

                // Lekérdjük a tagot közvetlenül a Discord API-ból, hogy biztosan lássuk a hangstátuszát
                const member = await guild.members.fetch(userId).catch(() => null);
                const voiceChannel = member?.voice?.channel;

                if (!voiceChannel) {
                    res.writeHead(200);
                    return res.end(JSON.stringify({ success: false, error: 'A felhasználó nincs hangcsatornában' }));
                }

                // Csatlakozás a hangcsatornához
                joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                });

                res.writeHead(200);
                res.end(JSON.stringify({ success: true, channelName: voiceChannel.name }));
            } catch (err) {
                console.error('Hiba a /join-voice végponton:', err);
                res.writeHead(500);
                res.end(JSON.stringify({ success: false, error: 'Szerverhiba' }));
            }
        });
    } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('A Render háttérbot aktív!\n');
    }
});

server.listen(PORT, () => {
    console.log(`HTTP szerver fut a ${PORT}-es porton.`);
});

// A Discord kliens inicializálása a szükséges intentekkel
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.once('ready', () => {
    console.log(`Bejelentkezve mint ${client.user.tag}!`);
});

client.login(process.env.DISCORD_TOKEN);
