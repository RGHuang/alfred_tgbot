// Dependencies
let fs = require('fs');
let cron = require('cron');
const port = 80;
const url = 'https://api.telegram.org/bot';
const { prefix } = require('./config.json');
const TelegramApi = require('node-telegram-bot-api');
require('dotenv').config();
let userDB = require('./database/user');
let userCommandDB = require('./database/userCommand');
let auctionDB = require('./database/auction');

//bot configure
const telegramBot = new TelegramApi(process.env.TLBOT_TOKEN, { polling: true });

telegramBot.userJSON = require('./user.json');
telegramBot.cardJSON = require('./card.json');
telegramBot.auctionJSON = require('./auction.json');

let index;
let commandContent;
let _;
let commandText;
let userIndex;
const userInfo = 'userInfo';
const cardInfo = 'cardInfo';
const auctionInfo = 'auctionInfo';
const slotPlointConsume = -100;
const checkinPoints = 200;
const commandPoints = 10;
const evolveNeedAmount = 3;

const rulesText = '命令列表 - TL0.0.2'
    + '\n$checkin：每日登入領取 200 點'
    + '\n$info：查看個人資訊'
    + '\n$card：查看卡片資訊'
    + '\n$slot：花費 100 點數抽獎'
    + '\n$rank：查看點數排行榜'
    + '\n$code xxx：輸入序號兌換點數'
    + '\n$sell cardName：販賣已擁有卡片 hello'
    + '\n$bid cardName 100：參加拍賣會，對 cardName 出價 100 點數，時限內價高者得該卡片'
    + '\n$evolve cardName：消耗 ' + evolveNeedAmount + ' 張 cardName 取得進化卡片'
    + '\n使用指令獲得點數，請多多使用指令活絡氣氛！';

const errorText = '輸入指令格式錯誤，請輸入 $help 查看指令列表';

//$help
telegramBot.on('message', (message) => {
    _, commandContent = message.text.split(' ', 2);
    commandText = (commandContent[0]).toLowerCase();

    if (commandText == `${prefix}help` && commandContent[1] == undefined) {
        if (message.from.is_bot == false) {
            coroutineForEveryCommand(message.from.username, message.from.id);
        }
        if (isNewUserorNot(message.from.id)) {
            createNewUserInDB(message.from.username, message.from.id);
        } else {
            console.log("That's old user");
        }

        let userIDString = (message.from.id).toString();
        updateUserDB(userIDString);
        console.log(message.date);
        updateUserCommandDB(
            message.from.username,
            userIDString,
            commandText,
            message.date);
        telegramBot.sendMessage(message.chat.id, rulesText);
    } else if (message.text.startsWith(`${prefix}help`)) {
        telegramBot.sendMessage(message.chat.id, errorText);
    }
})

//$checkin
//checkin reset at 9 am everyday
let checkinResetCron = new cron.CronJob('00 00 09 * * *', checkinReset);
checkinResetCron.start();

telegramBot.on('message', (message) => {

    _, commandContent = message.text.split(' ', 2);
    commandText = (commandContent[0]).toLowerCase();
    if (commandText == `${prefix}checkin` && commandContent[1] == undefined) {
        if (message.from.is_bot == false) {
            coroutineForEveryCommand(message.from.username, message.from.id);
        }
        index = changeIDtoIndex(message.from.id, index);
        if (telegramBot.userJSON[userInfo][index].checkin == "off") {
            console.log(telegramBot.userJSON[userInfo][index].checkin);
            telegramBot.userJSON[userInfo][index].checkin = "on";
            console.log(telegramBot.userJSON[userInfo][index].checkin);
            telegramBot.userJSON[userInfo][index].points = telegramBot.userJSON[userInfo][index].points + checkinPoints;

            telegramBot.sendMessage(message.chat.id, '恭喜 '
                + message.from.first_name
                + ' '
                + message.from.last_name
                + '獲得 '
                + checkinPoints
                + ' 點數！\n目前共有：'
                + telegramBot.userJSON[userInfo][index].points
                + '點數');
        } else if (telegramBot.userJSON[userInfo][index].checkin == "on") {
            telegramBot.sendMessage(message.chat.id, message.from.first_name
                + ' '
                + message.from.last_name
                + " 今天已經完成 Checkin！\n每早 9 點重置");
        }

        updateJSON(telegramBot.userJSON);
        updateUserDB(userIDString);
        updateUserCommandDB(
            message.from.username,
            userIDString,
            commandText,
            message.date);
    } else if (message.text.startsWith(`${prefix}checkin`)) {
        telegramBot.sendMessage(message.chat.id, errorText)
    }
});



