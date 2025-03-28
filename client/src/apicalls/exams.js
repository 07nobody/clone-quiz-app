import { fetchCsrfToken } from './index';
const { default: axiosInstance } = require(".");

let csrfToken = null; // Initialize csrfToken variable

// add exam
export const addExam = async (payload) => {
  try {
    const response = await axiosInstance.post("/api/exams/add", payload);
    return response.data;
  } catch (error) {
    return error.response.data;
  }
};

// get all exams
export const getAllExams = async () => {
  try {
    if (!localStorage.getItem('accessToken')) {
      return { success: false, message: "Not authenticated" };
    }

    const response = await axiosInstance.post("/api/exams/get-all-exams", {});
    return response.data;
  } catch (error) {
    console.error("Error getting exams:", error);
    return error.response ? error.response.data : { success: false, message: "Network error" };
  }
};

// get exam by id

export const getExamById = async (payload) => {
  try {
    const response = await axiosInstance.post(
      "/api/exams/get-exam-by-id",
      payload
    );
    return response.data;
  } catch (error) {
    return error.response.data;
  }
};

// update exam by id

export const updateExam = async (payload) => {
  try {
    const response = await axiosInstance.put(`/api/exams/${payload._id}`, payload);
    return response.data;
  } catch (error) {
    return error.response.data;
  }
};

// delete exam by id

export const deleteExamById = async (payload) => {
  try {
    const response = await axiosInstance.post(
      "/api/exams/delete-exam-by-id",
      payload
    );
    return response.data;
  } catch (error) {
    return error.response.data;
  }
};

// add question to exam

export const addQuestionToExam = async (payload) => {
  try {
    const response = await axiosInstance.post(
      "/api/exams/add-question-to-exam",
      payload
    );
    return response.data;
  } catch (error) {
    return error.response.data;
  }
};

export const editQuestionById = async (payload) => {
  try {
    const response = await axiosInstance.post(
      "/api/exams/edit-question-in-exam",
      payload
    );
    return response.data;
  } catch (error) {
    return error.response.data;
  }
};

export const deleteQuestionById = async (payload) => {
  try {
    const response = await axiosInstance.post(
      "/api/exams/delete-question-in-exam",
      payload
    );
    return response.data;
  } catch (error) {
    return error.response.data;
  }
}
