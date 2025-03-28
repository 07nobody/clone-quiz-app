import React, { useState, useEffect } from "react";
import { Form, message } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../../../apicalls";

function ResetPassword() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { email } = useParams();
  
  const [formValues, setFormValues] = useState({
    password: "",
    confirmPassword: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prevValues) => ({ ...prevValues, [name]: value || "" }));
  };

  const onFinish = async (values) => {
    try {
      if (!email) {
        message.error("Email is required. Please try the password reset process again.");
        return;
      }

      setLoading(true);
      const response = await axiosInstance.post("/api/users/reset-password", {
        email: decodeURIComponent(email),
        newPassword: values.password
      });
      
      setLoading(false);
      if (response.data.success) {
        message.success(response.data.message);
        navigate("/login");
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
          <h1 className="text-2xl">Reset Password</h1>
          <p className="text-md">Email: {decodeURIComponent(email)}</p>
          <div className="divider"></div>
          <Form layout="vertical" onFinish={onFinish}>
            {/* Hidden input for accessibility */}
            <input 
              type="hidden" 
              id="username" 
              name="username" 
              autoComplete="username" 
              value={decodeURIComponent(email) || ""} 
            />
            
            <Form.Item
              name="password"
              label="New Password"
              rules={[{ required: true, message: "Please input your new password!" }]}
            >
              <input
                type="password"
                name="password"
                value={formValues.password}
                onChange={handleInputChange}
                autoComplete="new-password"
              />
            </Form.Item>
            
            <Form.Item
              name="confirmPassword"
              label="Confirm Password"
              dependencies={["password"]}
              rules={[
                { required: true, message: "Please confirm your password!" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("Passwords do not match!"));
                  },
                }),
              ]}
            >
              <input
                type="password"
                name="confirmPassword"
                value={formValues.confirmPassword}
                onChange={handleInputChange}
                autoComplete="new-password"
              />
            </Form.Item>
            
            <button
              type="submit"
              className="primary-contained-btn mt-2 w-100"
              disabled={loading}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;