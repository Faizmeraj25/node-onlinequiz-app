const express = require('express'); 
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose')
const Quiz = require('./models/quiz')
const bodyParser = require('body-parser'); 
const session = require('express-session'); 
const flash = require('connect-flash'); 
const app = express(); 

const dB = require('./config/keys').mongoURI;
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
    next();
  });


//Routers
app.get('/', (req, res)=>{
    res.render('welcome'); 
})

app.get('/create-quiz', (req, res)=>{
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
app.get('/quizzes', async (req, res)=>{
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
app.get('/quizzes/:id', async (req, res) => {
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
const PORT = process.env.PORT || 3000; 

app.listen(PORT, console.log(`Server is running on PORT ${PORT}`));   