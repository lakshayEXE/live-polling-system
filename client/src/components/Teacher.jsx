
// client/src/components/Teacher.jsx
import React, { useState, useEffect, useRef } from 'react';
import socketService from '../services/socketService.jsx';
import './Teacher.css';
import NameList from './StudentList.jsx';

// Helper Function to Calculate Percentages
const calculatePollPercentages = (results, options = []) => {
    const validResults = results && typeof results === 'object' ? results : {};
    const totalVotes = Object.values(validResults).reduce((sum, count) => sum + (Number(count) || 0), 0);
    const percentages = {};
    options.forEach(option => {
        percentages[option] = 0;
    });
    if (totalVotes > 0) {
        Object.entries(validResults).forEach(([option, count]) => {
            if (percentages.hasOwnProperty(option)) {
                percentages[option] = Math.round(((Number(count) || 0) / totalVotes) * 100);
            }
        });
    }
    return { percentages, totalVotes };
};

function Teacher() {
    // State variables
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [currentPoll, setCurrentPoll] = useState(null);
    const [pollResults, setPollResults] = useState({});
    const [previousPolls, setPreviousPolls] = useState([]);
    const [students, setStudents] = useState({});
    const [timer, setTimer] = useState('60 seconds');
    // New state for correct answers
    const [correctAnswers, setCorrectAnswers] = useState({0: false, 1: false});
    const socketRef = useRef(null);

    // Effect hook for socket connection and event listeners
    useEffect(() => {
        socketRef.current = socketService.connect();
        const socket = socketRef.current;

        console.log("Connecting to socket and requesting previous polls...");
        socket.emit('get_previous_polls');

        socket.on('new_poll', (newPollData) => {
            console.log('Teacher received new_poll:', newPollData);
            if (currentPoll) {
                const finishedPoll = {
                    poll: currentPoll,
                    results: pollResults
                };
                setPreviousPolls(prevPolls => [finishedPoll, ...prevPolls]);
                console.log('Archived previous poll:', finishedPoll);
            }
            setCurrentPoll(newPollData);
            setPollResults({});
        });

        socket.on('poll_results', (results) => {
            console.log('Teacher received poll_results update:', results);
            setPollResults(results || {});
        });

        socket.on('previous_polls_data', (data) => {
            console.log('Teacher received previous_polls_data:', data);
            setPreviousPolls(Array.isArray(data) ? data : []);
        });

        socket.on('poll_error', (error) => {
            console.error('Poll Error (Teacher):', error.message);
            alert(`Poll Error: ${error.message || 'An unknown error occurred'}`);
        });

        socket.on("Recieved_student_list", ({studentnames}) => {
            setStudents(studentnames);
            console.log(students);
        });

        return () => {
            console.log("Cleaning up teacher socket listeners...");
            socket.off('new_poll');
            socket.off('poll_results');
            socket.off('poll_error');
            socket.off('previous_polls_data');
            socket.off('Recieved_student_list');
        };
    }, [currentPoll, pollResults]);

    // Form Handling Functions
    const addOption = () => {
        if (options.length < 10) {
            const newIndex = options.length;
            setOptions([...options, '']);
            setCorrectAnswers({...correctAnswers, [newIndex]: false});
        }
    };
    
    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };
    
    const removeOption = (index) => {
        if (options.length > 2) {
            setOptions(options.filter((_, i) => i !== index));
            // Update correctAnswers when removing an option
            const newCorrectAnswers = {...correctAnswers};
            delete newCorrectAnswers[index];
            // Shift keys greater than index down by 1
            Object.keys(newCorrectAnswers)
                .filter(key => Number(key) > index)
                .forEach(key => {
                    newCorrectAnswers[Number(key) - 1] = newCorrectAnswers[key];
                    delete newCorrectAnswers[key];
                });
            setCorrectAnswers(newCorrectAnswers);
        }
    };
    
    const toggleCorrectAnswer = (index, isCorrect) => {
        setCorrectAnswers({...correctAnswers, [index]: isCorrect});
    };

    // Poll Creation Logic
    const createPoll = (e) => {
        e.preventDefault();
        const socket = socketRef.current;
        const trimmedQuestion = question.trim();
        const validOptions = options.map(opt => opt.trim()).filter(opt => opt.length > 0);

        if (!trimmedQuestion) return alert('Please enter a poll question.');
        if (validOptions.length < 2) return alert('Please provide at least two valid options.');
        if (!socket) return alert('Not connected to the server. Cannot create poll.');

        // Include correct answers in poll data
        const pollData = { 
            question: trimmedQuestion, 
            options: validOptions,
            correctAnswers: correctAnswers,
            duration: timer
        };
        
        console.log('Attempting to create poll with data:', pollData);
        socket.emit('create_poll', pollData);

        setQuestion('');
        setOptions(['', '']);
        setCorrectAnswers({0: false, 1: false});
    };

    // Calculate Percentages for the CURRENT Poll
    const { percentages: currentPercentages, totalVotes: currentTotalVotes } = calculatePollPercentages(
        pollResults,
        currentPoll?.options
    );

    function getStudentList() {
        const socket = socketRef.current;
        socket.emit("Get-students");
    }

    // Calculate character count for the question
    const questionCharCount = question.length;
    const maxQuestionLength = 100; // Set your max length here

    return (
        <div className="teacher-container">
            {/* Intervue Poll Header */}
            <div className="intervue-header">
                <div className="intervue-logo">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 3L4 9V21H9V14H15V21H20V9L12 3Z" fill="white" />
                    </svg>
                    Intervue Poll
                </div>
            </div>

            {/* Main heading */}
            <h1>Let's Get Started</h1>
            <p>You'll have the ability to create and manage polls, ask questions, and monitor your students' responses in real-time.</p>

            {/* Poll Creation Form */}
            <form onSubmit={createPoll}>
                <div className="question-section">
                    <label htmlFor="pollQuestion">Enter your question</label>
                    <input
                        type="text"
                        id="pollQuestion"
                        className="question-input"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Type your question here"
                        maxLength={maxQuestionLength}
                    />
                    <div className="character-counter">{questionCharCount}/{maxQuestionLength}</div>
                    
                    <div className="timer-dropdown">
                        <select value={timer} onChange={(e) => setTimer(e.target.value)}>
                            <option value={30}>30 seconds</option>
                            <option value={60}>60 seconds</option>
                            <option value={90}>90 seconds</option>
                            <option value={120}>120 seconds</option>
                        </select>
                    </div>
                </div>

                <div className="options-section">
                    {options.map((option, index) => (
                        <div key={index} className="option-item">
                            <div className="option-number">{index + 1}</div>
                            <input
                                type="text"
                                className="option-input"
                                value={option}
                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                placeholder={`Option ${index + 1}`}
                            />
                            
                            <div className="correctness-section">
                                <p>Is it Correct?</p>
                                <div className="correctness-option">
                                    <div 
                                        className={`radio-custom ${correctAnswers[index] === true ? 'selected' : ''}`}
                                        onClick={() => toggleCorrectAnswer(index, true)}
                                    ></div>
                                    <span>Yes</span>
                                </div>
                                <div className="correctness-option">
                                    <div 
                                        className={`radio-custom ${correctAnswers[index] === false ? 'selected' : ''}`}
                                        onClick={() => toggleCorrectAnswer(index, false)}
                                    ></div>
                                    <span>No</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    <button type="button" onClick={addOption} className="add-option-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 4V20M4 12H20" stroke="#7051DE" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Add More option
                    </button>
                </div>

                <button type="submit" className="create-btn">Create</button>
            </form>

            {/* Active Poll Results (if you want to keep this section) */}
            {currentPoll && (
                <div className="current-poll-display section-box">
                    <h3>Active Poll Results</h3>
                    <p className="poll-question">{currentPoll.question}</p>
                    <div className="total-votes">Total Votes: {currentTotalVotes}</div>
                    <div className="results-container">
                        {currentPoll.options.map((option) => (
                            <div key={option} className="result-item">
                                <div className="result-label">
                                    <span>{option}</span>
                                    <span>
                                        {pollResults[option] || 0} vote(s) ({currentPercentages[option] || 0}%)
                                    </span>
                                </div>
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${currentPercentages[option] || 0}%` }}
                                        aria-valuenow={currentPercentages[option] || 0}
                                        aria-valuemin="0"
                                        aria-valuemax="100"
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className='student-list'>
                        <button onClick={getStudentList}>Get Student-List</button>
                        {students && <NameList initialNames={students}/>}
                    </div>
                </div>
            )}

            {/* Previous Polls (if you want to keep this section) */}
            {previousPolls.length > 0 && (
                <div className="previous-polls-display section-box">
                    <h3>Previous Polls</h3>
                    {previousPolls.map((prevPollData, index) => {
                        if (!prevPollData || !prevPollData.poll || !prevPollData.results || !Array.isArray(prevPollData.poll.options)) {
                            console.error("Invalid previous poll data structure at index:", index, prevPollData);
                            return <div key={`error-${index}`}>Error displaying previous poll data.</div>;
                        }

                        const { percentages: prevPercentages, totalVotes: prevTotalVotes } = calculatePollPercentages(
                            prevPollData.results,
                            prevPollData.poll.options
                        );
                        const key = prevPollData.poll.id || `prev-${index}`;
                        return (
                            <div key={key} className="previous-poll-item">
                                <p className="poll-question">
                                    <strong>{index + 1}. {prevPollData.poll.question}</strong>
                                </p>
                                <div className="total-votes">Total Votes: {prevTotalVotes}</div>
                                <div className="results-container">
                                    {prevPollData.poll.options.map((option) => (
                                        <div key={option} className="result-item">
                                            <div className="result-label">
                                                <span>{option}</span>
                                                <span>
                                                    {prevPollData.results[option] || 0} vote(s) ({prevPercentages[option] || 0}%)
                                                </span>
                                            </div>
                                            <div className="progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{ width: `${prevPercentages[option] || 0}%` }}
                                                    aria-valuenow={prevPercentages[option] || 0}
                                                    aria-valuemin="0"
                                                    aria-valuemax="100"
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Display message if no polls */}
            {!currentPoll && previousPolls.length === 0 && (
                <p className="info-message">No active poll and no previous polls found. Create a new poll to get started!</p>
            )}
        </div>
    );
}

export default Teacher;
