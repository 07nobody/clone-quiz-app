import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { message } from 'antd';
import PageTitle from '../../../components/PageTitle';
import { getUserInfo } from '../../../apicalls/users';
import { SetUser } from '../../../redux/usersSlice';
import { HideLoading, ShowLoading } from '../../../redux/loaderSlice';

function Profile() {
  const { user } = useSelector((state) => state.users);
  const dispatch = useDispatch();

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

  useEffect(() => {
    if (!user) {
      refreshUserData();
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
        <div className="flex flex-col">
          <h1 className="text-md">Name: {user.name}</h1>
          <h1 className="text-md">Email: {user.email}</h1>
          <h1 className="text-md">Role: {user.isAdmin ? "Admin" : "User"}</h1>
        </div>
      </div>
    </div>
  );
}

export default Profile;