//$info
//=======================================================================================================================================================================================================================
telegramBot.on('message', message => {

    _, commandContent = message.text.split(' ', 2);
    commandText = (commandContent[0]).toLowerCase();
    if (commandText == `${prefix}info` && commandContent[1] == undefined) {
        if (message.from.is_bot == false) {
            coroutineForEveryCommand(message.from.username, message.from.id);
        }

        index = changeIDtoIndex(message.from.id, index);

        telegramBot.sendMessage(message.chat.id,
            '用戶 '
            + message.from.first_name
            + ' '
            + message.from.last_name
            + ' 的資訊\nID：'
            + message.from.id
            + '\n點數：'
            + telegramBot.userJSON[userInfo][index].points
            + ' 點');

        let userIDString = (message.from.id).toString();
        updateUserDB(userIDString);
        updateUserCommandDB(
            message.from.username,
            userIDString,
            commandText,
            message.date);
    } else if (message.text.startsWith(`${prefix}info`)) {
        telegramBot.sendMessage(message.chat.id, errorText)
    }
})


//>card
telegramBot.on('message', message => {

    _, commandContent = message.text.split(' ', 2);
    commandText = (commandContent[0]).toLowerCase();

    if (commandText == `${prefix}card` && commandContent[1] == undefined) {
        if (message.from.is_bot == false) {
            coroutineForEveryCommand(message.from.username, message.from.id);
        }
        let cardInfoArray = [];
        let noCardInfoArray = [];
        let evolveCardInfoArray = [];

        index = changeIDtoIndex(message.from.id, index);
        console.log(telegramBot.userJSON[userInfo][index].card[0].cardStatus);

        for (let i = 0; i < telegramBot.userJSON[userInfo][index].card.length; i++) {
            if (telegramBot.userJSON[userInfo][index].card[i].cardStatus == "on") {
                cardInfoArray.push('【' + telegramBot.cardJSON[cardInfo][i].name + '】\n卡片效果：' + telegramBot.cardJSON[cardInfo][i].ability
                    + '\n卡片張數：' + telegramBot.userJSON[userInfo][index].card[i].cardAmount + ' 張\n');
                console.log(cardInfoArray);
            } else if (telegramBot.userJSON[userInfo][index].card[i].cardStatus == "off") {
                noCardInfoArray.push('【' + telegramBot.cardJSON[cardInfo][i].name + '】\n卡片效果：' + telegramBot.cardJSON[cardInfo][i].ability + '\n');
                console.log(noCardInfoArray);
            }
        }
        for (let i = 0; i < telegramBot.userJSON[userInfo][index].evolveCard.length; i++) {
            //evolve card info display
            if (telegramBot.userJSON[userInfo][index].evolveCard[i].cardStatus == "on") {
                evolveCardInfoArray.push('【' + telegramBot.cardJSON[evolveCardInfo][i].name + '】\n卡片效果：' + telegramBot.cardJSON[evolveCardInfo][i].ability
                    + '\n卡片張數：' + telegramBot.userJSON[userInfo][index].evolveCard[i].cardAmount + ' 張\n');
                console.log(evolveCardInfoArray);
            }
        }

        if (cardInfoArray.length == 0) {
            cardInfoArray.push('\n暫時無卡片，請參加抽獎活動抽取！\n');
        }
        cardInfoArray = cardInfoArray.join('');

        if (noCardInfoArray.length == 0) {
            noCardInfoArray.push('\n你已獲得所有卡片，嘗試累積卡片，獲得特殊卡片！\n');
        }
        noCardInfoArray = noCardInfoArray.join('');

        if (evolveCardInfoArray.length == 0) {
            evolveCardInfoArray.push('\n暫時無卡片，請參加抽獎活動抽取卡片來進化！')
        }
        evolveCardInfoArray = evolveCardInfoArray.join('');

        let userIDString = (message.from.id).toString();
        updateUserDB(userIDString);
        updateUserCommandDB(
            message.from.username,
            userIDString,
            commandText,
            message.date);

        telegramBot.sendMessage(message.chat.id, message.from.username + ' 的卡片資訊\n擁有卡片：\n' + cardInfoArray
            + '\n尚未擁有卡片：\n' + noCardInfoArray + '\n\n＊特殊卡牌：\n' + evolveCardInfoArray);
    } else if (message.text.startsWith(`${prefix}card`)) {
        telegramBot.sendMessage(message.chat.id, errorText);
    }
})


