import { Form, message, Progress } from "antd";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { registerUser } from "../../../apicalls/users";
import { HideLoading, ShowLoading } from "../../../redux/loaderSlice";

function Register() {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  // Initialize input fields with default values
  const [formValues, setFormValues] = useState({
    name: "",
    email: "",
    password: "",
  });

  // Password strength state
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: "",
    color: "red",
  });

  const checkPasswordStrength = (password) => {
    let score = 0;
    const feedback = [];

    // Minimum length
    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push("Password should be at least 8 characters long");
      return { score: 0, feedback: feedback.join(", "), color: "red", strengthText: "Very Weak" };
    }

    // Uppercase letters
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Add an uppercase letter");
    }

    // Lowercase letters
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Add a lowercase letter");
    }

    // Numbers
    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Add a number");
    }

    // Special characters
    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Add a special character");
    }

    // Sequential characters
    if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/.test(password.toLowerCase())) {
      score = Math.max(0, score - 1);
      feedback.push("Avoid sequential characters");
    }

    // Repeated characters
    if (/(.)\1{2,}/.test(password)) {
      score = Math.max(0, score - 1);
      feedback.push("Avoid repeated characters");
    }

    // Common passwords check
    const commonPasswords = ['password', 'password123', '123456', 'qwerty', 'admin'];
    if (commonPasswords.includes(password.toLowerCase())) {
      score = 0;
      feedback.push("This is a commonly used password");
    }

    let color;
    let strengthText;
    switch (score) {
      case 0:
        color = "red";
        strengthText = "Very Weak";
        break;
      case 1:
        color = "#ff4500";
        strengthText = "Weak";
        break;
      case 2:
        color = "orange";
        strengthText = "Fair";
        break;
      case 3:
        color = "#9ACD32";
        strengthText = "Good";
        break;
      case 4:
      case 5:
        color = "green";
        strengthText = "Strong";
        break;
      default:
        color = "red";
        strengthText = "Very Weak";
    }

    return {
      score,
      color,
      strengthText,
      feedback: feedback.length > 0 ? `${strengthText}. ${feedback.join(", ")}` : strengthText
    };
  };

  const onInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prevValues) => ({ ...prevValues, [name]: value || "" }));
    
    // Check password strength when password field changes
    if (name === "password") {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const onFinish = async (values) => {
    try {
      // Strong validation before submission
      if (passwordStrength.score < 3) {
        message.error("Please create a stronger password");
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
        message.error("Please enter a valid email address");
        return;
      }

      if (values.name.length < 2) {
        message.error("Name must be at least 2 characters long");
        return;
      }
      
      dispatch(ShowLoading());
      const response = await registerUser(values);
      dispatch(HideLoading());
      
      if (response.success) {
        message.success(response.message);
        navigate("/login", { replace: true });
      } else {
        message.error(response.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen w-screen bg-primary">
      <div className="card w-400 p-3 bg-white">
        <div className="flex flex-col">
          <div className="flex">
            <h1 className="text-2xl">QUIZ - REGISTER <i className="ri-user-add-line"></i></h1>
          </div>
          <div className="divider"></div>
          <Form form={form} layout="vertical" className="mt-2" onFinish={onFinish}>
            <Form.Item name="name" label="Name" rules={[{ required: true, message: "Please input your name!" }]}>  
              <input type="text" name="name" value={formValues.name} onChange={onInputChange} autoComplete="name" />
            </Form.Item>
            
            <Form.Item name="email" label="Email" rules={[
              { required: true, message: "Please input your email!" },
              { type: 'email', message: 'Please enter a valid email address!' }
            ]}>  
              <input type="email" name="email" value={formValues.email} onChange={onInputChange} autoComplete="email" />
            </Form.Item>
            
            <Form.Item name="password" label="Password" rules={[
              { required: true, message: "Please input your password!" }
            ]}>  
              <input type="password" name="password" value={formValues.password} onChange={onInputChange} autoComplete="new-password" />
            </Form.Item>
            
            {formValues.password && (
              <div className="mb-3">
                <Progress 
                  percent={passwordStrength.score * 20} 
                  strokeColor={passwordStrength.color}
                  showInfo={false}
                />
                <p style={{ color: passwordStrength.color }}>{passwordStrength.feedback}</p>
              </div>
            )}
            
            <div className="flex flex-col gap-2">
              <button 
                type="submit" 
                className="primary-contained-btn mt-2 w-100"
                disabled={!formValues.password || passwordStrength.score < 3}
              >
                Register
              </button>
              <Link to="/login" className="underline">
                Already a member? Login
              </Link>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default Register;
