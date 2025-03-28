import { message } from "antd";
import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { getExamById } from "../../../apicalls/exams";
import { addReport } from "../../../apicalls/reports";
import { HideLoading, ShowLoading } from "../../../redux/loaderSlice";
import LottiePlayer from "../../../components/LottiePlayer";
import Instructions from "./Instructions";

function WriteExam() {
  const [examData, setExamData] = React.useState(null);
  const [questions, setQuestions] = React.useState([]);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = React.useState(0);
  const [selectedOptions, setSelectedOptions] = React.useState({});
  const [result, setResult] = React.useState({});
  const [view, setView] = useState("instructions");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [intervalId, setIntervalId] = useState(null);
  const params = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.users);
  
  // Timer persistence keys
  const TIMER_STORAGE_KEY = `quiz_timer_${params.id}`;
  const OPTIONS_STORAGE_KEY = `quiz_options_${params.id}`;
  const QUESTION_INDEX_KEY = `quiz_question_index_${params.id}`;
  const VIEW_STATE_KEY = `quiz_view_${params.id}`;
  
  // Define clearExamStorage first to fix circular dependency
  const clearExamStorage = useCallback(() => {
    localStorage.removeItem(TIMER_STORAGE_KEY);
    localStorage.removeItem(OPTIONS_STORAGE_KEY);
    localStorage.removeItem(QUESTION_INDEX_KEY);
    localStorage.removeItem(VIEW_STATE_KEY);
    localStorage.removeItem(`exam_start_${params.id}`);
  }, [params.id, TIMER_STORAGE_KEY, OPTIONS_STORAGE_KEY, QUESTION_INDEX_KEY, VIEW_STATE_KEY]);

  // Define startTimerFromSaved before getExamData to avoid the circular reference error
  const startTimerFromSaved = useCallback((seconds) => {
    if (!examData) {
      message.error("Exam data not loaded properly. Please try again.");
      navigate("/");
      return;
    }
    
    if (intervalId) {
      clearInterval(intervalId);
    }
    
    let totalSeconds = seconds;
    const now = new Date().getTime();
    const expiryTime = now + (totalSeconds * 1000);
    
    // Save expiry time to localStorage
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ 
      expiryTime,
      duration: examData.duration
    }));
    localStorage.setItem(VIEW_STATE_KEY, 'questions');
    
    const newIntervalId = setInterval(() => {
      if (totalSeconds > 0) {
        totalSeconds = totalSeconds - 1;
        setSecondsLeft(totalSeconds);
      } else {
        clearInterval(newIntervalId); // Clear interval when timer expires
        setTimeUp(true);
        console.log("Timer expired from saved timer"); // Debug log
      }
    }, 1000);
    
    setIntervalId(newIntervalId);
  }, [examData, intervalId, navigate, TIMER_STORAGE_KEY, VIEW_STATE_KEY]);

  // Now define getExamData after startTimerFromSaved
  const getExamData = useCallback(async () => {
    try {
      dispatch(ShowLoading());
      const response = await getExamById({
        examId: params.id,
      });
      dispatch(HideLoading());
      if (response.success) {
        console.log("Raw exam data:", response.data);
        
        // Process questions to handle options in the right format based on the sample data
        const processedQuestions = response.data.questions.map(question => {
          console.log("Processing question:", question);
          return question; // Keep the original structure as shown in the sample
        });
        
        setQuestions(processedQuestions);
        setExamData(response.data);
        
        // Check if there's a saved timer state
        const savedTimerState = localStorage.getItem(TIMER_STORAGE_KEY);
        const savedOptions = localStorage.getItem(OPTIONS_STORAGE_KEY);
        const savedQuestionIndex = localStorage.getItem(QUESTION_INDEX_KEY);
        const savedView = localStorage.getItem(VIEW_STATE_KEY);
        
        if (savedTimerState && savedView === 'questions') {
          const parsedTimerState = JSON.parse(savedTimerState);
          const expiryTime = parsedTimerState.expiryTime;
          const now = new Date().getTime();
          
          // Calculate remaining time
          if (expiryTime > now) {
            const remainingSeconds = Math.floor((expiryTime - now) / 1000);
            setSecondsLeft(remainingSeconds);
            setView('questions');
            startTimerFromSaved(remainingSeconds);
          } else {
            // Timer expired while away
            setSecondsLeft(response.data.duration);
            clearExamStorage();
          }
          
          // Restore saved options if available
          if (savedOptions) {
            setSelectedOptions(JSON.parse(savedOptions));
          }
          
          // Restore question index
          if (savedQuestionIndex) {
            setSelectedQuestionIndex(parseInt(savedQuestionIndex));
          }
        } else {
          setSecondsLeft(response.data.duration);
          clearExamStorage();
        }
      } else {
        message.error(response.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  }, [dispatch, params.id, clearExamStorage, startTimerFromSaved]);

  const calculateResult = useCallback(async () => {
    try {
      if (!examData) {
        message.error("Exam data not loaded properly. Cannot calculate results.");
        navigate("/");
        return;
      }

      const startTime = parseInt(localStorage.getItem(`exam_start_${params.id}`)) || Date.now() - (examData.duration * 1000);
      const endTime = new Date().getTime();
      const timeTaken = Math.floor((endTime - startTime) / 1000); // Convert to seconds

      let correctAnswers = [];
      let wrongAnswers = [];

      questions.forEach((question, index) => {
        if (selectedOptions[index] && question.correctOption === selectedOptions[index]) {
          correctAnswers.push(question._id);
        } else {
          wrongAnswers.push(question._id);
        }
      });

      let verdict = "Pass";
      if (correctAnswers.length < examData.passingMarks) {
        verdict = "Fail";
      }

      const tempResult = {
        correctAnswers,
        wrongAnswers,
        verdict,
        timeTaken
      };
      setResult(tempResult);
      clearExamStorage();
      
      console.log("Submitting result:", tempResult); // Debug log
      
      dispatch(ShowLoading());
      const response = await addReport({
        exam: params.id,
        result: tempResult,
        user: user?._id
      });
      dispatch(HideLoading());
      
      if (response.success) {
        setView("result");
      } else {
        message.error(response.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  }, [dispatch, questions, selectedOptions, examData, params.id, user, clearExamStorage, navigate]);

  const resetExamState = () => {
    setSelectedQuestionIndex(0);
    setSelectedOptions({});
    setSecondsLeft(examData.duration);
    setResult({});
    setTimeUp(false);
    clearExamStorage();
    
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  };

  // Memoize startTimer to prevent unnecessary recreations
  const startTimer = useCallback(() => {
    if (!examData) {
      message.error("Exam data not loaded properly. Please try again.");
      navigate("/");
      return;
    }
    
    if (intervalId) {
      clearInterval(intervalId);
    }
    
    let totalSeconds = examData.duration;
    const now = new Date().getTime();
    const expiryTime = now + (totalSeconds * 1000);
    
    // Save start time for calculating total time taken
    const examId = examData._id || params.id;
    localStorage.setItem(`exam_start_${examId}`, now.toString());
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ 
      expiryTime,
      duration: examData.duration
    }));
    localStorage.setItem(VIEW_STATE_KEY, 'questions');
    
    const newIntervalId = setInterval(() => {
      if (totalSeconds > 0) {
        totalSeconds = totalSeconds - 1;
        setSecondsLeft(totalSeconds);
      } else {
        clearInterval(newIntervalId);
        setTimeUp(true);
      }
    }, 1000);
    
    setIntervalId(newIntervalId);
  }, [examData, intervalId, navigate, params.id]);

  // Clean up timers and storage
  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (view !== 'questions') {
        clearExamStorage();
      }
    };
  }, [intervalId, view]);

  // Handle beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (view === 'questions') {
        e.preventDefault();
        e.returnValue = "You have an exam in progress. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [view]);

  // Load exam data
  useEffect(() => {
    if (params.id) {
      getExamData();
    }
  }, [params.id, getExamData]);

  // Handle time up condition
  useEffect(() => {
    if (timeUp && view === "questions") {
      if (intervalId) {
        clearInterval(intervalId);
      }
      clearExamStorage();
      calculateResult();
    }
  }, [timeUp, view, intervalId, calculateResult]);

  // Save exam progress
  useEffect(() => {
    if (Object.keys(selectedOptions).length > 0 && view === 'questions') {
      localStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(selectedOptions));
    }
  }, [selectedOptions, view]);

  // Save question index
  useEffect(() => {
    if (view === 'questions') {
      localStorage.setItem(QUESTION_INDEX_KEY, selectedQuestionIndex.toString());
    }
  }, [selectedQuestionIndex, view]);

  return (
    examData && (
      <div className="mt-2">
        <div className="divider"></div>
        <h1 className="text-center">{examData.name}</h1>
        <div className="divider"></div>

        {view === "instructions" && (
          <Instructions
            examData={examData}
            setView={setView}
            startTimer={startTimer}
          />
        )}

        {view === "questions" && questions.length > 0 && (
          <div className="flex flex-col gap-2">
            {/* Question navigation buttons */}
            <div className="flex flex-wrap gap-2 mb-2 justify-center">
              {questions.map((q, i) => (
                <div 
                  key={i} 
                  onClick={() => setSelectedQuestionIndex(i)}
                  className={`
                    cursor-pointer px-3 py-1 rounded-full text-sm font-medium
                    ${selectedQuestionIndex === i ? 'bg-primary text-white' : 
                      selectedOptions[i] ? 'bg-success text-white' : 'bg-light'}
                  `}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center">
              <h1 className="text-2xl">
                {selectedQuestionIndex + 1} :{" "}
                {questions[selectedQuestionIndex]?.name}
              </h1>
              <div className="timer">
                <span>{secondsLeft}</span>
              </div>
            </div>
            
            {/* Enhanced options display */}
            <div className="options-container">
              {questions[selectedQuestionIndex]?.options && 
                Object.keys(questions[selectedQuestionIndex].options).map((option) => {
                  const isSelected = selectedOptions[selectedQuestionIndex] === option;
                  const optionText = questions[selectedQuestionIndex].options[option] || `Option ${option}`;
                  
                  return (
                    <div
                      className={`quiz-option ${isSelected ? "selected-option" : ""}`}
                      key={`${questions[selectedQuestionIndex]._id}_${option}`}
                      onClick={() => {
                        setSelectedOptions({
                          ...selectedOptions,
                          [selectedQuestionIndex]: option,
                        });
                      }}
                    >
                      <span className="option-letter">{option}:</span>
                      <span className="option-text">{optionText}</span>
                    </div>
                  );
                })
              }
            </div>

            <div className="flex justify-between">
              {selectedQuestionIndex > 0 && (
                <button
                  className="primary-outlined-btn"
                  onClick={() => {
                    setSelectedQuestionIndex(selectedQuestionIndex - 1);
                  }}
                >
                  Previous
                </button>
              )}

              {selectedQuestionIndex < questions.length - 1 && (
                <button
                  className="primary-contained-btn"
                  onClick={() => {
                    setSelectedQuestionIndex(selectedQuestionIndex + 1);
                  }}
                >
                  Next
                </button>
              )}

              {selectedQuestionIndex === questions.length - 1 && (
                <button
                  className="primary-contained-btn"
                  onClick={() => {
                    clearInterval(intervalId);
                    clearExamStorage();
                    setTimeUp(true);
                  }}
                >
                  Submit
                </button>
              )}
            </div>
          </div>
        )}

        {/* Rest of the component remains the same */}
        {view === "result" && (
          <div className="flex items-center mt-2 justify-center result">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl">RESULT</h1>
              <div className="divider"></div>
              <div className="marks">
                <h1 className="text-md">Total Marks : {examData.totalMarks}</h1>
                <h1 className="text-md">
                  Obtained Marks :{result.correctAnswers?.length || 0}
                </h1>
                <h1 className="text-md">
                  Wrong Answers : {result.wrongAnswers?.length || 0}
                </h1>
                <h1 className="text-md">
                  Passing Marks : {examData.passingMarks}
                </h1>
                <h1 className="text-md">VERDICT :{result.verdict}</h1>

                <div className="flex gap-2 mt-2">
                  <button
                    className="primary-outlined-btn"
                    onClick={() => {
                      resetExamState();
                      setView("instructions");
                    }}
                  >
                    Retake Exam
                  </button>
                  <button
                    className="primary-contained-btn"
                    onClick={() => {
                      setView("review");
                    }}
                  >
                    Review Answers
                  </button>
                </div>
              </div>
            </div>
            <div className="lottie-animation">
              {result.verdict === "Pass" && (
                <LottiePlayer
                  src="https://assets2.lottiefiles.com/packages/lf20_ya4ycrti.json"
                  background="transparent"
                  speed={1}
                  loop={true}
                  autoplay={true}
                  style={{ height: "300px", width: "300px" }}
                />
              )}

              {result.verdict === "Fail" && (
                <LottiePlayer
                  src="https://assets4.lottiefiles.com/packages/lf20_qp1spzqv.json"
                  background="transparent"
                  speed={1}
                  loop={true}
                  autoplay={true}
                  style={{ height: "300px", width: "300px" }}
                />
              )}
            </div>
          </div>
        )}

        {view === "review" && (
          <div className="flex flex-col gap-2">
            {questions.map((question, index) => {
              const isCorrect = question.correctOption === selectedOptions[index];
              
              // Get selected option text
              let selectedOptionText = "Not answered";
              if (selectedOptions[index]) {
                const selectedOption = question.options[selectedOptions[index]];
                selectedOptionText = selectedOption || `Option ${selectedOptions[index]}`;
              }
              
              // Get correct option text
              let correctOptionText = "Unknown";
              const correctOption = question.options[question.correctOption];
              if (correctOption) {
                correctOptionText = correctOption;
              }
              
              return (
                <div
                  key={question._id}
                  className={`
                    flex flex-col gap-1 p-2 ${
                      isCorrect ? "bg-success" : "bg-error"
                    }
                  `}
                >
                  <h1 className="text-xl">
                    {index + 1} : {question.name}
                  </h1>
                  <h1 className="text-md">
                    Submitted Answer : {selectedOptions[index] || "None"} -{" "}
                    {selectedOptionText}
                  </h1>
                  <h1 className="text-md">
                    Correct Answer : {question.correctOption} -{" "}
                    {correctOptionText}
                  </h1>
                </div>
              );
            })}

            <div className="flex justify-center gap-2">
              <button
                className="primary-outlined-btn"
                onClick={() => {
                  navigate("/");
                }}
              >
                Close
              </button>
              <button
                className="primary-contained-btn"
                onClick={() => {
                  resetExamState();
                  setView("instructions");
                }}
              >
                Retake Exam
              </button>
            </div>
          </div>
        )}
      </div>
    )
  );
}

export default WriteExam;
