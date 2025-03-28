const { axiosInstance } = require(".");

// Add report
export const addReport = async (payload) => {
  try {
    const response = await axiosInstance.post("/api/reports/add-report", payload);
    return response.data;
  } catch (error) {
    return error.response.data;
  }
};

// Get all reports with pagination and filters
export const getAllReports = async ({ examName = "", userName = "", page = 1, limit = 10 }) => {
  try {
    const response = await axiosInstance.post("/api/reports/get-all-reports", {
      examName,
      userName,
      page,
      limit
    });
    return response.data;
  } catch (error) {
    return error.response.data;
  }
};

// Get reports by user with pagination
export const getAllReportsByUser = async ({ page = 1, limit = 10 } = {}) => {
  try {
    const response = await axiosInstance.post("/api/reports/get-reports-by-user", {
      page,
      limit
    });
    return response.data;
  } catch (error) {
    return error.response.data;
  }
};