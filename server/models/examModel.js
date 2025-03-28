const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Exam name is required'],
      trim: true,
      minlength: [2, 'Exam name must be at least 2 characters'],
      maxlength: [100, 'Exam name cannot exceed 100 characters']
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [1, 'Duration must be at least 1 minute'],
      max: [180, 'Duration cannot exceed 180 minutes']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      minlength: [2, 'Category must be at least 2 characters'],
      maxlength: [50, 'Category cannot exceed 50 characters']
    },
    totalMarks: {
      type: Number,
      required: [true, 'Total marks is required'],
      min: [1, 'Total marks must be at least 1'],
      max: [1000, 'Total marks cannot exceed 1000']
    },
    passingMarks: {
      type: Number,
      required: [true, 'Passing marks is required'],
      min: [0, 'Passing marks cannot be negative'],
      validate: {
        validator: function(value) {
          return value <= this.totalMarks;
        },
        message: 'Passing marks cannot exceed total marks'
      }
    },
    questions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'questions',
      required: true
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: [true, 'Creator ID is required']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      validate: {
        validator: function(value) {
          return !value || value > this.startDate;
        },
        message: 'End date must be after start date'
      }
    },
    maxAttempts: {
      type: Number,
      default: 1,
      min: [1, 'Maximum attempts must be at least 1'],
      max: [10, 'Maximum attempts cannot exceed 10']
    },
    shuffleQuestions: {
      type: Boolean,
      default: true
    },
    showResults: {
      type: Boolean,
      default: true
    },
    accessCode: {
      type: String,
      trim: true,
      sparse: true,
      validate: {
        validator: function(value) {
          return !value || value.length >= 6;
        },
        message: 'Access code must be at least 6 characters'
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Add indexes for common queries
examSchema.index({ category: 1 });
examSchema.index({ createdBy: 1 });
examSchema.index({ isActive: 1 });

// Virtual for the number of questions
examSchema.virtual('questionCount').get(function() {
  return this.questions ? this.questions.length : 0;
});

// Method to check if exam is available
examSchema.methods.isAvailable = function() {
  if (!this.isActive) return false;
  
  const now = new Date();
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  
  return true;
};

// Method to validate access code
examSchema.methods.validateAccessCode = function(code) {
  return !this.accessCode || this.accessCode === code;
};

// Pre-save middleware to ensure consistency
examSchema.pre('save', async function(next) {
  if (this.isModified('questions')) {
    // Ensure unique questions
    this.questions = [...new Set(this.questions)];
  }
  
  if (this.endDate && this.endDate <= this.startDate) {
    throw new Error('End date must be after start date');
  }
  
  next();
});

// Pre-remove middleware to cleanup related data
examSchema.pre('remove', async function(next) {
  // Remove all questions associated with this exam
  await mongoose.model('questions').deleteMany({ exam: this._id });
  // Remove all reports associated with this exam
  await mongoose.model('reports').deleteMany({ exam: this._id });
  next();
});

const Exam = mongoose.model('exams', examSchema);
module.exports = Exam;
