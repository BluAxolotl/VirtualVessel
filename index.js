const print = console.log
const token = process.env["token"]

const gsheetdb = require('gsheetdb')

const Discord = require('discord.js')
const client = new Discord.Client()

const guild_id = "905828821519958017"
const sine_guild_id = "717086427581775893"
var main_guild = null
const override = ['MANAGE_CHANNELS']

const prefixes = [
	'.virt',
	'.vv',
	'.VirtualVessel'
]

var ChannelDB = new gsheetdb({
  spreadsheetId: '1ptMOslf7OXPmLsx0cFSHWl6CENJ_P5uorphfORH1XdU', // replace with spreadsheet id (from URL)
  sheetName: 'Channels',   // replace with sheet name
  credentialsJSON: require('./credentials.json') // replace with JSON formatted credentials
})

var MemberDB = new gsheetdb({
  spreadsheetId: '1ptMOslf7OXPmLsx0cFSHWl6CENJ_P5uorphfORH1XdU', // replace with spreadsheet id (from URL)
  sheetName: 'Members',   // replace with sheet name
  credentialsJSON: require('./credentials.json') // replace with JSON formatted credentials
})

MemberDB.get = function(value) {
	return new Promise(async (res, rej) => {
		var data = await this.getData()
		if (data.length > 0) {
			var found = data.find(i => i.values[0] == value)
			if (found != null) {
				res(found.values[1])
			} else {
				res(null)
			}
		} else {
			res(null)
		}
	})
}

ChannelDB.get = function(index, value) {
	return new Promise(async (res, rej) => {
		try {
			var data = await this.getData()
			if (data.length > 0) {
				var found = data.find(i => {
					return (i.values[index] == value)
				})
				if (found != null) {
					res({
						owner_id: found.values[0],
						sinecraft_id: found.values[1],
						wasteland_id: found.values[2]
					})	
				} else {
					res(null)
				}
			} else {
				res(null)
			}
		} catch (err) {
			print(err)
		}
	})
}

client.on('ready', async () => {
	print("Initialized....")
	main_guild = await client.guilds.fetch(guild_id)
})

client.on('message', async msg => {
	var args = msg.content.split(' ')
	var prefix = args.shift()
	if (msg.author.id != client.user.id) {
		switch (msg.channel.type) {
			case 'dm': command(prefix, args, msg); break;
			case 'text': sync_or_swim(prefix, args, msg); break;
		}
	}
})

async function command(prefix, args, msg) {
	if (prefixes.includes(prefix)) {
		var command = args.shift()
		switch (command) {
			case 'new':
				var data = await MemberDB.get(msg.author.id)
				if (data == null) {
					var category_name = args.join(" ")
					var member = await main_guild.members.fetch(msg.author.id)

					var category = await main_guild.channels.create(category_name, {type: 'category'})
					var general = await main_guild.channels.create(`general`, {type: 'text', parent: category.id})

					category.overwritePermissions([{id: msg.author.id, allow: override}], `Automatic channel for ${msg.author.username}`)
					print(`+ ${(member.nickname || msg.author.username)} made a category titled '${category.name}'`)
					await MemberDB.insertRows([[msg.author.id, category.id]])
					msg.channel.send(`Your new category is here: <#${general.id}>`)
				} else {
					msg.channel.send("Either there's been an error, or your category quota is filled...")
				}
			break;
			case 'allow':
				print("wip....")
				msg.channel.send("I ain't add this yet....")
			break;
		}
	}
}

async function sync_or_swim(prefix, args, msg) {
	if (prefixes.includes(prefix)) {
		switch (msg.guild.id) {
			case "717086427581775893":
				var command = args.shift()
				switch (command) {
					case 'sync':
						if (msg.channel.permissionsFor(msg.author).has("MANAGE_MESSAGES")) {
							var data = await MemberDB.get(msg.author.id)
							if (data != null) {
								var category = await client.channels.fetch(data)
								var sinecraft = await category.guild.channels.create(`sinecraft`, {type: 'text', parent: category.id})
								ChannelDB.insertRows([[msg.author.id, msg.channel.id, sinecraft.id]])
								var del_msg = await msg.channel.send("Linked.... I think....")
								setTimeout(function () {del_msg.delete()}, 5000)
							} else {
								var del_msg = await msg.channel.send("bruh you don't got a channel in the server, sob")
								setTimeout(function () {del_msg.delete()}, 5000)
							}
						} else {
							var del_msg = await msg.channel.send("no you can't do that, wtf is wrong with you???")
							setTimeout(function () {del_msg.delete()}, 5000)
						}
					break;
				}
			break;
		}
	} else {
		var data = null
		var convert_info = null
		if (msg.guild.id == guild_id) {
			convert_info = {
				index: 2,
				guild_name: "sinecraft",
				fancy_guild_name: "Sinecraft"
			}
		} else if (msg.guild.id == sine_guild_id) {
			convert_info = {
				index: 1,
				guild_name: "wasteland",
				fancy_guild_name: "LogWasteland"
			}
		}
		if (convert_info != null) {
			data = await ChannelDB.get(convert_info.index, msg.channel.id)
		}
		if (msg.webhookID != null) {
			var pre_hook = await msg.fetchWebhook()
			if (pre_hook.owner.id == "905828274901487628") {
				data = null
			}
		}
		if (data != null) {
			var hook = await fetch_hooks(data[`${convert_info.guild_name}_id`])
			if (hook == null) {
				var sine_channel = await client.channels.fetch(data[`${convert_info.guild_name}_id`])
				hook = await sine_channel.createWebhook(`${convert_info.fancy_guild_name}Sync`)
			}
			var msg_files = msg.attachments.map(i => {
				return {
					attachment: i.url,
					name: i.name
				}
			})
			var msg_embeds = msg.embeds.map(i => {
				print((i.description || "sync"))
				return {
					title: i.title,
					type: i.type,
					description: (i.description || "sync"),
					url: i.url,
					color: i.color,
					timestamp: i.timestamp,
					footer: JSON.parse(JSON.stringify(i.footer)),
					image: JSON.parse(JSON.stringify(i.image)),
					video: JSON.parse(JSON.stringify(i.video)),
					provider: JSON.parse(JSON.stringify(i.provider)),
					author: JSON.parse(JSON.stringify(i.author)),
					fields: i.fields.map(o => JSON.parse(JSON.stringify(o)))
				}
			})
			msg_embeds = msg_embeds.filter(i => i.type == "rich")
			hook.send(msg.content, {username: msg.author.username, avatarURL: msg.author.displayAvatarURL(), embeds: msg_embeds, files: msg_files })
		} else {
			return
		}
	}
}

async function make_hook(name, channel_id) {
	channel = await client.channels.fetch(channel_id)
	channel.createWebhook(name, {reason: "An automated test by VirtualVessel"})
}

async function fetch_hooks(channel_id) {
	var channel = await client.channels.fetch(channel_id)
	var hooks = await channel.fetchWebhooks()
	return hooks.find(i => i.owner.id == "905828274901487628" )
	// hooks.forEach(i => {
	// 	i.send("bruh")
	// })
}

client.login(token)