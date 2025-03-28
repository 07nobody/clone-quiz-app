import axios from 'axios';
import { message } from 'antd';

// Constants for retry configuration
const RETRY_COUNT = 3;
const RETRY_DELAY = 1000;
const RETRY_STATUS_CODES = [408, 500, 502, 503, 504];

// Enhanced cache implementation with TTL and request deduplication
const cache = new Map();
const pendingRequests = new Map();
const CACHE_TTL = 60000; // 1 minute cache TTL

// Create array of endpoints that should be cached
const CACHEABLE_ENDPOINTS = [
  '/api/users/get-user-info',
  '/api/exams/get-all-exams',
  '/api/exams/get-exam-by-id',
  '/api/reports/get-all-reports-by-user',
  '/api/reports/get-all-reports'
];

// Flag to track if a token refresh is in progress
let isRefreshing = false;
let failedQueue = [];

// Process the failed queue
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Get base URL from environment or default
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance with proper configuration
const axiosInstance = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    }
});

// CSRF Token management
let csrfToken = null;
let csrfTokenRetryCount = 0;
const MAX_CSRF_RETRIES = 3;

export const fetchCsrfToken = async () => {
  try {
    if (csrfTokenRetryCount >= MAX_CSRF_RETRIES) {
      throw new Error("Maximum CSRF token fetch retries exceeded");
    }
    
    const response = await axios.get(`${BASE_URL}/csrf-token`, {
      withCredentials: true
    });
    
    if (response.data?.csrfToken) {
      csrfToken = response.data.csrfToken;
      csrfTokenRetryCount = 0;
      return csrfToken;
    }
    throw new Error("Invalid CSRF token response");
  } catch (error) {
    csrfTokenRetryCount++;
    console.error(`CSRF token fetch attempt ${csrfTokenRetryCount} failed:`, error.message);
    throw error;
  }
};

// Initialize CSRF token
fetchCsrfToken().catch(console.error);

// Request deduplication function
const dedupRequest = (config) => {
  const cacheKey = `${config.method}-${config.url}-${JSON.stringify(config.data || {})}`;
  
  // Check if this is a cacheable endpoint
  const isCacheable = CACHEABLE_ENDPOINTS.some(endpoint => config.url.includes(endpoint));
  
  if (isCacheable) {
    // Check cache first
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL) {
      return Promise.resolve(cachedResponse.data);
    }
    
    // Check if there's already a pending request
    if (pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey);
    }
    
    // Create new request promise
    const requestPromise = axios(config)
      .then(response => {
        cache.set(cacheKey, {
          data: response,
          timestamp: Date.now()
        });
        pendingRequests.delete(cacheKey);
        return response;
      })
      .catch(error => {
        pendingRequests.delete(cacheKey);
        throw error;
      });
    
    pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }
  
  return axios(config);
};

// Add request interceptor
axiosInstance.interceptors.request.use(
  async (config) => {
    // Add retry configuration
    config.retry = true;
    config.retryCount = 0;

    // Add authorization token
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Handle CSRF token
    if (!config.url.includes('csrf-token')) {
      try {
        if (!csrfToken) {
          csrfToken = await fetchCsrfToken();
        }
        config.headers['X-CSRF-Token'] = csrfToken;
      } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
        // Don't block the request if CSRF token fetch fails
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    // Cache successful GET responses
    if (response.config.method.toLowerCase() === 'get' && 
        CACHEABLE_ENDPOINTS.some(endpoint => response.config.url.includes(endpoint))) {
      const cacheKey = `${response.config.method}-${response.config.url}-${JSON.stringify(response.config.params || {})}`;
      cache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      });
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle CSRF token errors
    if (error.response?.status === 403 && error.response?.data?.message?.includes('CSRF')) {
      try {
        csrfToken = await fetchCsrfToken();
        originalRequest.headers['X-CSRF-Token'] = csrfToken;
        return axiosInstance(originalRequest);
      } catch (csrfError) {
        return Promise.reject(csrfError);
      }
    }

    // Handle token expiration
    if (error.response?.status === 401 && error.response?.data?.tokenExpired && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(
          `${BASE_URL}/api/users/refresh-token`,
          { refreshToken },
          { withCredentials: true }
        );

        if (response.data?.success) {
          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
          return axiosInstance(originalRequest);
        } else {
          throw new Error('Token refresh failed');
        }
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        axiosInstance.clearCache();
        return Promise.reject(refreshError);
      }
    }

    // Handle other 401 errors
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      axiosInstance.clearCache();
    }

    return Promise.reject(error);
  }
);

// Enhanced global error handling
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
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

// Add retry interceptor
axiosInstance.interceptors.response.use(undefined, async (err) => {
  const { config, message: errorMessage } = err;
  
  // If config is undefined, axios was never called
  if (!config || !config.retry) {
    return Promise.reject(err);
  }

  // Set the retry count
  config.retryCount = config.retryCount || 0;

  // Check if we should retry the request
  const shouldRetry = config.retryCount < RETRY_COUNT && 
    (axios.isCancel(err) || 
      (err.response && RETRY_STATUS_CODES.includes(err.response.status)));

  if (shouldRetry) {
    config.retryCount += 1;

    // Create new promise to handle retry delay
    const backoff = new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Retrying request (${config.retryCount}/${RETRY_COUNT})`);
        resolve();
      }, RETRY_DELAY * config.retryCount);
    });

    await backoff;
    return axiosInstance(config);
  }

  return Promise.reject(err);
});

// Add cache management methods
axiosInstance.clearCache = () => {
    cache.clear();
    pendingRequests.clear();
};

axiosInstance.preload = (url, params = {}) => {
    const config = { 
        url,
        method: 'get',
        params,
        baseURL: BASE_URL,
        withCredentials: true
    };
    
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers = { Authorization: `Bearer ${token}` };
    }
    
    return dedupRequest(config).catch(() => {});
};

export default axiosInstance;
