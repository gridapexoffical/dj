import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';
import http from 'http';

const PORT = process.env.PORT || 10000;

// A Discord kliens inicializálása a szükséges intentekkel
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers
    ]
});

let isReady = false;

client.once('ready', () => {
    isReady = true;
    console.log(`Bejelentkezve mint ${client.user.tag}! A bot készen áll.`);
});

client.login(process.env.DISCORD_TOKEN);

// HTTP szerver a Cloudflare Worker kéréseinek és a Render életben tartásához
const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'POST' && req.url === '/join-voice') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                console.log('📥 Beérkező kérés a Cloudflare-ről:', body);

                let attempts = 0;
                while (!isReady && attempts < 10) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    attempts++;
                }

                if (!isReady) {
                    console.log('❌ Hiba: A bot nem készült el időben.');
                    res.writeHead(503);
                    return res.end(JSON.stringify({ success: false, error: 'A bot még töltődik' }));
                }

                const data = JSON.parse(body);
                const { guildId, userId } = data;

                console.log(`🔍 Guild keresése: ${guildId}`);
                const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(err => {
                    console.error('🔥 Hiba a guild fetch közben:', err);
                    return null;
                });

                if (!guild) {
                    console.log('❌ Hiba: A bot nincs ezen a szerveren vagy nem érhető el:', guildId);
                    res.writeHead(404);
                    return res.end(JSON.stringify({ success: false, error: 'A bot nincs ezen a szerveren' }));
                }

                console.log(`🔍 Tag keresése: ${userId}`);
                const member = await guild.members.fetch(userId).catch(err => {
                    console.error('🔥 Hiba a member fetch közben (lehet hiányzik a Server Members Intent!):', err);
                    return null;
                });

                const voiceChannel = member?.voice?.channel;

                if (!voiceChannel) {
                    console.log('❌ Hiba: A felhasználó nincs hangcsatornában, vagy a bot nem látja a hangstátuszt!');
                    res.writeHead(200);
                    return res.end(JSON.stringify({ success: false, error: 'A felhasználó nincs hangcsatornában' }));
                }

                console.log(`🔊 Csatlakozás a csatornához: ${voiceChannel.name} (${voiceChannel.id})`);
                joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                });

                console.log(`✅ Sikeres csatlakozás!`);
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, channelName: voiceChannel.name }));
            } catch (err) {
                console.error('🔥 Részletes hiba a /join-voice végponton:', err);
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
