const mongoose = require('mongoose');
require('dotenv').config();


//database configure
let db = mongoose.connection;
//連線失敗
db.on('error', console.error.bind(console, 'evolveCard connection error:'));
//連線成功
db.once('open', function () {
    console.log("userCommand connection success...");
});
//建立連線
mongoose.connect(process.env.BOT_MONGODB_URL, { useNewUrlParser: true }).then(() => console.log('DB Connected!'))
    .catch(err => {
        console.log(err);
    });

let schema = mongoose.Schema;

//userCommand schema model
let userCommandSchema = new schema({
    userID: String,
    username: String,
    commandText: String,
    timeStamp: String
});

let userCommand = mongoose.model('userCommand', userCommandSchema);

// make this available to our users in our Node applications
module.exports = userCommand;
