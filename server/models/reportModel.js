const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'questions',
    required: true
  },
  selectedOption: {
    type: String,
    required: true
  },
  isCorrect: {
    type: Boolean,
    required: true
  },
  marks: {
    type: Number,
    required: true,
    min: 0
  },
  timeSpent: {
    type: Number,
    required: true,
    min: 0
  }
});

const reportSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'exams',
      required: [true, 'Exam ID is required'],
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: [true, 'User ID is required'],
      index: true
    },
    result: {
      correctAnswers: [answerSchema],
      wrongAnswers: [answerSchema],
      skippedAnswers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'questions'
      }],
      verdict: {
        type: String,
        enum: ['Pass', 'Fail'],
        required: true
      },
      percentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
      },
      timeTaken: {
        type: Number,
        required: true,
        min: 0
      }
    },
    attemptNumber: {
      type: Number,
      required: true,
      min: 1
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true,
      validate: {
        validator: function(value) {
          return value > this.startTime;
        },
        message: 'End time must be after start time'
      }
    },
    ipAddress: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index for user and exam combination
reportSchema.index({ user: 1, exam: 1, attemptNumber: 1 }, { unique: true });

// Virtual for total score
reportSchema.virtual('totalScore').get(function() {
  return this.result.correctAnswers.reduce((total, ans) => total + ans.marks, 0);
});

// Virtual for total questions
reportSchema.virtual('totalQuestions').get(function() {
  return (
    this.result.correctAnswers.length +
    this.result.wrongAnswers.length +
    this.result.skippedAnswers.length
  );
});

// Pre-save middleware for validation
reportSchema.pre('save', async function(next) {
  try {
    // Validate attempt number
    if (this.isNew) {
      const attemptCount = await this.constructor.countDocuments({
        user: this.user,
        exam: this.exam
      });
      
      const exam = await mongoose.model('exams').findById(this.exam);
      if (!exam) {
        throw new Error('Exam not found');
      }
      
      if (attemptCount >= exam.maxAttempts) {
        throw new Error('Maximum attempts reached for this exam');
      }
      
      this.attemptNumber = attemptCount + 1;
    }

    // Validate answers
    if (this.isModified('result')) {
      // Ensure no duplicate questions in answers
      const allQuestionIds = [
        ...this.result.correctAnswers.map(a => a.question.toString()),
        ...this.result.wrongAnswers.map(a => a.question.toString()),
        ...this.result.skippedAnswers.map(q => q.toString())
      ];
      
      const uniqueQuestionIds = new Set(allQuestionIds);
      if (uniqueQuestionIds.size !== allQuestionIds.length) {
        throw new Error('Duplicate questions found in report');
      }

      // Calculate percentage
      const totalMarks = this.result.correctAnswers.reduce((sum, ans) => sum + ans.marks, 0);
      const exam = await mongoose.model('exams').findById(this.exam);
      if (!exam) {
        throw new Error('Exam not found');
      }
      
      this.result.percentage = (totalMarks / exam.totalMarks) * 100;
      
      // Validate verdict based on passing marks
      this.result.verdict = totalMarks >= exam.passingMarks ? 'Pass' : 'Fail';
    }

    next();
  } catch (error) {
    next(error);
  }
});

const Report = mongoose.model('reports', reportSchema);
module.exports = Report;