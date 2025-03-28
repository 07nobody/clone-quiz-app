const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long']
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    refreshToken: {
      type: String,
      select: false
    },
    refreshTokenExpiry: {
      type: Date,
      select: false
    },
    otp: {
      type: String,
      select: false
    },
    otpExpiry: {
      type: Date,
      select: false
    },
    passwordResetAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    lastPasswordReset: {
      type: Date,
      select: false
    },
    loginAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    lastLoginAttempt: {
      type: Date,
      select: false
    },
    accountLocked: {
      type: Boolean,
      default: false
    },
    accountLockedUntil: {
      type: Date,
      select: false
    }
  },
  {
    timestamps: true
  }
);

// Pre-save middleware to validate password complexity
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    // Validate password complexity
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
    if (!passwordRegex.test(this.password)) {
      throw new Error('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Method to check if password reset is allowed
userSchema.methods.canResetPassword = function() {
  const MAX_DAILY_ATTEMPTS = 3;
  const LOCKOUT_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  if (this.lastPasswordReset && 
      Date.now() - this.lastPasswordReset.getTime() < LOCKOUT_DURATION) {
    if (this.passwordResetAttempts >= MAX_DAILY_ATTEMPTS) {
      return false;
    }
  } else {
    // Reset counter if 24 hours have passed
    this.passwordResetAttempts = 0;
  }
  return true;
};

// Method to check if login is allowed
userSchema.methods.canLogin = function() {
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

  if (this.accountLocked && this.accountLockedUntil > new Date()) {
    return false;
  }

  if (this.lastLoginAttempt && 
      Date.now() - this.lastLoginAttempt.getTime() < LOCKOUT_DURATION) {
    if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      this.accountLocked = true;
      this.accountLockedUntil = new Date(Date.now() + LOCKOUT_DURATION);
      return false;
    }
  } else {
    // Reset counter if lockout duration has passed
    this.loginAttempts = 0;
  }
  return true;
};

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to increment login attempts
userSchema.methods.incrementLoginAttempts = async function() {
  this.loginAttempts = (this.loginAttempts || 0) + 1;
  this.lastLoginAttempt = new Date();
  await this.save();
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = async function() {
  this.loginAttempts = 0;
  this.lastLoginAttempt = null;
  this.accountLocked = false;
  this.accountLockedUntil = null;
  await this.save();
};

const User = mongoose.model('users', userSchema);
module.exports = User;
