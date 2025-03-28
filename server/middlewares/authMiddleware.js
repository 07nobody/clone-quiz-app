const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const rateLimit = require('express-rate-limit');

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    message: "Too many requests from this IP, please try again later.",
    success: false
  },
  standardHeaders: true,
  legacyHeaders: false
});

const authMiddleware = async (req, res, next) => {
  console.log("authMiddleware: Executing");
  try {
    // Get token from header
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: "Authentication token is missing",
        success: false
      });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token
      const user = await User.findById(decoded.userId)
        .select("+accountLocked +accountLockedUntil");
      
      if (!user) {
        return res.status(401).json({
          message: "User not found",
          success: false
        });
      }

      // Check if account is locked
      if (user.accountLocked) {
        if (user.accountLockedUntil > new Date()) {
          const remainingTime = Math.ceil((user.accountLockedUntil - new Date()) / (60 * 1000));
          return res.status(403).json({
            message: `Account is locked. Try again in ${remainingTime} minutes.`,
            success: false,
            accountLocked: true,
            lockExpiry: user.accountLockedUntil
          });
        } else {
          // Reset lock if lockout period has expired
          user.accountLocked = false;
          user.accountLockedUntil = null;
          await user.save();
        }
      }

      // Add user info to request
      req.userId = decoded.userId;
      req.isAdmin = decoded.isAdmin;
      
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          message: "Token has expired",
          success: false,
          tokenExpired: true
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          message: "Invalid token",
          success: false
        });
      }
      
      throw error;
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({
      message: "Internal server error",
      success: false
    });
  }
};

// Admin middleware
const adminMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user?.isAdmin) {
      return res.status(403).json({
        message: "Access denied. Admin privileges required.",
        success: false
      });
    }
    
    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    res.status(500).json({
      message: "Internal server error",
      success: false
    });
  }
};

// Rate limiting middleware
const customRateLimit = (maxRequests, timeWindow) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    
    // Clean up old entries
    if (requests.has(ip)) {
      const userRequests = requests.get(ip);
      const validRequests = userRequests.filter(time => now - time < timeWindow);
      
      if (validRequests.length >= maxRequests) {
        return res.status(429).json({
          message: "Too many requests. Please try again later.",
          success: false
        });
      }
      
      requests.set(ip, [...validRequests, now]);
    } else {
      requests.set(ip, [now]);
    }
    
    next();
  };
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  customRateLimit
};