//>slot
telegramBot.on('message', message => {
    _, commandContent = message.text.split(' ', 2);
    commandText = (commandContent[0]).toLowerCase();
    if (commandText == `${prefix}slot` && commandContent[1] == undefined) {
        if (message.from.is_bot == false) {
            coroutineForEveryCommand(message.from.username, message.from.id);
        }

        let slotPrize;
        telegramBot.sendMessage(message.chat.id, message.from.first_name
            + ' '
            + message.from.last_name
            + ' 開始抽獎！');

        index = changeIDtoIndex(message.from.id, index);

        if (telegramBot.userJSON.userInfo[index].points + slotPlointConsume < 0) {
            telegramBot.sendMessage(message.chat.id, message.from.first_name
                + ' '
                + message.from.last_name
                + ' 點數不足無法抽獎！')
        } else {
            slotPrize = slot(index, slotPrize);
            telegramBot.sendMessage(message.chat.id, message.from.first_name
                + ' '
                + message.from.last_name
                + ' 消耗 '
                + (-slotPlointConsume)
                + ' 點...\n'
                + slotPrize
                + ' \n剩餘點數 '
                + telegramBot.userJSON[userInfo][index].points
                + ' 點');
        }

        let userIDString = (message.from.id).toString();
        updateUserDB(userIDString);
        updateUserCommandDB(
            message.from.username,
            userIDString,
            commandText,
            message.date);

    } else if (message.text.startsWith(`${prefix}slot`)) {
        telegramBot.sendMessage(message.chat.id, errorText);
    }
})

//>rank
telegramBot.on('message', message => {

    _, commandContent = message.text.split(' ', 2);
    commandText = (commandContent[0]).toLowerCase();
    if (commandText == `${prefix}rank` && commandContent[1] == undefined) {
        if (message.from.is_bot == false) {
            coroutineForEveryCommand(message.from.username, message.from.id);
        }

        let rankArray = [];
        let rankDisplay = ['點數排行榜\n'];
        rankArray = rankPoints(rankArray);
        for (let i = 0; i < rankArray[1].length; i++) {
            if (rankArray[1][i] != rankArray[1][i + 1]) {
                rankDisplay.push('【第 ' + (i + 1) + ' 名】： ' + rankArray[1][i] +
                    ' ，共 ' + rankArray[0][i] + ' 分\n');
            } else {
                for (let j = 0; j < (rankArray[0].length - i); j++) {
                    if (rankArray[0][i] == rankArray[0][i + j] && rankArray[0][i] != undefined) {
                        rankDisplay.push('第 ' + (i + 1) + ' 名： ' + rankArray[1][i + j] +
                            ' 共 ' + rankArray[0][i + j] + ' 分\n');
                    }
                }
            }
        }
        rankDisplay = rankDisplay.join('');

        let userIDString = (message.from.id).toString();
        updateUserDB(userIDString);
        updateUserCommandDB(
            message.from.username,
            userIDString,
            commandText,
            message.date);

        telegramBot.sendMessage(message.chat.id, rankDisplay);
    } else if (message.text.startsWith(`${prefix}rank`)) {
        telegramBot.sendMessage(message.chat.id, errorText)
    }
})

