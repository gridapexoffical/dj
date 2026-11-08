if (req.method === 'POST' && req.url === '/join-voice') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const { guildId, userId } = data; // Mostantól a userId-t küldjük

                const guild = client.guilds.cache.get(guildId);
                if (!guild) {
                    res.writeHead(404);
                    return res.end(JSON.stringify({ success: false, error: 'A bot nincs ezen a szerveren' }));
                }

                // Megkeressük a felhasználót a szerver hangcsatornáiban
                const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
                const voiceChannel = member?.voice?.channel;

                if (!voiceChannel) {
                    res.writeHead(400);
                    return res.end(JSON.stringify({ success: false, error: 'A felhasználó nincs hangcsatornában' }));
                }

                // Csatlakozás
                joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                });

                res.writeHead(200);
                res.end(JSON.stringify({ success: true, channelName: voiceChannel.name }));
            } catch (err) {
                console.error(err);
                res.writeHead(500);
                res.end(JSON.stringify({ success: false, error: 'Szerverhiba' }));
            }
        });
    }
