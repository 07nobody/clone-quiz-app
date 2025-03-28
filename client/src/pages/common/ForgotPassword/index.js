import React, { useState } from "react";
import { Form, message } from "antd";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../apicalls";

function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState("");
  const [formValues, setFormValues] = useState({
    email: "",
    otp: "",
  });
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prevValues) => ({ ...prevValues, [name]: value || "" }));
  };

  const sendOtp = async (values) => {
    try {
      setLoading(true);
      const response = await axiosInstance.post("/api/users/forgot-password", values);
      setLoading(false);
      if (response.data.success) {
        message.success(response.data.message);
        setOtpSent(true);
        setEmail(values.email);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      setLoading(false);
      message.error(error.response?.data?.message || "Something went wrong");
    }
  };

  const verifyOtp = async (values) => {
    try {
      setLoading(true);
      const response = await axiosInstance.post("/api/users/verify-otp", {
        email,
        otp: values.otp,
      });
      setLoading(false);
      if (response.data.success) {
        message.success(response.data.message);
        navigate(`/reset-password/${email}`);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      setLoading(false);
      message.error(error.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen w-screen bg-primary">
      <div className="card w-400 p-3 bg-white">
        <div className="flex flex-col">
          <h1 className="text-2xl">Forgot Password</h1>
          <div className="divider"></div>
          {!otpSent ? (
            <Form layout="vertical" onFinish={sendOtp}>
              <Form.Item
                name="email"
                label="Email"
                rules={[{ required: true, message: "Please input your email!" }]}
              >
                <input type="email" />
              </Form.Item>
              <button
                type="submit"
                className="primary-contained-btn mt-2 w-100"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </Form>
          ) : (
            <Form layout="vertical" onFinish={verifyOtp}>
              <Form.Item
                name="otp"
                label="OTP"
                rules={[{ required: true, message: "Please input the OTP!" }]}
              >
                <input type="text" maxLength={6} />
              </Form.Item>
              <button
                type="submit"
                className="primary-contained-btn mt-2 w-100"
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;