import React, { useEffect, useState } from "react";
import PageTitle from "../../../components/PageTitle";
import { useNavigate, useParams } from "react-router-dom";
import { message, Table, Form, Input, InputNumber, DatePicker, Switch } from "antd";
import { useDispatch } from "react-redux";
import { HideLoading, ShowLoading } from "../../../redux/loaderSlice";
import { addExam, updateExam, deleteQuestionById, getExamById } from "../../../apicalls/exams";
import moment from "moment";
import AddEditQuestion from "./AddEditQuestion";

function AddEditExam() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [examData, setExamData] = useState({
    name: "",
    duration: 60,
    category: "",
    totalMarks: "",
    passingMarks: "",
    questions: [],
    startDate: moment().format("YYYY-MM-DD"),
    endDate: moment().add(7, 'days').format("YYYY-MM-DD"),
    maxAttempts: 1,
    shuffleQuestions: true,
    showResults: true,
    accessCode: ""
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [showAddEditQuestionModal, setShowAddEditQuestionModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const params = useParams();

  const validateForm = () => {
    const errors = {};
    
    // Name validation
    if (!examData.name) {
      errors.name = "Name is required";
    } else if (examData.name.length < 2 || examData.name.length > 100) {
      errors.name = "Name must be between 2 and 100 characters";
    }

    // Duration validation
    if (!examData.duration) {
      errors.duration = "Duration is required";
    } else if (examData.duration < 1 || examData.duration > 180) {
      errors.duration = "Duration must be between 1 and 180 minutes";
    }

    // Category validation
    if (!examData.category) {
      errors.category = "Category is required";
    } else if (examData.category.length < 2 || examData.category.length > 50) {
      errors.category = "Category must be between 2 and 50 characters";
    }

    // Total marks validation
    if (!examData.totalMarks) {
      errors.totalMarks = "Total marks is required";
    } else if (examData.totalMarks < 1 || examData.totalMarks > 1000) {
      errors.totalMarks = "Total marks must be between 1 and 1000";
    }

    // Passing marks validation
    if (!examData.passingMarks) {
      errors.passingMarks = "Passing marks is required";
    } else if (examData.passingMarks < 0) {
      errors.passingMarks = "Passing marks cannot be negative";
    } else if (examData.passingMarks > examData.totalMarks) {
      errors.passingMarks = "Passing marks cannot exceed total marks";
    }

    // Date validation
    if (examData.endDate && moment(examData.endDate).isBefore(examData.startDate)) {
      errors.endDate = "End date must be after start date";
    }

    // Max attempts validation
    if (examData.maxAttempts < 1 || examData.maxAttempts > 10) {
      errors.maxAttempts = "Maximum attempts must be between 1 and 10";
    }

    // Access code validation
    if (examData.accessCode && examData.accessCode.length < 6) {
      errors.accessCode = "Access code must be at least 6 characters";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onFinish = async () => {
    if (!validateForm()) {
      message.error("Please fix the validation errors");
      return;
    }

    try {
      dispatch(ShowLoading());
      let response;

      if (params.id) {
        response = await updateExam({
          ...examData,
          examId: params.id,
        });
      } else {
        response = await addExam(examData);
      }

      if (response.success) {
        message.success(response.message);
        navigate("/admin/exams");
      } else {
        message.error(response.message);
      }
      dispatch(HideLoading());
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  const getExamData = async () => {
    try {
      dispatch(ShowLoading());
      const response = await getExamById({
        examId: params.id,
      });
      dispatch(HideLoading());
      if (response.success) {
        setExamData(response.data);
      } else {
        message.error(response.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  useEffect(() => {
    if (params.id) {
      getExamData();
    }
  }, []);

  const deleteQuestion = async (questionId) => {
    try {
      dispatch(ShowLoading());
      const response = await deleteQuestionById({
        questionId,
        examId : params.id
      });
      dispatch(HideLoading());
      if (response.success) {
        message.success(response.message);
        getExamData();
      } else {
        message.error(response.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  const questionsColumns = [
    {
      title: "Question",
      dataIndex: "name",
    },
    {
      title: "Options",
      dataIndex: "options",
      render: (text, record) => {
        return Object.keys(record.options).map((key) => {
          return (
            <div key={`${record._id}_${key}`}>
              {key} : {record.options[key]}
            </div>
          );
        });
      },
    },
    {
      title: "Correct Option",
      dataIndex: "correctOption",
      render: (text, record) => {
        return ` ${record.correctOption} : ${
          record.options[record.correctOption]
        }`;
      },
    },
    {
      title: "Action",
      dataIndex: "action",
      render: (text, record) => (
        <div className="flex gap-2">
          <i
            className="ri-pencil-line"
            onClick={() => {
              setSelectedQuestion(record);
              setShowAddEditQuestionModal(true);
            }}
          ></i>
          <i
            className="ri-delete-bin-line"
            onClick={() => {
              deleteQuestion(record._id);
            }}
          ></i>
        </div>
      ),
    },
  ];

  const examDetailsTab = {
    label: "Exam Details",
    key: "1",
    children: (
      <Form layout="vertical">
        <div className="flex gap-3">
          <Form.Item
            label="Exam Name"
            validateStatus={validationErrors.name ? "error" : ""}
            help={validationErrors.name}
          >
            <Input
              value={examData.name}
              onChange={(e) => setExamData({ ...examData, name: e.target.value })}
              placeholder="Enter exam name"
            />
          </Form.Item>

          <Form.Item
            label="Duration (Minutes)"
            validateStatus={validationErrors.duration ? "error" : ""}
            help={validationErrors.duration}
          >
            <InputNumber
              value={examData.duration}
              onChange={(value) => setExamData({ ...examData, duration: value })}
              min={1}
              max={180}
            />
          </Form.Item>

          <Form.Item
            label="Category"
            validateStatus={validationErrors.category ? "error" : ""}
            help={validationErrors.category}
          >
            <Input
              value={examData.category}
              onChange={(e) => setExamData({ ...examData, category: e.target.value })}
              placeholder="Enter exam category"
            />
          </Form.Item>
        </div>

        <div className="flex gap-3">
          <Form.Item
            label="Total Marks"
            validateStatus={validationErrors.totalMarks ? "error" : ""}
            help={validationErrors.totalMarks}
          >
            <InputNumber
              value={examData.totalMarks}
              onChange={(value) => setExamData({ ...examData, totalMarks: value })}
              min={1}
              max={1000}
            />
          </Form.Item>

          <Form.Item
            label="Passing Marks"
            validateStatus={validationErrors.passingMarks ? "error" : ""}
            help={validationErrors.passingMarks}
          >
            <InputNumber
              value={examData.passingMarks}
              onChange={(value) => setExamData({ ...examData, passingMarks: value })}
              min={0}
              max={examData.totalMarks}
            />
          </Form.Item>
        </div>

        <div className="flex gap-3">
          <Form.Item
            label="Start Date"
            validateStatus={validationErrors.startDate ? "error" : ""}
            help={validationErrors.startDate}
          >
            <DatePicker
              value={moment(examData.startDate)}
              onChange={(date) => setExamData({ ...examData, startDate: date.format("YYYY-MM-DD") })}
            />
          </Form.Item>

          <Form.Item
            label="End Date"
            validateStatus={validationErrors.endDate ? "error" : ""}
            help={validationErrors.endDate}
          >
            <DatePicker
              value={moment(examData.endDate)}
              onChange={(date) => setExamData({ ...examData, endDate: date.format("YYYY-MM-DD") })}
              disabledDate={(current) => current && current < moment(examData.startDate)}
            />
          </Form.Item>

          <Form.Item
            label="Maximum Attempts"
            validateStatus={validationErrors.maxAttempts ? "error" : ""}
            help={validationErrors.maxAttempts}
          >
            <InputNumber
              value={examData.maxAttempts}
              onChange={(value) => setExamData({ ...examData, maxAttempts: value })}
              min={1}
              max={10}
            />
          </Form.Item>
        </div>

        <div className="flex gap-3">
          <Form.Item label="Shuffle Questions">
            <Switch
              checked={examData.shuffleQuestions}
              onChange={(checked) => setExamData({ ...examData, shuffleQuestions: checked })}
            />
          </Form.Item>

          <Form.Item label="Show Results">
            <Switch
              checked={examData.showResults}
              onChange={(checked) => setExamData({ ...examData, showResults: checked })}
            />
          </Form.Item>

          <Form.Item
            label="Access Code (Optional)"
            validateStatus={validationErrors.accessCode ? "error" : ""}
            help={validationErrors.accessCode}
          >
            <Input
              value={examData.accessCode}
              onChange={(e) => setExamData({ ...examData, accessCode: e.target.value })}
              placeholder="Enter access code (minimum 6 characters)"
            />
          </Form.Item>
        </div>

        <div className="flex justify-end gap-3">
          <button
            className="primary-outlined-btn"
            type="button"
            onClick={() => navigate("/admin/exams")}
          >
            Cancel
          </button>
          <button className="primary-contained-btn" type="submit" onClick={onFinish}>
            Save
          </button>
        </div>
      </Form>
    )
  };

  const questionsTab = {
    label: "Questions",
    key: "2",
    children: (
      <>
        <div className="flex justify-end">
          <button
            className="primary-outlined-btn"
            type="button"
            onClick={() => setShowAddEditQuestionModal(true)}
          >
            Add Question
          </button>
        </div>

        <Table
          columns={questionsColumns}
          dataSource={examData?.questions || []}
        />
      </>
    )
  };

  const items = [examDetailsTab];
  if (params.id) {
    items.push(questionsTab);
  }

  return (
    <div>
      <PageTitle title={params.id ? "Edit Exam" : "Add Exam"} />
      <div className="divider"></div>

      {(examData || !params.id) && (
        <Form layout="vertical" onFinish={onFinish} initialValues={examData}>
          <Tabs defaultActiveKey="1" items={items} />
        </Form>
      )}

      {showAddEditQuestionModal && (
        <AddEditQuestion
          setShowAddEditQuestionModal={setShowAddEditQuestionModal}
          showAddEditQuestionModal={showAddEditQuestionModal}
          examId={params.id}
          refreshData={getExamData}
          selectedQuestion={selectedQuestion}
          setSelectedQuestion={setSelectedQuestion}
        />
      )}
    </div>
  );
}

export default AddEditExam;
