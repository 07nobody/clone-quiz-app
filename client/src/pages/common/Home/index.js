import React, { useEffect } from 'react';
import { message, Input } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { getAllExams } from '../../../apicalls/exams';
import { HideLoading, ShowLoading } from '../../../redux/loaderSlice';
import PageTitle from '../../../components/PageTitle';
import { useNavigate } from 'react-router-dom';

const { Search } = Input;

function Home() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.users);
  const [exams, setExams] = React.useState([]);
  const [filteredExams, setFilteredExams] = React.useState([]);

  const getExams = async () => {
    try {
      dispatch(ShowLoading());
      const response = await getAllExams();
      if (response.success) {
        setExams(response.data);
        setFilteredExams(response.data);
      } else {
        message.error(response.message);
      }
      dispatch(HideLoading());
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  const handleSearch = (value) => {
    const filtered = exams.filter((exam) =>
      exam.name.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredExams(filtered);
  };

  useEffect(() => {
    // Only fetch exams if user is authenticated
    if (user && localStorage.getItem("accessToken")) {
      getExams();
    } else {
      navigate("/login");
    }
  }, [user]);

  return (
    <div>
      <PageTitle title={`Hi ${user?.name}, Welcome to Quiz Portal`} />
      <div className="divider"></div>
      <div className="flex gap-2">
        {user?.isAdmin && (
          <button
            className="primary-outlined-btn"
            onClick={() => navigate("/admin/exams")}
          >
            Add Exam
          </button>
        )}
        <button
          className="primary-outlined-btn"
          onClick={() => navigate("/user/reports")}
        >
          Reports
        </button>
      </div>
      <div className="divider"></div>
      <Search
        placeholder="Search exams"
        onSearch={handleSearch}
        enterButton
        className="mb-3"
      />
      <div className="flex gap-5 flex-wrap mt-2">
        {filteredExams.map((exam) => (
          <div
            className="card p-2 cursor-pointer"
            key={exam._id}
            onClick={() => navigate(`/user/write-exam/${exam._id}`)}
          >
            <h1 className="text-xl">{exam.name}</h1>
            <div className="divider"></div>
            <h1 className="text-md">Category: {exam.category}</h1>
            <h1 className="text-md">Total Marks: {exam.totalMarks}</h1>
            <h1 className="text-md">Passing Marks: {exam.passingMarks}</h1>
            <h1 className="text-md">Duration: {exam.duration} secs</h1>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;
