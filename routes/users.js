 const mongoose = require('mongoose');
 const plm = require('passport-local-mongoose');


 const userSchema = mongoose.Schema({
  username: String,
  password: String,
  pic: String,
  chats: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user'
    }
  ],
  currentSocket: String,
  online: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },

 })

 userSchema.plugin(plm);

 module.exports = mongoose.model('user',userSchema)