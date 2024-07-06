const mongoose = require('mongoose');

// Option Schema
const optionSchema = new mongoose.Schema({
    optionText: {
        type: String,
        required: true
    }
});

// Question Schema
const questionSchema = new mongoose.Schema({
    questionText: {
        type: String,
        required: true
    },
    options: {
        type: [optionSchema],
        validate: {
            validator: function(v) {
                return v.length === 4;
            },
        },
        required: true
    },
    correctOption: {
        type: Number,
        min: 1,
        max: 4,
        required: true
    }
});

// Quiz Schema
const quizSchema = new mongoose.Schema({
    quizName: {
        type: String,
        required: true
    },
    numberOfQuestions: {
        type: Number,
        required: true
    },
    questions: {
        type: [questionSchema],
        validate: {
            validator: function(v) {
                return v.length === this.numberOfQuestions;
            },
            message: props => `Number of questions does not match the provided number ${props.value}`
        },
        required: true
    }
});

// Create Quiz Model
const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;
