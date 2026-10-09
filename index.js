require('dotenv').config({ path: `${__dirname}/.env` });

const { Client, Events, GatewayIntentBits } = require('discord.js');

const token = process.env.TOKEN;
if (!token) {
	console.error('Missing TOKEN in .env');
	process.exit(1);
}

const client = new Client({
	intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (readyClient) => {
	console.log(`Ready as ${readyClient.user.tag}`);
});

process.on('SIGTERM', () => {
	client.destroy();
});

client.login(token);
