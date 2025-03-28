import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { message, Form, Input, Button } from 'antd';
import PageTitle from '../../../components/PageTitle';
import { getUserInfo, updateUserInfo } from '../../../apicalls/users';
import { SetUser } from '../../../redux/usersSlice';
import { HideLoading, ShowLoading } from '../../../redux/loaderSlice';

function Profile() {
  const { user } = useSelector((state) => state.users);
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();

  const refreshUserData = async () => {
    try {
      dispatch(ShowLoading());
      const response = await getUserInfo();
      dispatch(HideLoading());
      if (response.success) {
        dispatch(SetUser(response.data));
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  const handleUpdate = async (values) => {
    try {
      dispatch(ShowLoading());
      const response = await updateUserInfo(values);
      dispatch(HideLoading());
      if (response.success) {
        message.success('Profile updated successfully');
        dispatch(SetUser(response.data));
        setIsEditing(false);
      } else {
        message.error(response.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  useEffect(() => {
    if (!user) {
      refreshUserData();
    } else {
      form.setFieldsValue(user);
    }
  }, [user]);

  if (!user) {
    return null; // Don't render anything until we have user data
  }

  return (
    <div>
      <PageTitle title="Profile" />
      <div className="divider"></div>
      <div className="card p-3 flex flex-col gap-2">
        {!isEditing ? (
          <div className="flex flex-col">
            <h1 className="text-md">Name: {user.name}</h1>
            <h1 className="text-md">Email: {user.email}</h1>
            <h1 className="text-md">Role: {user.isAdmin ? "Admin" : "User"}</h1>
            <Button type="primary" onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          </div>
        ) : (
          <Form form={form} layout="vertical" onFinish={handleUpdate}>
            <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Please input your name!' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Please input your email!' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Please input your password!' }]}>
              <Input.Password />
            </Form.Item>
            <div className="flex gap-2">
              <Button type="primary" htmlType="submit">
                Save
              </Button>
              <Button onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </Form>
        )}
      </div>
    </div>
  );
}

export default Profile;
