import { message } from "antd";
import React, { useEffect, useState } from "react";
import { getUserInfo, logoutUser, refreshToken } from "../apicalls/users";
import { useDispatch, useSelector } from "react-redux";
import { SetUser } from "../redux/usersSlice";
import { useNavigate } from "react-router-dom";
import { HideLoading, ShowLoading } from "../redux/loaderSlice";
import axiosInstance from "../apicalls";

function ProtectedRoute({ children }) {
  const { user } = useSelector((state) => state.users);
  const [menu, setMenu] = useState([]);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const validateToken = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        throw new Error("No access token found");
      }

      dispatch(ShowLoading());
      const response = await getUserInfo();
      dispatch(HideLoading());
      
      if (response.success) {
        dispatch(SetUser(response.data));
        setMenu(response.data.isAdmin ? adminMenu : userMenu);
        return true;
      } else {
        throw new Error(response.message || "Authentication failed");
      }
    } catch (error) {
      dispatch(HideLoading());
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      message.error(error.message || "Please log in to continue");
      navigate("/login", { replace: true });
      return false;
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      if (!localStorage.getItem("accessToken")) {
        navigate("/login", { replace: true });
        return;
      }
      
      if (!user) {
        await validateToken();
      } else {
        setMenu(user.isAdmin ? adminMenu : userMenu);
      }
    };

    checkAuth();
  }, [user]);

  const handleLogout = async () => {
    try {
      dispatch(ShowLoading());
      const response = await logoutUser();
      dispatch(HideLoading());
      if (response.success) {
        message.success(response.message || "Logged out successfully.");
      } else {
        throw new Error(response.message || "Failed to log out. Please try again.");
      }
    } catch (error) {
      message.error(error.message || "An unexpected error occurred during logout. Please try again.");
    } finally {
      navigate("/login");
    }
  };

  const userMenu = [
    {
      title: "Home",
      paths: ["/", "/user/write-exam"],
      icon: "ri-home-line",
      onClick: () => navigate("/"),
    },
    {
      title: "Reports",
      paths: ["/user/reports"],
      icon: "ri-bar-chart-line",
      onClick: () => navigate("/user/reports"),
    },
    {
      title: "Profile",
      paths: ["/profile"],
      icon: "ri-user-line",
      onClick: () => navigate("/profile"),
    },
    {
      title: "Logout",
      paths: ["/logout"],
      icon: "ri-logout-box-line",
      onClick: handleLogout,
    },
  ];

  const adminMenu = [
    {
      title: "Home",
      paths: ["/", "/user/write-exam"],
      icon: "ri-home-line",
      onClick: () => navigate("/"),
    },
    {
      title: "Exams",
      paths: ["/admin/exams", "/admin/exams/add"],
      icon: "ri-file-list-line",
      onClick: () => navigate("/admin/exams"),
    },
    {
      title: "Reports",
      paths: ["/admin/reports"],
      icon: "ri-bar-chart-line",
      onClick: () => navigate("/admin/reports"),
    },
    {
      title: "Profile",
      paths: ["/profile"],
      icon: "ri-user-line",
      onClick: () => navigate("/profile"),
    },
    {
      title: "Logout",
      paths: ["/logout"],
      icon: "ri-logout-box-line",
      onClick: handleLogout,
    },
  ];

  const activeRoute = window.location.pathname;

  const getIsActiveOrNot = (paths) => {
    if (paths.includes(activeRoute)) {
      return true;
    } else {
      if (
        activeRoute.includes("/admin/exams/edit") &&
        paths.includes("/admin/exams")
      ) {
        return true;
      }
      if (
        activeRoute.includes("/user/write-exam") &&
        paths.includes("/user/write-exam")
      ) {
        return true;
      }
    }
    return false;
  };

  return (
    <div className="layout">
      <div className="flex gap-2 w-full h-full">
        <div className="sidebar">
          <div className="menu">
            {menu.map((item, index) => {
              return (
                <div
                  className={`menu-item ${
                    getIsActiveOrNot(item.paths) && "active-menu-item"
                  }`}
                  key={index}
                  onClick={item.onClick}
                >
                  <i className={item.icon}></i>
                  <span>{item.title}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="body">{children}</div>
      </div>
    </div>
  );
}

export default ProtectedRoute;
