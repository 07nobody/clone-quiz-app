import React, { useEffect, useState } from "react";
import { Modal, Form, message, Input, InputNumber, Select } from "antd";
import { useDispatch } from "react-redux";
import { HideLoading, ShowLoading } from "../../../redux/loaderSlice";
import { addQuestionToExam, editQuestionById } from "../../../apicalls/exams";

const { TextArea } = Input;
const { Option } = Select;

function AddEditQuestion({
  showAddEditQuestionModal,
  setShowAddEditQuestionModal,
  refreshData,
  examId,
  selectedQuestion,
  setSelectedQuestion,
}) {
  const dispatch = useDispatch();
  const [validationErrors, setValidationErrors] = useState({});
  const [questionData, setQuestionData] = useState({
    name: "",
    correctOption: "",
    options: {},
    explanation: "",
    marks: 1,
    difficulty: "Medium"
  });

  useEffect(() => {
    if (selectedQuestion) {
      setQuestionData(selectedQuestion);
    }
  }, [selectedQuestion]);

  const validateForm = () => {
    const errors = {};

    // Question text validation
    if (!questionData.name) {
      errors.name = "Question text is required";
    } else if (questionData.name.length < 3 || questionData.name.length > 1000) {
      errors.name = "Question must be between 3 and 1000 characters";
    }

    // Options validation
    const optionsCount = Object.keys(questionData.options).length;
    if (optionsCount < 2) {
      errors.options = "At least 2 options are required";
    } else if (optionsCount > 6) {
      errors.options = "Maximum 6 options are allowed";
    }

    // Check each option's text
    Object.entries(questionData.options).forEach(([key, option]) => {
      if (!option.text || option.text.trim().length === 0) {
        errors[`option_${key}`] = "Option text cannot be empty";
      } else if (option.text.length > 500) {
        errors[`option_${key}`] = "Option text cannot exceed 500 characters";
      }
    });

    // Correct option validation
    if (!questionData.correctOption) {
      errors.correctOption = "Correct option is required";
    } else if (!questionData.options[questionData.correctOption]) {
      errors.correctOption = "Correct option must be one of the provided options";
    }

    // Marks validation
    if (!questionData.marks) {
      errors.marks = "Marks are required";
    } else if (questionData.marks < 0 || questionData.marks > 100) {
      errors.marks = "Marks must be between 0 and 100";
    }

    // Explanation validation (optional)
    if (questionData.explanation && questionData.explanation.length > 1000) {
      errors.explanation = "Explanation cannot exceed 1000 characters";
    }

    // Difficulty validation
    if (!["Easy", "Medium", "Hard"].includes(questionData.difficulty)) {
      errors.difficulty = "Invalid difficulty level";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddOption = () => {
    const optionsCount = Object.keys(questionData.options).length;
    if (optionsCount >= 6) {
      message.error("Maximum 6 options are allowed");
      return;
    }

    const nextKey = String.fromCharCode(65 + optionsCount); // A, B, C, D...
    setQuestionData({
      ...questionData,
      options: {
        ...questionData.options,
        [nextKey]: { text: "" }
      }
    });
  };

  const handleRemoveOption = (key) => {
    const newOptions = { ...questionData.options };
    delete newOptions[key];

    // Reorder remaining options
    const reorderedOptions = {};
    Object.values(newOptions).forEach((option, index) => {
      const newKey = String.fromCharCode(65 + index);
      reorderedOptions[newKey] = option;
    });

    // Update correct option if it was removed
    const newCorrectOption = questionData.correctOption === key ? "" : questionData.correctOption;

    setQuestionData({
      ...questionData,
      options: reorderedOptions,
      correctOption: newCorrectOption
    });
  };

  const onFinish = async () => {
    if (!validateForm()) {
      message.error("Please fix the validation errors");
      return;
    }

    try {
      dispatch(ShowLoading());
      let response;

      const payload = {
        name: questionData.name,
        correctOption: questionData.correctOption,
        options: questionData.options,
        explanation: questionData.explanation,
        marks: questionData.marks,
        difficulty: questionData.difficulty,
        exam: examId,
      };

      if (selectedQuestion) {
        response = await editQuestionById({
          ...payload,
          questionId: selectedQuestion._id,
        });
      } else {
        response = await addQuestionToExam(payload);
      }

      if (response.success) {
        message.success(response.message);
        refreshData();
        setShowAddEditQuestionModal(false);
        setSelectedQuestion(null);
        setQuestionData({
          name: "",
          correctOption: "",
          options: {},
          explanation: "",
          marks: 1,
          difficulty: "Medium"
        });
      } else {
        message.error(response.message);
      }

      dispatch(HideLoading());
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  return (
    <Modal
      title={selectedQuestion ? "Edit Question" : "Add Question"}
      visible={showAddEditQuestionModal}
      onCancel={() => {
        setShowAddEditQuestionModal(false);
        setSelectedQuestion(null);
      }}
      width={800}
      onOk={onFinish}
      okText="Save"
    >
      <Form layout="vertical">
        <Form.Item
          label="Question"
          validateStatus={validationErrors.name ? "error" : ""}
          help={validationErrors.name}
        >
          <TextArea
            rows={4}
            value={questionData.name}
            onChange={(e) => setQuestionData({ ...questionData, name: e.target.value })}
            placeholder="Enter question text"
          />
        </Form.Item>

        <div className="flex justify-end mb-2">
          <button
            type="button"
            className="primary-outlined-btn"
            onClick={handleAddOption}
          >
            Add Option
          </button>
        </div>

        {Object.entries(questionData.options).map(([key, option]) => (
          <Form.Item
            key={key}
            label={`Option ${key}`}
            validateStatus={validationErrors[`option_${key}`] ? "error" : ""}
            help={validationErrors[`option_${key}`]}
          >
            <div className="flex gap-2">
              <Input
                value={option.text}
                onChange={(e) =>
                  setQuestionData({
                    ...questionData,
                    options: {
                      ...questionData.options,
                      [key]: { text: e.target.value }
                    }
                  })
                }
                placeholder={`Enter option ${key}`}
              />
              <button
                type="button"
                className="primary-outlined-btn"
                onClick={() => handleRemoveOption(key)}
              >
                Remove
              </button>
            </div>
          </Form.Item>
        ))}

        <Form.Item
          label="Correct Option"
          validateStatus={validationErrors.correctOption ? "error" : ""}
          help={validationErrors.correctOption}
        >
          <Select
            value={questionData.correctOption}
            onChange={(value) => setQuestionData({ ...questionData, correctOption: value })}
            placeholder="Select correct option"
          >
            {Object.keys(questionData.options).map((key) => (
              <Option key={key} value={key}>
                Option {key}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <div className="flex gap-3">
          <Form.Item
            label="Marks"
            validateStatus={validationErrors.marks ? "error" : ""}
            help={validationErrors.marks}
          >
            <InputNumber
              value={questionData.marks}
              onChange={(value) => setQuestionData({ ...questionData, marks: value })}
              min={0}
              max={100}
            />
          </Form.Item>

          <Form.Item
            label="Difficulty"
            validateStatus={validationErrors.difficulty ? "error" : ""}
            help={validationErrors.difficulty}
          >
            <Select
              value={questionData.difficulty}
              onChange={(value) => setQuestionData({ ...questionData, difficulty: value })}
            >
              <Option value="Easy">Easy</Option>
              <Option value="Medium">Medium</Option>
              <Option value="Hard">Hard</Option>
            </Select>
          </Form.Item>
        </div>

        <Form.Item
          label="Explanation (Optional)"
          validateStatus={validationErrors.explanation ? "error" : ""}
          help={validationErrors.explanation}
        >
          <TextArea
            rows={3}
            value={questionData.explanation}
            onChange={(e) => setQuestionData({ ...questionData, explanation: e.target.value })}
            placeholder="Enter explanation for the correct answer"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default AddEditQuestion;