//>sell
telegramBot.on('message', message => {

    _, commandContent = message.text.split(' ', 2);
    commandText = (commandContent[0]).toLowerCase();

    if (commandText == `${prefix}sell`) {
        if (message.from.is_bot == false) {
            coroutineForEveryCommand(message.from.username, message.from.id);
        }

        let _;
        let getSellCard;
        let cardName;
        let cardIndex;
        let isSelling;

        _, getSellCard = message.text.split(' ', 2);
        cardName = getSellCard[1];
        console.log(cardName);
        cardIndex = getSellCardIndex(cardName)
        isSelling = checkIsSellingorNot(isSelling);
        index = changeIDtoIndex(message.from.id);

        if (cardIndex == undefined) {
            telegramBot.sendMessage(message.chat.id, '卡片名稱輸入錯誤，請輸入 $card 確認');
        } else {
            if (!isSelling) {
                if (checkUserHaveCardorNot(index, cardIndex)) {
                    //console.log('can sell ' + cardName);
                    updateSellingStatus(cardIndex, "true", message.from.username);
                    telegramBot.sendMessage(message.chat.id, message.from.username + ' 正在出售卡片：' + cardName + '\n有興趣的買家請儘速出價，出價時間為 10 分鐘！！');
                    let sellTimeInterval = setTimeout(function () {
                        //highestBidPoint = getHighestPoint();
                        updateSellingStatus(cardIndex, "false", message.from.username);
                        let bidder = telegramBot.auctionJSON[auctionInfo][cardIndex].bidArray.usernameArray[telegramBot.auctionJSON[auctionInfo][cardIndex].bidArray.usernameArray.length - 1];
                        let bidPoint = parseInt(telegramBot.auctionJSON[auctionInfo][cardIndex].bidArray.priceArray[telegramBot.auctionJSON[auctionInfo][cardIndex].bidArray.priceArray.length - 1]);
                        winningBidderGetCard(bidder, cardIndex, bidPoint);

                        if (bidder == message.from.username) {
                            telegramBot.sendMessage(message.chat.id, cardName + " 的拍賣會已經結束，無人競拍，卡片歸還原主");
                        } else {
                            telegramBot.sendMessage(message.chat.id, cardName + " 的拍賣已經結束，由 "
                                + telegramBot.auctionJSON[auctionInfo][cardIndex].bidArray.usernameArray[telegramBot.auctionJSON[auctionInfo][cardIndex].bidArray.usernameArray.length - 1]
                                + " 以 " + telegramBot.auctionJSON[auctionInfo][cardIndex].bidArray.priceArray[telegramBot.auctionJSON[auctionInfo][cardIndex].bidArray.priceArray.length - 1]
                                + " 點數得標 ").catch(console.error);
                        }
                        telegramBot.auctionJSON[auctionInfo][cardIndex].bidArray.usernameArray = ["Seller"];
                        telegramBot.auctionJSON[auctionInfo][cardIndex].bidArray.priceArray = [0];
                        console.log(telegramBot.auctionJSON[auctionInfo][cardIndex].bidArray.usernameArray);
                    }, 10 * 60 * 1000);


                } else if (!checkUserHaveCardorNot(index, cardIndex)) {
                    telegramBot.sendMessage(message.chat.id, "尚未擁有該卡片，無法出售 " + cardName);
                }
            } else {
                telegramBot.sendMessage(message.chat.id, "正在出售卡片，請等拍賣會結束再進行出售！")
            }
        }
        let userIDString = (message.from.id).toString();
        updateUserDB(userIDString);
        updateUserCommandDB(
            message.from.username,
            userIDString,
            commandText,
            message.date);

    } else if (message.text.startsWith(`${prefix}sell`)) {
        telegramBot.sendMessage(message.chat.id, errorText)
    }
})

