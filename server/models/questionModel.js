const mongoose = require('mongoose');
const xss = require('xss');

const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Option text is required'],
    trim: true,
    minlength: [1, 'Option text cannot be empty'],
    maxlength: [500, 'Option text cannot exceed 500 characters'],
    set: value => xss(value) // Sanitize option text
  }
});

const questionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      minlength: [3, 'Question must be at least 3 characters'],
      maxlength: [1000, 'Question cannot exceed 1000 characters'],
      set: value => xss(value) // Sanitize question text
    },
    correctOption: {
      type: String,
      required: [true, 'Correct option is required'],
      validate: {
        validator: function(value) {
          return this.options && Object.keys(this.options).includes(value);
        },
        message: 'Correct option must be one of the provided options'
      }
    },
    options: {
      type: Map,
      of: optionSchema,
      required: [true, 'Options are required'],
      validate: {
        validator: function(value) {
          // Check minimum number of options
          if (!value || value.size < 2) {
            return false;
          }
          // Check maximum number of options
          if (value.size > 6) {
            return false;
          }
          // Validate each option
          for (let [key, option] of value.entries()) {
            if (!option.text || option.text.trim().length === 0) {
              return false;
            }
          }
          return true;
        },
        message: 'Questions must have between 2 and 6 valid options'
      }
    },
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'exams',
      required: [true, 'Exam ID is required'],
      index: true
    },
    explanation: {
      type: String,
      trim: true,
      maxlength: [1000, 'Explanation cannot exceed 1000 characters'],
      set: value => value ? xss(value) : value // Sanitize explanation if present
    },
    marks: {
      type: Number,
      required: [true, 'Marks are required'],
      min: [0, 'Marks cannot be negative'],
      max: [100, 'Marks cannot exceed 100 per question']
    },
    difficulty: {
      type: String,
      enum: {
        values: ['Easy', 'Medium', 'Hard'],
        message: 'Difficulty must be Easy, Medium, or Hard'
      },
      default: 'Medium'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Add compound index for exam and question combinations
questionSchema.index({ exam: 1, name: 1 }, { unique: true });

// Method to check if an answer is correct
questionSchema.methods.checkAnswer = function(answer) {
  return answer === this.correctOption;
};

// Method to get sanitized options for display
questionSchema.methods.getSanitizedOptions = function() {
  const sanitizedOptions = {};
  for (let [key, option] of this.options.entries()) {
    sanitizedOptions[key] = {
      text: xss(option.text)
    };
  }
  return sanitizedOptions;
};

// Pre-save middleware to ensure option consistency
questionSchema.pre('save', function(next) {
  if (this.isModified('options') || this.isModified('correctOption')) {
    // Ensure correctOption exists in options
    if (!this.options.has(this.correctOption)) {
      next(new Error('Correct option must be one of the provided options'));
      return;
    }

    // Validate option count
    if (this.options.size < 2 || this.options.size > 6) {
      next(new Error('Questions must have between 2 and 6 options'));
      return;
    }
  }
  next();
});

// Pre-remove middleware to update exam
questionSchema.pre('remove', async function(next) {
  try {
    // Remove this question from the exam's questions array
    await mongoose.model('exams').updateOne(
      { _id: this.exam },
      { $pull: { questions: this._id } }
    );
    next();
  } catch (error) {
    next(error);
  }
});

const Question = mongoose.model('questions', questionSchema);
module.exports = Question;
