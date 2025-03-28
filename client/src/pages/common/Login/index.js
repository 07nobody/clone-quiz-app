import { Form, message } from "antd";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../../../apicalls/users";
import { HideLoading, ShowLoading } from "../../../redux/loaderSlice";
import { SetUser } from "../../../redux/usersSlice";
import axiosInstance from "../../../apicalls";

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [forgotPassword, setForgotPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    otp: ""
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value || ""
    }));
    // Update form field
    form.setFieldsValue({ [name]: value || "" });
  };

  const onFinish = async (values) => {
    try {
      dispatch(ShowLoading());
      const response = await loginUser(formData);
      dispatch(HideLoading());
      if (response.success) {
        message.success(response.message);
        localStorage.setItem("accessToken", response.data.accessToken);
        if (response.data.refreshToken) {
          localStorage.setItem("refreshToken", response.data.refreshToken);
        }
        
        // Set user data in Redux store
        dispatch(SetUser({
          id: response.data.id,
          email: response.data.email,
          name: response.data.name,
          isAdmin: response.data.isAdmin
        }));
        
        // Use replace instead of navigate to prevent history stack issues
        navigate("/", { replace: true });
      } else {
        message.error(response.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  const sendOtp = async () => {
    try {
      dispatch(ShowLoading());
      const response = await axiosInstance.post("/api/users/forgot-password", {
        email: formData.email
      });
      dispatch(HideLoading());
      if (response.data.success) {
        message.success(response.data.message);
        setOtpSent(true);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.response?.data?.message || "Something went wrong");
    }
  };

  const verifyOtp = async () => {
    try {
      dispatch(ShowLoading());
      const response = await axiosInstance.post("/api/users/verify-otp", {
        email: formData.email,
        otp: formData.otp,
      });
      dispatch(HideLoading());
      if (response.data.success) {
        message.success(response.data.message);
        navigate(`/reset-password/${formData.email}`);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.response?.data?.message || "Something went wrong");
    }
  };

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      otp: ""
    });
    form.resetFields();
    setForgotPassword(false);
    setOtpSent(false);
  };

  return (
    <div className="flex justify-center items-center h-screen w-screen bg-primary">
      <div className="card w-400 p-3 bg-white">
        <div className="flex flex-col">
          <div className="flex">
            <h1 className="text-2xl">QUIZ - LOGIN <i className="ri-login-circle-line"></i></h1>
          </div>
          <div className="divider"></div>
          {!forgotPassword ? (
            <Form form={form} layout="vertical" onFinish={onFinish} initialValues={formData}>
              <Form.Item name="email" label="Email" rules={[{ required: true, message: "Please input your email!" }]}>
                <input 
                  type="text" 
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  autoComplete="username email" 
                />
              </Form.Item>
              <Form.Item name="password" label="Password" rules={[{ required: true, message: "Please input your password!" }]}>
                <input 
                  type="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  autoComplete="current-password"
                />
              </Form.Item>
              <div className="flex flex-col gap-2">
                <button type="submit" className="primary-contained-btn mt-2 w-100">
                  Login
                </button>
                <Link to="/register">Not a member? Register</Link>
                <button
                  type="button"
                  className="primary-outlined-btn"
                  onClick={() => setForgotPassword(true)}
                >
                  Forgot Password
                </button>
              </div>
            </Form>
          ) : (
            <div>
              {!otpSent ? (
                <Form layout="vertical" onFinish={sendOtp} initialValues={formData}>
                  <Form.Item name="email" label="Email" rules={[{ required: true, message: "Please input your email!" }]}>
                    <input 
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      autoComplete="email"
                    />
                  </Form.Item>
                  <button type="submit" className="primary-contained-btn mt-2 w-100">
                    Send OTP
                  </button>
                </Form>
              ) : (
                <Form layout="vertical" onFinish={verifyOtp} initialValues={formData}>
                  <input type="hidden" autoComplete="username" value={formData.email} />
                  <Form.Item name="otp" label="OTP" rules={[{ required: true, message: "Please input the OTP!" }]}>
                    <input 
                      type="text"
                      name="otp"
                      maxLength={6}
                      value={formData.otp}
                      onChange={handleInputChange}
                      autoComplete="one-time-code"
                    />
                  </Form.Item>
                  <button type="submit" className="primary-contained-btn mt-2 w-100">
                    Verify OTP
                  </button>
                </Form>
              )}
              <button
                type="button"
                className="primary-outlined-btn mt-2 w-100"
                onClick={resetForm}
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