//>bid
telegramBot.on('message', message => {

    _, commandContent = message.text.split(' ', 2);
    commandText = (commandContent[0]).toLowerCase();

    if (commandText == `${prefix}bid`) {
        if (message.from.is_bot == false) {
            coroutineForEveryCommand(message.from.username, message.from.id);
            console.log("coroutineForEveryCommand");
        }

        let getBidCard;
        let cardName;
        let cardIndex;
        let bidPrice;
        let bidPriceArray = [];
        let bidUsernameArray = [];

        _, getBidCard = message.text.split(' ', 3);
        cardName = getBidCard[1];
        bidPrice = parseInt(getBidCard[2], 10);
        cardIndex = getSellCardIndex(cardName)
        userIndex = changeIDtoIndex(message.from.id);

        console.log(cardIndex);

        if (cardIndex == undefined) {
            telegramBot.sendMessage(message.chat.id, "卡片名稱輸入錯誤，請輸入：$card 來查看卡片資訊");
        } else if (getBidCard[2] == undefined || bidPrice == undefined) {
            telegramBot.sendMessage(message.chat.id, "格式錯誤，請輸入：$help 來查看正確用法")
        } else {
            if (canBidorNot(cardIndex)) {
                if (bidPrice <= telegramBot.userJSON[userInfo][userIndex].points) {
                    bidPriceArray = telegramBot.auctionJSON[auctionInfo][cardIndex].bidArray.priceArray;
                    //console.log(bidPriceArray);
                    bidUsernameArray = telegramBot.auctionJSON[auctionInfo][cardIndex].bidArray.usernameArray;
                    if (bidPriceArray == [] || bidPrice > bidPriceArray[bidPriceArray.length - 1]) {
                        if (message.from.username != telegramBot.auctionJSON[auctionInfo][cardIndex].bidArray.usernameArray[0]) {
                            bidToAuctionJSON(message.from.username, bidPrice, bidPriceArray, bidUsernameArray);
                            telegramBot.sendMessage(message.chat.id, message.from.username + '成功出價！\n出價 ' + bidPrice + ' 點數，為目前最高價！');
                        } else {
                            telegramBot.sendMessage(message.chat.id, "禁止哄抬物價，謝謝配合！");
                        }
                    } else if (bidPrice <= bidPriceArray[bidPriceArray.length - 1]) {
                        telegramBot.sendMessage(message.chat.id, message.from.username + '出價失敗！！\n目前最高出價為 '
                            + bidUsernameArray[bidUsernameArray.length - 1] + ' 的 ' + bidPriceArray[bidPriceArray.length - 1]
                            + ' 點，有興趣的買家請出高價競標！');
                    }
                } else {
                    telegramBot.sendMessage(message.chat.id, message.from.username + ' 點數不足，無法出價！');
                }
            } else if (!canBidorNot(cardIndex)) {
                telegramBot.sendMessage(message.chat.id, "尚未有人出售該卡片，無法出價！");
            }
        }

        let userIDString = (message.from.id).toString();
        updateUserDB(userIDString);
        updateUserCommandDB(
            message.from.username,
            userIDString,
            commandText,
            message.date);

    } else if (message.text.startsWith(`${prefix}bid`)) {
        telegramBot.sendMessage(message.chat.id, errorText)
    }
})
//$evolve
telegramBot.on('message', message => {


    _, commandContent = message.text.split(' ', 2);
    commandText = (commandContent[0]).toLowerCase();

    if (commandText == `${prefix}evolve`) {
        if (message.from.is_bot == false) {
            coroutineForEveryCommand(message.from.username, message.from.id);
        }

        let _;
        let getBasicCard;
        let cardIndex;
        let cardname;

        _, getBasicCard = message.text.split(' ', 2);
        cardname = getBasicCard[1];

        cardIndex = getSellCardIndex(cardname);
        userIndex = changeIDtoIndex(message.from.id, userIndex);
        //console.log(cardIndex);

        if (cardIndex == undefined) {
            telegramBot.sendMessage(message.chat.id, '卡片輸入錯誤，請輸入 $card 確認卡片名稱！');
        } else {
            if (telegramBot.userJSON[userInfo][userIndex].card[cardIndex].cardAmount >= evolveNeedAmount) {
                evolveBasicCardToEvolveCoard(cardIndex, userIndex);
                telegramBot.sendMessage(message.chat.id, cardname + '成功進化\n恭喜 ' + message.from.username + ' 獲得特殊卡片【' + telegramBot.cardJSON[evolveCardInfo][cardIndex].name + "】！！");
            } else if (telegramBot.userJSON[userInfo][userIndex].card[cardIndex].cardAmount < evolveNeedAmount || telegramBot.userJSON[userInfo].card[cardIndex].cardStatus == "off") {
                telegramBot.sendMessage(message.chat.id, cardname + '數量不足，無法進化！');
            }
        }

        let userIDString = (message.from.id).toString();
        updateUserDB(userIDString);
        updateUserCommandDB(
            message.from.username,
            userIDString,
            commandText,
            message.date);

    } else if (message.text.startsWith(`${prefix}evolve`)) {
        telegramBot.sendMessage(message.chat.id, errorText)
    }
})

/*
============================================================================================================================
DB relate Function
*/

function writeDataIntoDB(database) {
    database.save(function (err) {
        if (err) throw err;
        console.log('Write in DB successfully');
    })
}
/* example write method
let chris = new userDB({
    username: 'Chris',
    userID: '1923102481'
});
writeDataIntoDB(chris);
*/

function createNewUserInDB(username, userID) {
    let newUser = new userDB({
        username: username,
        userID: userID,
        points: 0,
        commandAmount: 0,
        card: [
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            },
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            },
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            },
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            },
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            },
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            },
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            },
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            },
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            },
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            }],
        evolveCard: [
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            },
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            },
            {
                cardStatus: "off",
                cardAmount: 0,
                selling: "false"
            }
        ]
    })
    writeDataIntoDB(newUser);
}

function updateUserDB(userID) {
    index = changeIDtoIndex(userID);
    userDB.updateOne({ userID: userID },
        { points: telegramBot.userJSON[userInfo][index].points }).then(result => {
            console.log(result);
        })

    userDB.updateOne({ userID: userID },
        { commandAmount: telegramBot.userJSON[userInfo][index].commandAmount }).then(result => {
            console.log(result);
        })

    userDB.updateOne({ userID: userID },
        { checkin: telegramBot.userJSON[userInfo][index].checkin }).then(result => {
            console.log(result);
        })
}

