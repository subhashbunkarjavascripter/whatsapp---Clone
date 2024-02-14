var express = require('express');
var router = express.Router();
var users = require('./users');
var msgModel = require('./msg.js')
var passport =require('passport');
var localStrategy = require('passport-local');
const mongoose = require('mongoose');
const multer = require('multer');

passport.use(new localStrategy(users.authenticate()));

mongoose.connect('mongodb://0.0.0.0/whatsappR11').then(result =>{
   console.log('connect to db')
}).catch((err) =>{
  console.log('err')
});

 
const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage });

 

/* GET home page. */
router.get('/', (req, res, next) => {
  if (req.isAuthenticated()) {
      users.findOne({ username: req.session.passport.user })
          .then(function (loggedinuser) {
              res.render('index', { user: loggedinuser });
          })
  } else {
      res.redirect('/login');
  }
});

 router.post('/register', function(req, res, next){

  var newUser =  {
    username: req.body.username,
    pic: req.body.pic

  };
  users
  .register(newUser, req.body.password)
  .then(function(){
    passport.authenticate('local')(req, res,() =>{
      res.redirect('/')
    })
  }).catch((err) =>{
    res.send(err)
  });
 });

 router.get('/register', function(req, res, next){
  res.render('register');
 })

 router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.redirect('/login');
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      console.log('User logged in:', user.username); 
      setUserOnlineStatus(user.username);
      return res.redirect('/');
    });
  })(req, res, next);
});


 router.get('/login', function(req, res, next){
  res.render('login');
 });

  
 router.get('/logout', (req, res, next) => {
  if (req.isAuthenticated()) {
    setUserOfflineStatus(req.user.username); 
    req.logout((err) => {
      if (err) res.send(err);
      else res.redirect('/');
    });
  } else {
    res.redirect('/');
  }
});


router.get('/getMessages', async (req, res) => {
  try {
    // Retrieve messages from your database using msgModel
    const messages = await msgModel.find(); // Adjust this based on your model

    // Send the messages as a JSON response
    res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});



function isloggedin(req,res,next){
  if (req.isAuthenticated()){
    return next();
  }else{
    res.redirect('/login');
  }  
};


router.post('/finduser', isloggedin, async function(req, res, next){
  founduser = req.body.username
  var finduser = await users.findOne({
    username: founduser
  })
  if(finduser){
    res.status(200).json({
      user: finduser
    })
  }else{
    res.status(404).json({
      message: 'user not found'
    })
  }
});

router.post('/findChats', isloggedin, async function(req, res, next){
  var oppositeUser = await users.findOne({
    username: req.body.oppositeUser
  })

  var chats = await msgModel.find({
    $or:[
      {
        toUser: req.user.username,
        fromUser: oppositeUser.username
      },
      {
        toUser: oppositeUser.username,
        fromUser: req.user.username
      }
    ],
  });
  res.json({chats}) 

})



router.post('/uploadImage', upload.single('image'), async (req, res) => {
  try {
      const { originalname, buffer } = req.file;

      const newImage = new msgModel({
          data: buffer,
          fileName: originalname,
          messageType: 'image', // Set the messageType accordingly
          content: 'Image', // Set the content accordingly
      });

      await newImage.save();

      res.json({ success: true, message: 'Image uploaded successfully' });
  } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

router.get('/image/:filename', async (req, res) => {
  try {
      const filename = req.params.filename;
      const image = await msgModel.findOne({ fileName: filename });

      if (!image) {
          return res.status(404).send('Image not found');
      }

      res.contentType('image/png'); // Set the content type based on your image type
      res.send(image.data);
  } catch (error) {
      console.error('Error serving image:', error);
      res.status(500).send('Internal Server Error');
  }
});





const setUserOnlineStatus = async (username) => {
  try {
      await users.findOneAndUpdate(
          { username: username },
          { online: true } 
      );
      console.log(`${username} is online`);
  } catch (error) {
      console.error('Error setting user online:', error);
  }
};

const setUserOfflineStatus = async (username) => {
  try {
      await users.findOneAndUpdate(
          { username: username },
          { online: false, lastSeen: new Date() } 
      );
      console.log(`${username} is offline`);
  } catch (error) {
      console.error('Error setting user offline:', error);
  }
};

const getUserInfo = async (username) => {
  try {
      const user = await userModel.findOne({ username: username });
      if (user) {
          if (user.online) {
              return { online: true };
          } else {
              return { online: false, lastSeen: user.lastSeen };
          }
      } else {
          return { online: false, lastSeen: null }; 
      }
  } catch (error) {
      console.error('Error fetching user info:', error);
      return { online: false, lastSeen: null };
  }
};


router.post('/getUserInfo', async (req, res) => {
  const { username } = req.body;
  try {
      // Fetch user information based on the username
      const user = await users.findOne({ username });

      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      // Assuming 'online' and 'lastSeen' are fields in your user schema
      const { online, lastSeen } = user;

      // Send the user information as a response
      res.status(200).json({ userInfo: { online, lastSeen } });
  } catch (error) {
      console.error('Error fetching user info:', error);
      res.status(500).json({ message: 'Server error' });
  }
});



router.post('/upload', upload.single('image'), (req, res, next) => {
  // File uploaded. Now, save the file details to MongoDB.
  const fileName = req.file.filename;
  // Save fileName to MongoDB or use it as needed.
  res.json({ success: true, fileName: fileName });
});



function handleUploadResult(err, req, res) {
  if (err) {
    res.send(err);
  } else {
    if (req.file === undefined) {
      res.send('Error: No File Selected!');
    } else {
      res.send(`File uploaded: ${req.file.filename}`);
    }
  }
}





module.exports = router;
