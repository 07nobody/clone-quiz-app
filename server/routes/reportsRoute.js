const { authMiddleware } = require("../middlewares/authMiddleware");
const Exam = require("../models/examModel");
const User = require("../models/userModel");
const Report = require("../models/reportModel");
const router = require("express").Router();
const mongoose = require("mongoose");
const { checkSchema } = require('express-validator');
const { validateRequest, validateReport } = require("../middlewares/validationMiddleware");

// add report with validation
router.post("/add-report", 
  authMiddleware,
  validateReport,
  validateRequest,
  async (req, res) => {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const newReport = new Report(req.body);
        await newReport.save({ session });
      });

      res.send({
        message: "Report added successfully",
        success: true,
      });
    } catch (error) {
      console.error("Error in add-report:", error);
      res.status(500).send({
        message: error.message || "Error adding report",
        success: false
      });
    } finally {
      session.endSession();
    }
});

// get all reports with pagination and filters
router.post("/get-all-reports", authMiddleware, async (req, res) => {
  try {
    const { examName, userName, page = 1, limit = 10 } = req.body;
    const query = {};

    // Build filter query
    if (examName) {
      query['exam.name'] = new RegExp(examName, 'i');
    }
    if (userName) {
      query['user.name'] = new RegExp(userName, 'i');
    }

    const skip = (page - 1) * limit;

    const reports = await Report.find(query)
      .populate("exam")
      .populate("user", "-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Report.countDocuments(query);
      
    res.send({
      message: "Reports fetched successfully",
      success: true,
      data: reports,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error in get-all-reports:", error);
    res.status(500).send({
      message: error.message || "Error fetching reports",
      success: false
    });
  }
});

// get all reports by user with pagination
router.post("/get-reports-by-user", authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.body;
    const skip = (page - 1) * limit;

    const reports = await Report.find({ user: req.userId })
      .populate("exam")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Report.countDocuments({ user: req.userId });
      
    res.send({
      message: "Reports fetched successfully",
      success: true,
      data: reports,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error in get-reports-by-user:", error);
    res.status(500).send({
      message: error.message || "Error fetching user reports",
      success: false
    });
  }
});

module.exports = router;
