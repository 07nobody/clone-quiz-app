import React, { useState } from "react";
import PageTitle from "../../../components/PageTitle";
import { message, Table } from "antd";
import { useDispatch } from "react-redux";
import { HideLoading, ShowLoading } from "../../../redux/loaderSlice";
import { getAllReports } from "../../../apicalls/reports";
import { useEffect } from "react";
import moment from "moment";

function AdminReports() {
  const [reportsData, setReportsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const dispatch = useDispatch();
  const [filters, setFilters] = useState({
    examName: "",
    userName: "",
  });

  const columns = [
    {
      title: "Exam Name",
      dataIndex: "examName",
      render: (text, record) => <>{record?.exam?.name || "Unknown Exam"}</>,
    },
    {
      title: "User Name",
      dataIndex: "userName",
      render: (text, record) => <>{record?.user?.name || "Unknown User"}</>,
    },
    {
      title: "Date",
      dataIndex: "date",
      render: (text, record) => (
        <>{record?.createdAt ? moment(record.createdAt).format("DD-MM-YYYY hh:mm:ss") : "N/A"}</>
      ),
    },
    {
      title: "Total Marks",
      dataIndex: "totalMarks",
      render: (text, record) => <>{record?.exam?.totalMarks || 0}</>,
    },
    {
      title: "Passing Marks",
      dataIndex: "passingMarks",
      render: (text, record) => <>{record?.exam?.passingMarks || 0}</>,
    },
    {
      title: "Obtained Marks",
      dataIndex: "obtainedMarks",
      render: (text, record) => <>{record?.result?.correctAnswers?.length || 0}</>,
    },
    {
      title: "Verdict",
      dataIndex: "verdict",
      render: (text, record) => (
        <span style={{ 
          color: record?.result?.verdict === 'Pass' ? 'green' : 'red',
          fontWeight: 'bold'
        }}>
          {record?.result?.verdict || "N/A"}
        </span>
      ),
    },
  ];

  const getData = async (tempFilters, page = 1, limit = 10) => {
    try {
      setLoading(true);
      dispatch(ShowLoading());
      const response = await getAllReports({
        ...tempFilters,
        page,
        limit
      });
      
      if (response.success) {
        setReportsData(response.data);
        setPagination({
          current: response.pagination.page,
          pageSize: limit,
          total: response.pagination.total
        });
      } else {
        message.error(response.message);
      }
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
      dispatch(HideLoading());
    }
  };

  const handleTableChange = (pagination, filters, sorter) => {
    getData(filters, pagination.current, pagination.pageSize);
  };

  const resetFilters = () => {
    setFilters({
      examName: "",
      userName: "",
    });
    getData({
      examName: "",
      userName: "",
    }, 1, pagination.pageSize);
  };

  useEffect(() => {
    getData(filters);
  }, []);

  return (
    <div>
      <PageTitle title="Reports" />
      <div className="divider"></div>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          placeholder="Exam"
          value={filters.examName}
          onChange={(e) => setFilters({ ...filters, examName: e.target.value })}
        />
        <input
          type="text"
          placeholder="User"
          value={filters.userName}
          onChange={(e) => setFilters({ ...filters, userName: e.target.value })}
        />
        <button
          className="primary-outlined-btn"
          onClick={resetFilters}
          disabled={loading}
        >
          Clear Filters
        </button>
        <button 
          className="primary-contained-btn" 
          onClick={() => getData(filters, 1, pagination.pageSize)}
          disabled={loading}
        >
          Search
        </button>
      </div>
      <Table 
        columns={columns} 
        dataSource={reportsData} 
        className="mt-2"
        loading={loading}
        rowKey="_id"
        pagination={pagination}
        onChange={handleTableChange}
        locale={{
          emptyText: 'No reports found'
        }}
      />
    </div>
  );
}

export default AdminReports;