function updateUserCommandDB(username, userID, commandText, date) {
    let userCommandInfo = new userCommandDB({
        userID: userID,
        username: username,
        commandText: commandText,
        timeStamp: date
    })
    writeDataIntoDB(userCommandInfo);
}

function getDatabase(userID) {

    return userDB.findOne({ userID: userID }).exec();


    //return myJson.user;
    //console.log(doc);
    /*userID1 = doc.userID;
    console.log('userID1');
    console.log(userID1);
    console.log('userID1');
})
return userID1;*/

}

function updateAuctionDB() {

}

/*
============================================================================================================================
Main Function
*/
function updateJSON(json) {
    fs.writeFile('./user.json', JSON.stringify(json, null, 4), err => {
        if (err) throw err;
    })
}

function isNewUserorNot(userID) {
    for (let i = 0; i < telegramBot.userJSON[userInfo].length; i++) {
        if (telegramBot.userJSON[userInfo][i].userID != userID) {
            return true;
        } else {
            console.log("it's old user");
        }
    }
}


function coroutineForEveryCommand(username, id) {
    updateUserID(username, id);
    userIndex = changeIDtoIndex(id, userIndex);
    updateCommandAmount(userIndex);
    updatePoint(userIndex, commandPoints);
    updateJSON(telegramBot.userJSON);
}


function updateUserID(userName, id) {

    for (let i = 0; i < telegramBot.userJSON[userInfo].length; i++) {
        if (userName == telegramBot.userJSON[userInfo][i].username) {
            telegramBot.userJSON[userInfo][i].userID = parseInt(id);
            break;
        } else if (telegramBot.userJSON[userInfo][i].username == "test") {
            telegramBot.userJSON[userInfo][i].username = userName;
            telegramBot.userJSON[userInfo][i].userID = parseInt(id);
            break;
        }
    }
    updateJSON(telegramBot.userJSON);
}

function updateCommandAmount(userIndex) {
    telegramBot.userJSON[userInfo][userIndex].commandAmount += 1;
}

function updatePoint(userIndex, point) {
    telegramBot.userJSON[userInfo][userIndex].points += point;
}


function checkinReset() {
    console.log("checkinReset at 9 am everyday");
    for (let i = 0; i < telegramBot.userJSON[userInfo].length; i++) {
        telegramBot.userJSON[userInfo][i].checkin = "off";
        console.log('Reset checkin ' + telegramBot.userJSON[userInfo][i].username);
    }
}


function changeIDtoIndex(id, index) {
    for (let i = 0; i < telegramBot.userJSON[userInfo].length; i++) {
        if (id == telegramBot.userJSON[userInfo][i].userID) {
            index = i;
        }
    }
    return index;
}



function rankPoints(rankArray) {
    let pointsArray = [];
    let topPointsArray = [];
    let topNameArray = [];
    for (i = 0; i < telegramBot.userJSON[userInfo].length; i++) {
        if (telegramBot.userJSON[userInfo][i].username != "test") {
            pointsArray.push(telegramBot.userJSON[userInfo][i].points);
        }
    }
    //sort points array
    pointsArray = bubbleSort(pointsArray);

    //only display Top10
    if (pointsArray.length < 10) {
        for (let i = 1; i <= pointsArray.length; i++) {
            topPointsArray.push(pointsArray[pointsArray.length - i]);
        }
    } else if (pointsArray.length >= 10) {
        for (let i = 1; i <= 10; i++) {
            topPointsArray.push(pointsArray[pointsArray.length - i]);
        }
    }
    console.log(topPointsArray);


    //infer name array
    for (let i = 0; i < topPointsArray.length; i++) {
        for (let j = 0; j < telegramBot.userJSON[userInfo].length; j++) {
            if (topPointsArray[i] == telegramBot.userJSON[userInfo][j].points) {
                //console.log('same points');
                //sort name array
                if (topNameArray.length == 0) {
                    topNameArray.push(telegramBot.userJSON[userInfo][j].username);
                    console.log('if topNameArray = []');
                } else {
                    for (let k = 0; k < topNameArray.length; k++) {
                        if (topNameArray[0] != undefined && topNameArray[i] != telegramBot.userJSON[userInfo][j].username) {
                            topNameArray.push(telegramBot.userJSON[userInfo][j].username);
                        }
                    }
                }
            }
        }
    }
    console.log('topNameArray: ' + topNameArray);


    for (let i = 0; i < 2; i++) {
        rankArray[i] = [];
        for (let j = 0; j < topPointsArray.length; j++) {
            if (i == 0) {
                rankArray[i][j] = topPointsArray[j];
            } else if (i == 1) {
                rankArray[i][j] = topNameArray[j];
            }
        }
    }
    console.log(rankArray);
    return rankArray;
}

