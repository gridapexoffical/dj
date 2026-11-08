import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';
import http from 'http';

const PORT = process.env.PORT || 3000;

// HTTP szerver, ami egyrészt életben tartja a Rendert, másrészt fogadja a Cloudflare kérését a csatlakozáshoz
const server = http.createServer(async (req, res) => {
    // CORS és JSON beállítások
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'POST' && req.url === '/join-voice') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const { guildId, channelId } = data;

                const guild = client.guilds.cache.get(guildId);
                if (!guild) {
                    res.writeHead(404);
                    return res.end(JSON.stringify({ success: false, error: 'A bot nincs ezen a szerveren' }));
                }

                // Csatlakozás a hangcsatornához a bot segítségével
                joinVoiceChannel({
                    channelId: channelId,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                });

                res.writeHead(200);
                res.end(JSON.stringify({ success: true, message: 'Sikeres csatlakozás!' }));
            } catch (err) {
                console.error(err);
                res.writeHead(500);
                res.end(JSON.stringify({ success: false, error: 'Szerverhiba a csatlakozáskor' }));
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

// A Discord kliens inicializálása
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
