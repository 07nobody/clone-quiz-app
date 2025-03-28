const router = require("express").Router();
const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { rateLimit } = require('express-rate-limit');
const nodemailer = require('nodemailer');
const crypto = require("crypto");
const Joi = require("joi");
const { checkSchema } = require('express-validator');
const { validateRequest, sanitizeData, userValidation } = require("../middlewares/validationMiddleware");

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20 // Increased limit from 5 to 20 requests per windowMs for auth endpoints during development
});

// Validation schemas
const registerSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  otp: Joi.string().optional(), // Allow optional 'otp' field
});

// Generate tokens function
const generateTokens = (userId) => {
  // Create access token (short-lived)
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: "15m" } // Shorter expiration for better security
  );
  
  // Create refresh token (long-lived)
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET + userId, // Adding userId to make token revocation easier
    { expiresIn: "7d" }
  );
  
  return { accessToken, refreshToken };
};

// Create JWT tokens
const createTokens = (user) => {
  // Create access token (short-lived)
  const accessToken = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
  
  // Create refresh token (long-lived)
  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET + user._id.toString(),
    { expiresIn: "7d" }
  );
  
  return { accessToken, refreshToken };
};

// Validate refresh token
const validateRefreshToken = (token, userId) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET + userId);
  } catch (error) {
    return null;
  }
};

// user registration
router.post(
  "/register",
  sanitizeData,
  checkSchema(userValidation),
  validateRequest,
  async (req, res) => {
    try {
      // Check if user already exists
      const userExists = await User.findOne({ email: req.body.email });
      if (userExists) {
        return res.status(400).send({
          message: "User already exists",
          success: false,
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(req.body.password, salt);
      req.body.password = hashedPassword;

      // Create user
      const user = new User(req.body);
      await user.save();
      
      res.send({
        message: "User created successfully",
        success: true,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).send({
        message: error.message || "Error creating user",
        success: false,
      });
    }
  }
);

// user login
router.post("/login", sanitizeData, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(400).send({
        message: "Invalid email or password",
        success: false,
      });
    }

    // Check password
    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!validPassword) {
      return res.status(400).send({
        message: "Invalid email or password",
        success: false,
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    res.send({
      message: "Login successful",
      success: true,
      data: {
        accessToken,
        refreshToken,
        id: user._id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).send({
      message: error.message || "Error during login",
      success: false,
    });
  }
});

// New endpoint for refreshing tokens
router.post("/refresh-token", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        message: "Refresh token is required",
        success: false,
      });
    }
    
    // Validate refresh token
    const decoded = validateRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({
        message: "Invalid refresh token",
        success: false
      });
    }

    // Find user and verify refresh token matches
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken || 
        !user.refreshTokenExpiry || new Date() > user.refreshTokenExpiry) {
      return res.status(401).json({
        message: "Invalid refresh token",
        success: false
      });
    }

    // Generate new tokens
    const tokens = createTokens(user);

    // Update refresh token in database
    user.refreshToken = tokens.refreshToken;
    user.refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    // Set refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
      message: "Token refresh successful",
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).send({
      message: "Error refreshing token",
      success: false
    });
  }
});

// Logout endpoint
router.post("/logout", authMiddleware, async (req, res) => {
  try {
    // Get user ID from authenticated request
    const userId = req.body.userId;
    
    // Update user to clear refresh token
    await User.findByIdAndUpdate(userId, { refreshToken: null });
    
    res.status(200).json({
      message: "Logged out successfully",
      success: true,
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      message: "Error logging out",
      error: error.message,
      success: false,
    });
  }
});

// get user info - supporting both GET and POST methods
router.post("/get-user-info", authMiddleware, async (req, res) => {
  try {
    // Use req.userId from authMiddleware instead of req.body.userId
    const user = await User.findById(req.userId).select("-password");
    
    if (!user) {
      return res.status(404).send({
        message: "User not found",
        success: false,
      });
    }
    
    res.send({
      message: "User info fetched successfully",
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get user info error:", error);
    res.status(500).send({
      message: error.message || "Error fetching user info",
      success: false,
    });
  }
});

// Configure nodemailer transport
const transportConfig = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};

// Create reusable transporter
const transporter = nodemailer.createTransport(transportConfig);

// Send email function
async function sendEmail(email, otp) {
  const mailOptions = {
    from: `"Quiz App" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Password Reset OTP",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0F3460;">Quiz App Password Reset</h2>
        <p>Your OTP for password reset is:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
          <strong>${otp}</strong>
        </div>
        <p>This OTP will expire in 10 minutes.</p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          If you didn't request this password reset, please ignore this email.
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new Error("Failed to send email");
  }
}

// Updated forgot-password route
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    const otpExpiry = Date.now() + 600000; // 10 minutes expiry

    user.otp = hashedOtp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP email
    await sendEmail(email, otp);

    res.status(200).json({
      message: "OTP sent to your email",
      success: true,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      message: "Error sending OTP",
      success: false,
    });
  }
});

// Verify hashed OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    if (user.otp !== hashedOtp || user.otpExpiry < Date.now()) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
        success: false,
      });
    }

    // OTP is valid, clear it from the database
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({
      message: "OTP verified successfully",
      success: true,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({
      message: "Error verifying OTP",
      success: false,
    });
  }
});

// Reset password
router.post("/reset-password", async (req, res) => {
  try {
    console.log("Reset password request body:", req.body);
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({
        message: "Email and new password are required",
        success: false,
      });
    }
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    console.log("User found:", user);
    console.log("Attempting to update password for:", email);

    try {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      await user.save();
      console.log("Password updated successfully for:", email);
    } catch (error) {
      console.error("Error updating password:", error);
      return res.status(500).json({
        message: "Error updating password",
        success: false,
      });
    }
    
    // Clear any reset tokens and OTPs
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    user.otp = undefined;
    user.otpExpiry = undefined;
    
    await user.save();

    res.status(200).json({
      message: "Password reset successful",
      success: true,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      message: "Error resetting password",
      success: false,
    });
  }
});

module.exports = router;