function slot(userIndex, slotPrize) {
    let slotPoint = GetRandomNum(1, 200);
    let slotCard = GetRandomNum(1, 10);
    let random = GetRandomNum(0, 1);
    if (random == 0) {
        telegramBot.userJSON[userInfo][userIndex].points = telegramBot.userJSON[userInfo][userIndex].points + slotPoint + slotPlointConsume;
        slotPrize = '恭喜獲得' + slotPoint + ' 點！';
    } else if (random == 1) {
        let cardIndex = slotCard - 1;
        telegramBot.userJSON[userInfo][userIndex].points = telegramBot.userJSON[userInfo][userIndex].points + slotPlointConsume;
        if (telegramBot.userJSON[userInfo][userIndex].card[cardIndex].cardAmount == 0) {
            telegramBot.userJSON[userInfo][userIndex].card[cardIndex].cardStatus = "on";
            telegramBot.userJSON[userInfo][userIndex].card[cardIndex].cardAmount = 1;
        } else {
            telegramBot.userJSON[userInfo][i].card[cardIndex].cardAmount += 1;
        }
        slotPrize = '恭喜獲得【' + telegramBot.cardJSON[cardInfo][cardIndex].name + '】';
    }
    console.log(telegramBot.userJSON[userInfo][userIndex].card)
    updateJSON(telegramBot.userJSON);
    return slotPrize;
}


function GetpointsFromToken(id, code, result) {

    let getpoints;
    if (code == undefined) {
        result = "格式錯誤，請輸入 $help 以確認用法！";
    } else {
        for (let i = 0; i < telegramBot.codeJSON[codeInfo].length; i++) {
            if (code == telegramBot.codeJSON[codeInfo][i].privateKey) {
                if (telegramBot.codeJSON[codeInfo][i].status == "on") {
                    getpoints = telegramBot.codeJSON[codeInfo][i].points;
                    telegramBot.codeJSON[codeInfo][i].status = "off";
                    updateJSON(telegramBot.codeJSON);
                    for (let j = 0; j < telegramBot.userJSON[userInfo].length; j++) {
                        if (id == telegramBot.userJSON[userInfo][j].userID) {
                            telegramBot.userJSON[userInfo][j].points += getpoints
                            updateJSON(telegramBot.userJSON);
                        }
                    }
                    result = "積分兌換成功！！\n恭喜獲得 " + getErc + " 積分";
                    break;
                } else if (telegramBot.codeJSON[codeInfo][i].status == "off") {
                    result = "序號已經被兌換！！\n若有問題，請聯繫客服！";
                    break;
                }
            } else {
                result = "序號輸入錯誤，請確序號再重新輸入！"
            }
        }
    }
    return result;
}

function getSellCardIndex(cardName) {
    for (let i = 0; i < telegramBot.cardJSON[cardInfo].length; i++) {
        if (cardName == telegramBot.cardJSON[cardInfo][i].name) {
            return i;
        }
    }
}
function checkUserHaveCardorNot(userIndex, cardIndex) {

    if (telegramBot.userJSON[userInfo][userIndex].card[cardIndex].cardAmount > 0 &&
        telegramBot.auctionJSON[auctionInfo][cardIndex].inAuction == "false") {
        return true;
    } else {
        return false;
    }
}
function checkIsSellingorNot(isSelling) {
    for (let i = 0; i < telegramBot.auctionJSON[auctionInfo].length; i++) {
        if (telegramBot.auctionJSON[auctionInfo][i].bidArray.usernameArray[0] != "Seller") {
            isSelling = true;
            break;
        } else {
            isSelling = false;
        }
    }
    return isSelling;
}

function updateSellingStatus(cardIndex, status, sellCardUsername) {

    telegramBot.auctionJSON[auctionInfo][cardIndex].inAuction = status;
    telegramBot.auctionJSON[auctionInfo][cardIndex].bidArray.usernameArray[0] = sellCardUsername;

    console.log(telegramBot.auctionJSON[auctionInfo][cardIndex].bidArray.usernameArray);

    updateJSON(telegramBot.auctionJSON);
}

function winningBidderGetCard(bidder, cardIndex, bidPoint) {
    for (let i = 0; i < telegramBot.userJSON[userInfo].length; i++) {
        if (telegramBot.userJSON[userInfo][i].username == bidder) {
            telegramBot.userJSON[userInfo][i].card[cardIndex].cardAmount += 1;
            telegramBot.userJSON[userInfo][i].card[cardIndex].cardStatus = "on";
            telegramBot.userJSON[userInfo][i].points -= bidPoint;
        }
    }
    updateJSON(telegramBot.userJSON);
}

