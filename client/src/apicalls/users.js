import { fetchCsrfToken } from './index';
const { default: axiosInstance } = require(".");

let csrfToken = null; // Initialize csrfToken variable

export const registerUser = async (payload) => {
    try {
        const response = await axiosInstance.post('/api/users/register', payload);
        return response.data;
    } catch (error) {
        return error.response.data;
    }
}

export const loginUser = async (payload) => {
    try {
        // Ensure CSRF token is fetched before making the login request
        try {
            if (!csrfToken) {
                csrfToken = await fetchCsrfToken();
            }
        } catch (tokenError) {
            console.error("Failed to fetch CSRF token for login, continuing without it:", tokenError);
            // Continue without CSRF token since login is in excluded routes
        }
        
        // Create a clean copy of the payload to avoid modifying the original
        const cleanPayload = { ...payload };
        
        // Remove otp field if it is empty
        if (!cleanPayload.otp) {
            delete cleanPayload.otp;
        }
        
        // Remove headers if it was accidentally included in the payload
        if (cleanPayload.headers) {
            delete cleanPayload.headers;
        }
        
        // Prepare headers separately
        const headers = {};
        if (csrfToken) {
            headers['X-CSRF-Token'] = csrfToken;
        }
        
        // Log payload and headers for debugging
        console.log("Login request payload:", cleanPayload);
        console.log("Login request headers:", headers);
        
        // Send payload as the body and headers separately
        const response = await axiosInstance.post('/api/users/login', cleanPayload, {
            headers: headers
        });
        
        if (response.data.success) {
            // Store both tokens in localStorage
            const { accessToken, refreshToken } = response.data.data;
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
        }
        return response.data;
    } catch (error) {
        console.error("Login error:", error);
        return error.response ? error.response.data : { success: false, message: "Network error" };
    }
}

export const getUserInfo = async () => {
    try {
        // Don't send userId in the body - the server will extract it from the token
        const response = await axiosInstance.post('/api/users/get-user-info');
        return response.data;
    } catch (error) {
        return error.response ? error.response.data : { success: false, message: "Network error" };
    }
}

export const logoutUser = async () => {
    try {
        const response = await axiosInstance.post('/api/users/logout');
        
        // Clear tokens from localStorage regardless of server response
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        
        // Clear API cache
        axiosInstance.clearCache();
        
        return response.data;
    } catch (error) {
        // Still clear tokens even if the server request fails
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        axiosInstance.clearCache();
        
        return error.response ? error.response.data : { success: false, message: "Network error" };
    }
}

export const refreshToken = async (refreshToken) => {
    try {
        const response = await axiosInstance.post('/api/users/refresh-token', { refreshToken });
        
        if (response.data.success) {
            const { accessToken, refreshToken: newRefreshToken } = response.data.data;
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', newRefreshToken);
        }
        
        return response.data;
    } catch (error) {
        return error.response ? error.response.data : { success: false, message: "Network error" };
    }
}

export const forgotPassword = async (email) => {
    try {
        const response = await axiosInstance.post('/api/users/forgot-password', { email });
        return response.data;
    } catch (error) {
        return error.response.data;
    }
}

export const verifyOtp = async (email, otp) => {
    try {
        const response = await axiosInstance.post('/api/users/verify-otp', { email, otp });
        return response.data;
    } catch (error) {
        return error.response.data;
    }
}

export const resetPassword = async (email, newPassword) => {
    try {
        const response = await axiosInstance.post('/api/users/reset-password', { email, newPassword });
        return response.data;
    } catch (error) {
        return error.response.data;
    }
}

// Enhanced error handling for API calls
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            const { status, data } = error.response;
            switch (status) {
                case 400:
                    error.message = data.message || "Bad Request. Please check your input.";
                    break;
                case 401:
                    error.message = data.message || "Unauthorized. Please log in again.";
                    break;
                case 403:
                    error.message = data.message || "Forbidden. You do not have access to this resource.";
                    break;
                case 404:
                    error.message = data.message || "Resource not found.";
                    break;
                case 500:
                    error.message = data.message || "Internal Server Error. Please try again later.";
                    break;
                default:
                    error.message = data.message || "An unexpected error occurred. Please try again.";
            }
        } else if (error.request) {
            error.message = "No response received from the server. Please check your network connection.";
        } else {
            error.message = error.message || "An unexpected error occurred. Please try again.";
        }

        return Promise.reject(error);
    }
);
