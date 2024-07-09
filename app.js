const express = require('express'); 
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose')
const Quiz = require('./models/quiz')
const bodyParser = require('body-parser'); 
const session = require('express-session'); 
const flash = require('connect-flash'); 
const bcrypt = require('bcryptjs');
const passport = require('passport'); 
const app = express(); 
require('dotenv').config(); 

//Load User model
const User = require('./models/User'); 

//To prevent to access dashboard without login 
const {forwardAuthenticated, ensureAuthenticated} = require('./config/auth')

//passport config
require('./config/passport')(passport);

//Database config
const dB = process.env.MONGO_URI || 'mongodb+srv://faizmeraj25:'+ encodeURIComponent('Faiz@0786') + '@cluster0.tc3rdts.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

//EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');

//Server Static files
app.use(express.static('public'));

// Express body parser
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Express session
app.use(
    session({
      secret: 'secret',
      resave: true,
      saveUninitialized: true
    })
  );

//Passport 
app.use(passport.initialize());
app.use(passport.session());

//To display messages. 
app.use(flash()); 

//Connect to MongoDB
mongoose.connect(dB)
    .then(() => console.log('Connected to MongoDB'))
    .catch(error => console.error('Error connecting to MongoDB:', error));

// Global variables
app.use(function(req, res, next) {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.isAuthenticated = req.isAuthenticated(); 
    res.locals.user = req.user || null; 
    next();
  });

//Routers
app.get('/', forwardAuthenticated,(req, res)=>{
    res.render('welcome'); 
})

app.get('/create-quiz', ensureAuthenticated,(req, res)=>{
    res.render('create-quiz')
});
app.post('/create-quiz',  async(req, res)=>{
    const { quizName, numQuestions, ...questionsData } = await req.body;
    console.log('req.body', quizName, numQuestions, questionsData);
    console.log('lenght', questionsData['question1']); 
    let errors = []; 
    if(!quizName)
        errors.push({'msg' : 'Quiz Name is not entered'}); 
    if(!numQuestions)
        errors.push({'msg':'Number of Questions is not entered'}); 
    if(questionsData['question1'] === undefined)
        errors.push({'msg':'Click on Generate Question button'}); 
    if(errors.length)
    {
        console.log('errors', errors);
        res.render('create-quiz', {errors, quizName, numQuestions}); 
    }
    else
    {
        const questions = [];

        for (let i = 1; i <= numQuestions; i++) {
            const questionText = questionsData[`question${i}`];
            const options = [
                { optionText: questionsData[`option${i}_1`] },
                { optionText: questionsData[`option${i}_2`] },
                { optionText: questionsData[`option${i}_3`] },
                { optionText: questionsData[`option${i}_4`] }
            ];
            const correctOption = parseInt(questionsData[`correctOption${i}`], 10);

            questions.push({ questionText, options, correctOption });
        }

        const newQuiz = new Quiz({
            quizName,
            numberOfQuestions: numQuestions,
            questions
        });
        console.log(newQuiz); 
        try {
            const savedQuiz = await newQuiz.save();
            console.log('Saved !!');
            req.flash('success_msg', `${quizName} quiz is created !!`); 
            res.redirect('/quizzes');
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}); 
app.get('/quizzes', ensureAuthenticated,async (req, res)=>{
        try {
            const quizzes = await Quiz.find();
            // res.status(200).json(quizzes);
            console.log(quizzes); 
            res.render('quizzes', {quizzes: quizzes});
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
});
// Fetch a specific quiz by ID
app.get('/quizzes/:id', ensureAuthenticated, async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }
        else{
            console.log('quiz', quiz);
            res.render('quiz', {quiz: quiz.toJSON()});
            // res.status(200).json(quiz);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
//Post result page
app.post('/result', (req, res) => {
  const { correct, totalQuestions, unanswered, wrong } = req.body;
  console.log('post result', correct, totalQuestions, unanswered, wrong);
  res.json({
      correct,
      totalQuestions,
      unanswered, 
      wrong
  });
});

app.get('/result', (req, res) => {
  const { correct, totalQuestions, unanswered, wrong } = req.query;
  console.log('get result', correct, totalQuestions, unanswered, wrong);
  res.render('result', {
      correct,
      totalQuestions,
      unanswered, 
      wrong
  });
});

//Get Login 
app.get('/login', forwardAuthenticated, (req, res)=>{
    res.render('login'); 
}); 
//Get Register 
app.get('/register', forwardAuthenticated, (req, res)=>{
    res.render('register'); 
}); 
//Post Register
app.post('/register',  (req, res) => {
    console.log('req.body', req.body);
    const { username, email, password, confirmPassword } =  req.body;
    let errors = [];
  
    if (!username || !email || !password || !confirmPassword) {
      errors.push({ msg: 'Please enter all fields' });
    }
  
    if (password != confirmPassword) {
      errors.push({ msg: 'Passwords do not match' });
    }
  
    if (password.length < 6) {
      errors.push({ msg: 'Password must be at least 6 characters' });
    }
  
    if (errors.length > 0) {
      res.render('register', {
        errors,
        username,
        email,
        password,
        confirmPassword
      });
    } else {
      User.findOne({ email: email }).then(user => {
        if (user) {
          errors.push({ msg: 'Email already exists' });
          res.render('register', {
            errors,
            username,
            email,
            password,
            confirmPassword
          });
        } else {
          const newUser = new User({
            username,
            email,
            password
          });
  
          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(newUser.password, salt, (err, hash) => {
              if (err) throw err;
              newUser.password = hash;
              newUser
                .save()
                .then(user => {
                  req.flash(
                    'success_msg',
                    'You are now registered. Please Login.'
                  );
                  res.redirect('/login');
                })
                .catch(err => console.log(err));
            });
          });
            console.log('newUser', newUser); 
        }
      });
    }
  });
  
//Post Login 
app.post('/login', (req, res, next) => {
    console.log('req.body', req.body);
    passport.authenticate('local', {
      successRedirect: '/dashboard',
      failureRedirect: '/login',
      failureFlash: true
    })(req, res, next);
  });

//Get Dashboard
app.get('/dashboard', ensureAuthenticated, (req, res)=>{
    res.render('dashboard'); 
})
  
app.get('/login',forwardAuthenticated , (req, res) =>{
    res.render('login');
});
// Logout
app.get('/logout', (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      req.flash('success_msg', 'You are logged out');
      res.redirect('/login');
    });
  });
  


const PORT = process.env.PORT || 3000; 

app.listen(PORT, console.log(`Server is running on PORT ${PORT}`));   