function canBidorNot(cardIndex) {
    if (telegramBot.auctionJSON[auctionInfo][cardIndex].inAuction == "true") {
        return true;
    } else if (telegramBot.auctionJSON[auctionInfo][cardIndex].inAuction == "false") {
        return false;
    } else {
        return undefined;
    }
}

function bidToAuctionJSON(bidUsername, bidPrice, bidPriceArray, bidUsernameArray) {

    bidPrice = parseInt(bidPrice);
    bidPriceArray.push(bidPrice);
    console.log(bidPriceArray);

    bidUsernameArray.push(bidUsername);
    console.log(bidUsernameArray);

    updateJSON(telegramBot.auctionJSON);

}

function evolveBasicCardToEvolveCoard(cardIndex, userIndex) {
    telegramBot.userJSON[userInfo][userIndex].card[cardIndex].cardAmount -= evolveNeedAmount;
    console.log(telegramBot.userJSON[userInfo][userIndex].card[cardIndex].cardAmount);
    if (telegramBot.userJSON[userInfo][userIndex].card[cardIndex].cardAmount == 0) {
        telegramBot.userJSON[userInfo][userIndex].card[cardIndex].cardStatus == "off";
    }
    telegramBot.userJSON[userInfo][userIndex].evolveCard[cardIndex].cardAmount += 1;
    telegramBot.userJSON[userInfo][userIndex].evolveCard[cardIndex].cardStatus = "on";

    updateJSON(telegramBot.userJSON);

}

function wirteUserJSON() {
    fs.readFile('./user.json', function (err, userJSON) {
        if (err) {
            return console.error(err);
        }
        let user = userJSON.toString();
        user = JSON.parse(user);

        //writing all data in user.json except username == test || userID == 0
        for (let i = 0; i < user.userInfo.length; i++) {

            if (telegramBot.userJSON[userInfo][i].userID != 0 && telegramBot.userJSON[userInfo][i].username != "test") {

                user.userInfo[i].userID = telegramBot.userJSON[userInfo][i].userID;
                user.userInfo[i].username = telegramBot.userJSON[userInfo][i].username;
                user.userInfo[i].points = telegramBot.userJSON[userInfo][i].points;
                user.userInfo[i].commandAmount = telegramBot.userJSON[userInfo][i].commandAmount;
                for (let j = 0; j < user.userInfo[i].card.length; j++) {
                    user.userInfo[i].card[j].cardStatus = telegramBot.userJSON[userInfo][i].card[j].cardStatus;
                    user.userInfo[i].card[j].selling = telegramBot.userJSON[userInfo][i].card[j].selling;
                }
                user.userInfo[i].checkin = telegramBot.userJSON[userInfo][i].checkin;
            }
        }

        let str = JSON.stringify(user);
        fs.writeFile('./user.json', str, function (err) {
            if (err) {
                console.error(err);
            }
            console.log('Write all changes into user.json');
        })
    })

}

function writeAuctionJSON() {
    fs.readFile('./auction.json', function (err, auctionJSON) {
        if (err) {
            return console.error(err);
        }
        let auction = auctionJSON.toString();
        auction = JSON.parse(auction);

        for (let i = 0; i < auction.auctionInfo.length; i++) {
            auction.auctionInfo[i].id = telegramBot.auctionJSON[auctionInfo][i].id;
            auction.auctionInfo[i].name = telegramBot.auctionJSON[auctionInfo][i].name;
            auction.auctionInfo[i].inAuction = telegramBot.auctionJSON[auctionInfo][i].inAuction;
        }


        let str = JSON.stringify(auction);
        fs.writeFile('./auction.json', str, function (err) {
            if (err) {
                console.error(err);
            }
            console.log('Write all changes into auction.json');
        })
    })

}
function writeAllJSON() {
    wirteUserJSON();
    writeAuctionJSON();
    console.log('write user.json and auction.json at 4 am');
}

function GetRandomNum(Min, Max) {
    let Range = Max - Min;
    let Rand = Math.random();
    return (Min + Math.round(Rand * Range));
}

function bubbleSort(array) {

    for (let i = 0; i < array.length; i++) {
        for (let j = 0; j < array.length - (i + 1); j++) {
            if (array[j] > array[j + 1]) {
                [array[j], array[j + 1]] = [array[j + 1], array[j]];
            }
        }
    }
    return array;
}









