const Discord = require('discord.js');
const client = new Discord.Client;
const prefix = "!";
const config = require('./config2.json');
const ytdl = require('ytdl-core');

const queue = new Map();

client.once('ready', () => {
  client.user.setActivity("Musik abspielen");
  console.log('Ready!');
});

client.once('reconnecting', () => {
  console.log('Reconnecting!');
});

client.once('disconnect', () => {
  console.log('Disconnect!');
});

client.on('message', async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const serverQueue = queue.get(message.guild.id);

  if (message.content.startsWith(`${prefix}play`)) {
    execute(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}skip`)) {
    skip(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}stop`)) {
    stop(message, serverQueue);
    return;
  } else {
    let richEmbed = new Discord.RichEmbed()
      .setColor(0x00f2ff)
      .setTitle(message.member.displayName)
      .setDescription("Bitte benutze einen gültigen Befehl!")
      .setTimestamp()
      .setFooter("©️ Gumbi", client.user.avatarURL);

    message.channel.send(richEmbed);

  }
});

async function execute(message, serverQueue) {
  const args = message.content.split(' ');
  const voiceChannel = message.member.voiceChannel;

  if (!voiceChannel) {
    let richEmbed = new Discord.RichEmbed()
      .setColor(0x00f2ff)
      .setTitle(message.member.displayName)
      .setDescription("Du musst in einem Sprachkanal sein, damit ich die gewünschte Musik abspielen kann")
      .setTimestamp()
      .setFooter("©️ Gumbi", client.user.avatarURL);

    return message.channel.send(richEmbed);
  }

  const permissions = voiceChannel.permissionsFor(message.client.user);

  if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
    return;
  } else {
    let richEmbed = new Discord.RichEmbed()
      .setColor(0x00f2ff)
      .setTitle(message.member.displayName)
      .setDescription("Song wird gleich abgespielt. Bitte gedulde dich kurz.")
      .setTimestamp()
      .setFooter("©️ Gumbi", client.user.avatarURL);

    message.channel.send(richEmbed);



    let valid = ytdl.validateURL(args[1]);
    if (!valid) return message.reply("bitte gib einen gültigen Link an.");

    const songInfo = await ytdl.getInfo(args[1]);
    const song = {
      title: songInfo.title,
      url: args[1],
    };

    if (!serverQueue) {
      const queueContruct = {
        textChannel: message.channel,
        voiceChannel: voiceChannel,
        connection: null,
        songs: [],
        volume: 5,
        playing: true,
      };

      queue.set(message.guild.id, queueContruct);

      queueContruct.songs.push(song);

      try {
        var connection = await voiceChannel.join();
        queueContruct.connection = connection;
        play(message.guild, queueContruct.songs[0]);
      } catch (err) {
        console.log(err);
        queue.delete(message.guild.id);
        return message.channel.send(err);
      }
    } else {
      serverQueue.songs.push(song);
      console.log(serverQueue.songs);
      return message.channel.send("Der Song wurde der Warteschleife hinzugefügt");
    }
  }
}

function skip(message, serverQueue) {
  if (!message.member.voiceChannel) return message.channel.send('Es gibt kein Lied, dass ich skippen kann!');
  if (!serverQueue) return message.channel.send('Es gibt kein Lied, dass ich skippen kann!');
  serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
  if (!message.member.voiceChannel) return message.channel.send('Du musst in einem Channel sein, damit ich die Musik stoppen kann!');


  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);

  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
    .on('end', () => {
      console.log('Musik ist zuende!');
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on('error', error => {
      console.error(error);
    });
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 50);
}

client.login(process.env.BOT_TOKEN);
