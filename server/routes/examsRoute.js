const router = require("express").Router();
const Exam = require("../models/examModel");
const Question = require("../models/questionModel");
const Report = require("../models/reportModel");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { validateExam, validateQuestion, validate, sanitizeData } = require("../middlewares/validationMiddleware");

// Add exam
router.post("/add", [authMiddleware, sanitizeData, ...validateExam, validate], async (req, res) => {
  console.log("/add route: Executing");
  try {
    // Check if user is admin
    if (req.body.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can add exams",
      });
    }

    const examExists = await Exam.findOne({ name: req.body.name });
    if (examExists) {
      return res.status(400).json({
        success: false,
        message: "Exam already exists",
      });
    }

    const newExam = new Exam({
      ...req.body,
      questions: [],
    });

    await newExam.save();
    res.send({
      success: true,
      message: "Exam added successfully",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

// Get all exams
router.post("/get-all-exams", authMiddleware, async (req, res) => {
  try {
    const exams = await Exam.find({});
    res.send({
      success: true,
      data: exams,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

// Get exam by id
router.post("/get-exam-by-id", authMiddleware, async (req, res) => {
  try {
    const exam = await Exam.findById(req.body.examId).populate("questions");
    if (!exam) {
      return res.status(404).send({
        success: false,
        message: "Exam not found",
      });
    }
    res.send({
      success: true,
      data: exam,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

// Edit exam by id
router.post("/edit-exam-by-id", [authMiddleware, sanitizeData, ...validateExam, validate], async (req, res) => {
  try {
    if (req.body.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can edit exams",
      });
    }

    const exam = await Exam.findById(req.body.examId);
    if (!exam) {
      return res.status(404).send({
        success: false,
        message: "Exam not found",
      });
    }

    // Check if exam name already exists (excluding current exam)
    const examExists = await Exam.findOne({
      name: req.body.name,
      _id: { $ne: req.body.examId },
    });
    if (examExists) {
      return res.status(400).json({
        success: false,
        message: "Exam with this name already exists",
      });
    }

    await Exam.findByIdAndUpdate(req.body.examId, req.body);
    res.send({
      success: true,
      message: "Exam edited successfully",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

// Delete exam by id
router.post("/delete-exam-by-id", authMiddleware, async (req, res) => {
  try {
    if (req.body.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete exams",
      });
    }

    const exam = await Exam.findById(req.body.examId);
    if (!exam) {
      return res.status(404).send({
        success: false,
        message: "Exam not found",
      });
    }

    // Delete all questions and reports associated with this exam
    await Question.deleteMany({ exam: req.body.examId });
    await Report.deleteMany({ exam: req.body.examId });
    await Exam.findByIdAndDelete(req.body.examId);

    res.send({
      success: true,
      message: "Exam deleted successfully",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

// Add question to exam
router.post("/add-question-to-exam", [authMiddleware, sanitizeData, ...validateQuestion, validate], async (req, res) => {
  try {
    if (req.body.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can add questions",
      });
    }

    // Create a new question
    const newQuestion = new Question(req.body);
    const savedQuestion = await newQuestion.save();

    // Add question to exam
    const exam = await Exam.findById(req.body.exam);
    if (!exam) {
      return res.status(404).send({
        success: false,
        message: "Exam not found",
      });
    }

    exam.questions.push(savedQuestion._id);
    exam.totalMarks = exam.totalMarks + Number(req.body.marks);
    await exam.save();

    res.send({
      success: true,
      message: "Question added successfully",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

// Edit question in exam
router.post("/edit-question-in-exam", [authMiddleware, sanitizeData, ...validateQuestion, validate], async (req, res) => {
  try {
    if (req.body.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can edit questions",
      });
    }

    // Get old question marks
    const oldQuestion = await Question.findById(req.body.questionId);
    if (!oldQuestion) {
      return res.status(404).send({
        success: false,
        message: "Question not found",
      });
    }

    // Update question
    await Question.findByIdAndUpdate(req.body.questionId, req.body);

    // Update exam total marks
    const exam = await Exam.findById(req.body.exam);
    if (!exam) {
      return res.status(404).send({
        success: false,
        message: "Exam not found",
      });
    }

    exam.totalMarks = exam.totalMarks - oldQuestion.marks + Number(req.body.marks);
    await exam.save();

    res.send({
      success: true,
      message: "Question edited successfully",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

// Delete question in exam
router.post("/delete-question-in-exam", authMiddleware, async (req, res) => {
  try {
    if (req.body.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete questions",
      });
    }

    // Delete question
    const question = await Question.findById(req.body.questionId);
    if (!question) {
      return res.status(404).send({
        success: false,
        message: "Question not found",
      });
    }

    // Update exam
    const exam = await Exam.findById(question.exam);
    if (!exam) {
      return res.status(404).send({
        success: false,
        message: "Exam not found",
      });
    }

    exam.questions = exam.questions.filter(
      (qId) => qId.toString() !== req.body.questionId
    );
    exam.totalMarks = exam.totalMarks - question.marks;

    await exam.save();
    await Question.findByIdAndDelete(req.body.questionId);

    res.send({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
