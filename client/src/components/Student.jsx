
// client/src/components/Student.jsx
import React, { useState, useEffect, useRef } from 'react';
import socketService from '../services/socketService.jsx'; // Adjust path if needed
import './Student.css'; // Ensure this CSS file has the updated styles

function Student() {
  const [studentName, setStudentName] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [currentPoll, setCurrentPoll] = useState(null);
  const [selectedOption, setSelectedOption] = useState(''); // Holds the currently selected radio value
  const [hasAnswered, setHasAnswered] = useState(false); // Tracks if student answered (submitted or timed out)
  const [pollResults, setPollResults] = useState({}); // Holds results received from server
  const [timeLeft, setTimeLeft] = useState(null); // Countdown timer
  const [isWaitingForResults, setIsWaitingForResults] = useState(false); // Loading indicator for results
  const socketRef = useRef(null); // Persistent socket instance
  const answerSubmittedRef = useRef(false); // Tracks if server confirmed answer receipt for *current* poll

  // --- Effect for Socket Connection and Event Listeners ---
  useEffect(() => {
    socketRef.current = socketService.connect();
    const socket = socketRef.current;

    const savedName = localStorage.getItem('studentName');
    if (savedName) {
      setStudentName(savedName);
      setIsRegistered(true);
      console.log(`Attempting to re-register student: ${savedName}`);
      socket.emit('register_student', savedName);
    }

    socket.on('new_poll', (pollData) => {
      console.log('Received new poll:', pollData);
      setCurrentPoll(pollData);
      setSelectedOption(''); // Reset selection for new poll
      setHasAnswered(false);  // Reset answered status
      setTimeLeft(pollData.duration || 60); // Use duration from poll or default 60s
      setPollResults({});     // Clear old results
      setIsWaitingForResults(false); // Not waiting initially
      answerSubmittedRef.current = false; // Reset submission confirmation flag
    });

    socket.on('poll_results', (results) => {
      console.log('Received poll results:', results);
      setPollResults(results || {});
      setIsWaitingForResults(false); // Results received
    });

    socket.on('answer_received', (data) => {
      // Ensure confirmation is for the current poll
      if (data.success && currentPoll && data.pollId === currentPoll.id) {
        console.log(`Server confirmed answer received: ${data.answer} for poll ID: ${data.pollId}`);
        answerSubmittedRef.current = true; // Mark as successfully submitted
        // Now request results (server might also push results, but requesting ensures we get them)
        console.log("Requesting results after answer confirmation...");
        if (!isWaitingForResults) { // Avoid duplicate requests if timer also triggered
          socket.emit('get_results');
          setIsWaitingForResults(true);
        }
      }
    });

    // --- Error Handlers ---
    socket.on('answer_error', (message) => {
      console.error('Answer Error:', message);
      alert(`Error submitting answer: ${message}`);
      // Potentially reset state to allow re-submission if applicable
      setHasAnswered(false);
      setIsWaitingForResults(false);
      answerSubmittedRef.current = false;
    });
    socket.on('poll_error', (error) => {
      console.error('Poll Error:', error.message);
      alert(`Poll Error: ${error.message}`);
      setCurrentPoll(null); // Clear broken poll
    });
    socket.on('results_error', (error) => {
      console.error('Results Error:', error.message);
      alert(`Error fetching results: ${error.message}`);
      setIsWaitingForResults(false);
    });

    return () => {
      console.log("Cleaning up student socket listeners...");
      if (socket) {
        socket.off('new_poll');
        socket.off('poll_results');
        socket.off('answer_received');
        socket.off('answer_error');
        socket.off('poll_error');
        socket.off('results_error');
      }
      // Optional: Disconnect if appropriate
      // socketService.disconnect();
    };
  }, [currentPoll]); // Re-run if currentPoll changes (e.g., to attach correct pollId logic)

  // --- Effect for Countdown Timer ---
  useEffect(() => {
    let timerId = null;
    const socket = socketRef.current;

    if (currentPoll && !hasAnswered && timeLeft > 0) {
      timerId = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timerId);
            console.log("Timer ended.");
            setHasAnswered(true); // Mark as answered due to timeout
             // Request results only if an answer hasn't already been confirmed as submitted
             if (socket && !answerSubmittedRef.current && !isWaitingForResults) {
                console.log("Requesting results due to timeout...");
                socket.emit('get_results');
                setIsWaitingForResults(true);
            }
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  // Depend on `hasAnswered` to stop the timer once an answer is submitted or time runs out.
  // Depend on `timeLeft` to react to its changes.
  // Depend on `currentPoll` to start timer for a new poll.
  // Depend on `isWaitingForResults` to avoid duplicate result requests on timeout.
  }, [currentPoll, hasAnswered, timeLeft, isWaitingForResults]);

  // --- Handler for Student Registration ---
  const registerStudent = (e) => {
    e.preventDefault();
    const socket = socketRef.current;
    const trimmedName = studentName.trim();

    if (!trimmedName) {
      alert('Please enter your name');
      return;
    }
    if (!socket) {
      alert('Not connected to server. Please refresh.');
      return;
    }

    localStorage.setItem('studentName', trimmedName);
    setIsRegistered(true);
    console.log(`Registering student: ${trimmedName}`);
    socket.emit('register_student', trimmedName);
  };

  // --- Handler for Submitting Answer ---
  const submitAnswer = (e) => {
    e.preventDefault();
    const socket = socketRef.current;

    if (!selectedOption) {
      alert('Please select an option');
      return;
    }
    if (!socket || !currentPoll) {
      alert('Cannot submit: No connection or no active poll.');
      return;
    }
    // Prevent re-submission
    if (hasAnswered) {
        alert('You have already answered or the time has expired for this poll.');
        return;
    }

    console.log(`Submitting answer: ${selectedOption} for poll ID: ${currentPoll.id}`);
    socket.emit('submit_answer', { pollId: currentPoll.id, answer: selectedOption });
    setHasAnswered(true); // Mark as answered immediately
    setIsWaitingForResults(true); // Show waiting indicator
    // We do NOT clear selectedOption here - keep it to display "Your answer" later
    // We rely on `answer_received` event for confirmation via `answerSubmittedRef.current`
  };

  // --- Calculate Percentages for Results Display ---
  const calculatePercentages = () => {
    // Ensure pollResults is treated as an object
    const results = pollResults || {};
    const totalVotes = Object.values(results).reduce((sum, count) => sum + (Number(count) || 0), 0);

    if (totalVotes === 0 || !currentPoll || !currentPoll.options) {
      const zeroPercentages = {};
      if (currentPoll && currentPoll.options) {
        currentPoll.options.forEach(option => {
          zeroPercentages[option] = 0;
        });
      }
      return zeroPercentages;
    }

    const percentages = {};
    currentPoll.options.forEach(option => {
      percentages[option] = Math.round(((results[option] || 0) / totalVotes) * 100);
    });
    return percentages;
  };

  const percentages = calculatePercentages();
  const totalVoteCount = Object.values(pollResults || {}).reduce((sum, count) => sum + (Number(count) || 0), 0);

  // --- Render Logic ---

  // Registration Form
  if (!isRegistered) {
    return (
      <div className="student-container"> {/* Centering handled by body/margin */ }
        <form onSubmit={registerStudent} className="registration-form">
           <h2>Student Registration</h2>
          <div className="form-group">
            <label htmlFor="studentName">Your Name:</label>
            <input
              type="text"
              id="studentName"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Enter your name"
              required
              autoFocus
            />
          </div>
          <button type="submit" className="register-btn">Join Poll</button>
        </form>
      </div>
    );
  }

  // Main View (Registered Student)
  return (
    <div className="student-container">
      {/* Optional: Simple welcome */}
      {/* <h2 style={{ textAlign: 'center', marginBottom: '1rem', color: '#555' }}>Welcome, {studentName}!</h2> */}

      {!currentPoll ? (
        <div className="waiting-poll">
          <p>Welcome, {studentName}!</p>
          <p>Waiting for the teacher to start a poll...</p>
        </div>
      ) : (
        <div className="poll-section">
          {/* --- Poll Header --- */}
          <div className="poll-header">
            <span className="question-number">Question {currentPoll.id || ''}</span>
            {/* Show timer only when voting is active */}
            {!hasAnswered && timeLeft > 0 && (
              <span className="timer">
                {/* Format MM:SS */}
                {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:
                {String(timeLeft % 60).padStart(2, '0')}
              </span>
            )}
             {/* Show 00:00 if time ran out but results not yet loaded */}
             {hasAnswered && timeLeft === 0 && isWaitingForResults && (
               <span className="timer">00:00</span>
             )}
          </div>

          {/* --- Poll Question --- */}
          <div className="poll-question">{currentPoll.question}</div>

          {/* --- Voting Form (shown if not answered and time > 0) --- */}
          {!hasAnswered && timeLeft > 0 ? (
            <>
              <form onSubmit={submitAnswer} className="answer-form">
                <div className="options-area">
                  <div className="options-container">
                    {currentPoll.options.map((option, index) => (
                      <div
                        key={index}
                        // Apply 'selected' class based on state
                        className={`option-item ${selectedOption === option ? 'selected' : ''}`}
                        // Click handler for the entire item
                        onClick={() => setSelectedOption(option)}
                      >
                        {/* Hidden actual radio input */}
                        <input
                          type="radio"
                          id={`option-${index}`}
                          name="pollOption"
                          value={option}
                          checked={selectedOption === option}
                          onChange={() => {}} // Change handled by div click
                          required
                          style={{ display: 'none' }} // Ensure it's visually hidden
                        />
                        {/* Styled number */}
                        <span className="option-number">{index + 1}</span>
                        {/* Label for accessibility and text */}
                        <label htmlFor={`option-${index}`}>{option}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  className="submit-btn"
                  // Disable button if no option is chosen
                  disabled={!selectedOption}
                >
                  Submit
                </button>
              </form>
            </>
          ) : (
            // --- Results/Waiting View (shown if answered or time ran out) ---
            <div className="results-section">
              <h3>Poll Results</h3>
              {isWaitingForResults ? (
                <p style={{ textAlign: 'center', padding: '2rem 0' }}>Loading results...</p>
              ) : (
                <>
                  {Object.keys(pollResults).length > 0 ? ( // Check if results object is not empty
                    <>
                      <div className="total-votes">Total Votes: {totalVoteCount}</div>
                      <div className="results-container">
                        {currentPoll.options.map((option) => (
                          <div key={option} className="result-item">
                            <div className="result-label">
                              <span>{option}</span>
                              <span>{pollResults[option] || 0} vote(s) ({percentages[option] || 0}%)</span>
                            </div>
                            <div className="progress-bar">
                              <div
                                // Apply 'selected' class to the bar fill if this was the student's choice
                                className={`progress-fill ${selectedOption === option ? 'selected' : ''}`}
                                style={{ width: `${percentages[option] || 0}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                       {/* Show submitted answer message only if an answer was actually selected and submitted */}
                      {selectedOption && answerSubmittedRef.current && (
                        <div className="your-answer">
                          Your submitted answer: <strong>{selectedOption}</strong>
                        </div>
                      )}
                    </>
                  ) : (
                     // Message if results are requested but empty (e.g., no one voted)
                     <p style={{ textAlign: 'center', color: '#777', padding: '2rem 0' }}>
                         Results are not yet available or no votes were cast.
                     </p>
                  )}

                  {/* Message for timeout if no answer was ever selected */}
                  {!selectedOption && hasAnswered && timeLeft <= 0 && (
                    <div className="your-answer" style={{ backgroundColor: '#fffbe6', borderLeftColor: '#f39c12'}}>
                      Time ran out before you selected or submitted an answer.
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Student;