require('./database.js.js');
const slackAPI = require('slackbots');
require('dotenv').config();
const telegramAPI = require('node-telegram-bot-api');
const targetChannel = 'buzzer_alfred';
let CronJob = require('cron').CronJob;

let sendWarningToSlackorNot = false;


const telegramBot = new telegramAPI(process.env.TGBUZZER_TOKEN, { polling: true });
telegramBot.on('message', (message) => {
    let sendHelpJob = new CronJob('* * * * * * ', function () {
        telegramBot.sendMessage(message.chat.id, '$help');
    }, null, true, 'America/Los_Angeles');
    sendHelpJob.start();
    console.log(message.chat.id);

}
)

telegramBot.on('message', (message) => {
    if (message.text == 'Alive!!') {
        sendWarningToSlackorNot = true;
    }
})

const slackBot =
    new slackAPI({
        token: `${process.env.SLACK_TOKEN}`,
        name: 'Slack_Buzzer'
    })

slackBot.on('message', () => {
    if (sendWarningToSlackorNot) {
        slackBot.postMessageToChannel(targetChannel, 'tgBot is alive!');
    }
})