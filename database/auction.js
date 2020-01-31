const mongoose = require('mongoose');

//database configure
let db = mongoose.connection;
//連線失敗
db.on('error', console.error.bind(console, 'evolveCard connection error:'));
//連線成功
db.once('open', function () {
    console.log("auction connection success...");
});
mongoose.connect('mongodb://localhost/alfred', { useUnifiedTopology: true, useNewUrlParser: true }).then(() => console.log('DB Connected!'))
    .catch(err => {
        console.log(err);
    });

let schema = mongoose.Schema;


//card schema model
let auctionSchema = new schema({

});

let auction = mongoose.model('auction', auctionSchema);

// make this available to our users in our Node applications
module.exports = auction;
