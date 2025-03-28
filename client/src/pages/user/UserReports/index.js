import React, { useEffect, useCallback, useRef, useState } from "react";
import PageTitle from "../../../components/PageTitle";
import { message, Table, Button, Input, Select } from "antd";
import { useDispatch } from "react-redux";
import { HideLoading, ShowLoading } from "../../../redux/loaderSlice";
import { getAllReportsByUser } from "../../../apicalls/reports";
import moment from "moment";

const { Search } = Input;
const { Option } = Select;

function UserReports() {
  const [reportsData, setReportsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const dispatch = useDispatch();
  const dataFetchedRef = useRef(false);

  const columns = [
    {
      title: "Exam Name",
      dataIndex: "examName",
      render: (text, record) => <>{record?.exam?.name || "Unknown Exam"}</>,
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
      title: "Time Taken",
      dataIndex: "timeTaken",
      render: (text, record) => {
        const minutes = Math.floor(record?.result?.timeTaken / 60);
        const seconds = record?.result?.timeTaken % 60;
        return <>{minutes}m {seconds}s</>;
      }
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

  const getData = useCallback(async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      dispatch(ShowLoading());
      const response = await getAllReportsByUser({ page, limit });
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
  }, [dispatch]);

  const handleTableChange = (pagination, filters, sorter) => {
    getData(pagination.current, pagination.pageSize);
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  const handleFilterChange = (value) => {
    setFilter(value);
  };

  const filteredReports = reportsData.filter((report) => {
    const matchesSearchTerm = report.exam.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "all" || report.result.verdict === filter;
    return matchesSearchTerm && matchesFilter;
  });

  useEffect(() => {
    if (!dataFetchedRef.current) {
      dataFetchedRef.current = true;
      getData();
    }
    
    return () => {
      dataFetchedRef.current = false;
    };
  }, [getData]);

  return (
    <div>
      <PageTitle title="Your Reports" />
      <div className="divider"></div>
      
      <div className="flex justify-between mb-3">
        <Button 
          type="primary" 
          onClick={() => getData(1, pagination.pageSize)}
          loading={loading}
        >
          Refresh
        </Button>
        <Search
          placeholder="Search by exam name"
          onSearch={handleSearch}
          enterButton
          className="search-input"
        />
        <Select
          value={filter}
          onChange={handleFilterChange}
          className="filter-select"
        >
          <Option value="all">All</Option>
          <Option value="Pass">Pass</Option>
          <Option value="Fail">Fail</Option>
        </Select>
      </div>

      <Table 
        columns={columns} 
        dataSource={filteredReports} 
        rowKey="_id"
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
        locale={{
          emptyText: 'No reports found'
        }}
      />
    </div>
  );
}

export default UserReports;
