import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';
import http from 'http';

const PORT = process.env.PORT || 10000;

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

const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'POST' && req.url === '/join-voice') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                console.log('📥 Beérkező kérés a Cloudflare-ről:', body);
                const data = JSON.parse(body);
                const { guildId, userId } = data;

                console.log('1️⃣ Próbálom lekérni a guildet...');
                const guild = await client.guilds.fetch(guildId).catch(err => {
                    console.log('❌ Hiba a guild fetch-elésekor:', err);
                    return null;
                });

                if (!guild) {
                    console.log('❌ Nem találtam a guildet!');
                    res.writeHead(404);
                    return res.end(JSON.stringify({ success: false }));
                }
                console.log('✅ Guild megvan:', guild.name);

                console.log('2️⃣ Próbálom lekérni a taget (felhasználót)...');
                const member = await guild.members.fetch(userId).catch(err => {
                    console.log('❌ Hiba a tag (member) fetch-elésekor (Server Members Intent hiányzik?):', err);
                    return null;
                });

                if (!member) {
                    console.log('❌ Nem találtam a taget a szerveren!');
                    res.writeHead(200);
                    return res.end(JSON.stringify({ success: false }));
                }
                console.log('✅ Tag megvan:', member.user.tag);

                const voiceChannel = member?.voice?.channel;
                if (!voiceChannel) {
                    console.log('❌ A felhasználó nincs hangcsatornában!');
                    res.writeHead(200);
                    return res.end(JSON.stringify({ success: false }));
                }
                console.log('✅ Hangcsatorna megvan:', voiceChannel.name);

                joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                });

                console.log('🎉 Sikeres hangcsatorna csatlakozás!');
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, channelName: voiceChannel.name }));

            } catch (err) {
                console.error('🔥 Kritikus hiba:', err);
                res.writeHead(500);
                return res.end(JSON.stringify({ success: false }));
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
