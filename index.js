const
    Discord = require('discord.js'),
    CentreImmo = require('./src/centre-immo.js'),
    Lbc = require('./src/lbc.js');

const
    bot = new Discord.Client(),
    services = [
        new Lbc(),
        new CentreImmo()
    ];

bot.on('ready', () => {

    const user = bot.users.find((user) => {
        return (`${user.username}#${user.discriminator}` === process.env.DISCORD_USER_ID);
    });

    user.send('ImmoBot ready');

    for(let service of services) {
        service.on('newAd', (ad) => {
            user.send(ad.url);
        });
    }
});

bot.login(process.env.DISCORD_TOKEN);
