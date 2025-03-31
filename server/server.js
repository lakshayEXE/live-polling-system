// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const cors = require('cors');

// // Initialize Express
// const app = express();
// app.use(cors());
// app.use(express.json());

// // Create HTTP server
// const server = http.createServer(app);

// // Initialize Socket.io
// const io = new Server(server, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"]
//   }
// });

// // Poll state
// let currentPoll = null;
// let pollResults = {};
// let activeStudents = {};

// // Socket.io connection handler
// io.on('connection', (socket) => {
//   console.log(`Client connected: ${socket.id}`);

//   // Register student
//   socket.on('register_student', (studentName) => {
//     activeStudents[socket.id] = {
//       name: studentName,
//       answered: false
//     };
//     console.log(`Student registered: ${studentName}`);
    
//     // Send current poll if exists
//     if (currentPoll) {
//       socket.emit('new_poll', currentPoll);
//     }
//   });

//   // Teacher creates a new poll
//   socket.on('create_poll', (pollData) => {
//     // Check if all students have answered the previous poll
//     const allAnswered = Object.values(activeStudents).every(student => student.answered) || !currentPoll;
    
//     if (allAnswered) {
//       currentPoll = {
//         id: Date.now(),
//         question: pollData.question,
//         options: pollData.options,
//         createdAt: Date.now()
//       };
      
//       pollResults = {};
//       pollData.options.forEach(option => {
//         pollResults[option] = 0;
//       });
      
//       // Reset answered status for all students
//       Object.keys(activeStudents).forEach(id => {
//         activeStudents[id].answered = false;
//       });
      
//       console.log('New poll created:', currentPoll.question);
//       io.emit('new_poll', currentPoll);
//     } else {
//       socket.emit('error', { message: 'Cannot create a new poll until all students have answered' });
//     }
//   });

//   // Student submits answer
//   socket.on('submit_answer', (answer) => {
//     if (!currentPoll) return;
    
//     const student = activeStudents[socket.id];
//     if (!student || student.answered) return;
    
//     // Record the answer
//     pollResults[answer] = (pollResults[answer] || 0) + 1;
//     activeStudents[socket.id].answered = true;
    
//     console.log(`Student ${student.name} answered: ${answer}`);
    
//     // Broadcast updated results
//     io.emit('poll_results', pollResults);
//   });

//   // Client requests current results
//   socket.on('get_results', () => {
//     socket.emit('poll_results', pollResults);
//   });

//   // Handle disconnection
//   socket.on('disconnect', () => {
//     if (activeStudents[socket.id]) {
//       console.log(`Student disconnected: ${activeStudents[socket.id].name}`);
//       delete activeStudents[socket.id];
//     }
//     console.log(`Client disconnected: ${socket.id}`);
//   });
// });

// // API endpoint to check if all students have answered
// app.get('/api/poll/status', (req, res) => {
//   const allAnswered = Object.values(activeStudents).every(student => student.answered) || !currentPoll;
//   res.json({ allAnswered });
// });

// // Start the server
// const PORT = process.env.PORT || 3001;
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });






// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const cors = require('cors');

// // --- Configuration ---
// const PORT = process.env.PORT || 3001; // Use environment variable or default port

// // --- Initialize Express and HTTP Server ---
// const app = express();
// const server = http.createServer(app);

// // --- Middleware ---
// // Enable CORS for all origins (adjust for production)
// app.use(cors());
// // Parse JSON request bodies
// app.use(express.json());

// // --- Initialize Socket.io ---
// const io = new Server(server, {
//   cors: {
//     origin: "*", // Allow all origins (restrict in production)
//     methods: ["GET", "POST"]
//   }
// });

// // --- Application State ---
// let currentPoll = null; // Holds the currently active poll object { id, question, options, createdAt }
// let pollResults = {};   // Holds the vote counts for the current poll { option1: count, option2: count }
// let activeStudents = {}; // Holds connected students { socketId: { name: studentName, answered: false } }

// // --- Socket.IO Connection Handler ---
// io.on('connection', (socket) => {
//   console.log(`Client connected: ${socket.id}`);

//   // --- Student Registration ---
//   socket.on('register_student', (studentName) => {
//     // Basic validation
//     if (!studentName || typeof studentName !== 'string' || studentName.trim().length === 0) {
//         console.log(`Invalid registration attempt from ${socket.id}`);
//         // Optionally send an error back: socket.emit('registration_error', 'Invalid name');
//         return;
//     }

//     const trimmedName = studentName.trim();
//     activeStudents[socket.id] = {
//       name: trimmedName,
//       answered: false // Initialize as not having answered the current/next poll
//     };
//     console.log(`Student registered: ${trimmedName} (Socket ID: ${socket.id})`);

//     // If a poll is already active when the student joins, send it to them
//     if (currentPoll) {
//       // Send the poll details and current results (if any exist)
//       socket.emit('new_poll', currentPoll);
//       // Send results immediately as well, so they see the current state
//       // This assumes joining students should see results immediately if available
//       socket.emit('poll_results', pollResults);
//     }
//   });

//   // --- Teacher Creates a New Poll ---
//   socket.on('create_poll', (pollData) => {
//     // Basic validation
//     if (!pollData || typeof pollData.question !== 'string' || !Array.isArray(pollData.options) || pollData.options.length < 2) {
//         console.log(`Invalid poll creation attempt from ${socket.id}`);
//         socket.emit('poll_error', { message: 'Invalid poll data. Need question and at least 2 options.' });
//         return;
//     }

//     // Optional: Check if all students have answered the previous poll (or if no poll active)
//     // const allAnswered = !currentPoll || Object.values(activeStudents).every(student => student.answered);
//     // if (!allAnswered) {
//     //   console.log(`Attempt to create poll denied: Not all students answered previous poll.`);
//     //   socket.emit('poll_error', { message: 'Cannot create a new poll yet. Wait for all students to answer.' });
//     //   return;
//     // }
//     // --- Note: The check above might be too restrictive in practice. Removing it for now. Teacher should decide when to create.

//     // Create the new poll object
//     currentPoll = {
//       id: `poll_${Date.now()}`, // Simple unique ID
//       question: pollData.question,
//       options: pollData.options,
//       createdAt: Date.now()
//     };

//     // Reset poll results, initializing all options to 0 votes
//     pollResults = {};
//     pollData.options.forEach(option => {
//       if (typeof option === 'string') { // Ensure options are strings
//         pollResults[option] = 0;
//       }
//     });

//     // Reset the 'answered' status for all currently connected students
//     Object.keys(activeStudents).forEach(id => {
//       activeStudents[id].answered = false;
//     });

//     console.log(`New poll created by ${socket.id}: "${currentPoll.question}"`);
//     // Broadcast the new poll details to ALL connected clients (students and teacher)
//     io.emit('new_poll', currentPoll);
//     // Also broadcast the reset results (all zeros)
//     io.emit('poll_results', pollResults);
//   });

//   // --- Student Submits an Answer ---
//   socket.on('submit_answer', (answer) => {
//     // 1. Check if a poll is active
//     if (!currentPoll) {
//       console.log(`Answer submitted by ${socket.id} but no poll is active.`);
//       // Optionally send error: socket.emit('answer_error', 'No active poll to answer.');
//       return;
//     }

//     // 2. Check if the submitting socket corresponds to a registered student
//     const student = activeStudents[socket.id];
//     if (!student) {
//       console.log(`Answer submitted by unregistered socket ${socket.id}.`);
//       // Optionally send error: socket.emit('answer_error', 'You must be registered to answer.');
//       return;
//     }

//     // 3. Check if the student has already answered this poll
//     if (student.answered) {
//       console.log(`Student ${student.name} (${socket.id}) attempted to answer again.`);
//       // Optionally send error: socket.emit('answer_error', 'You have already answered this poll.');
//       return;
//     }

//     // 4. Validate the answer against the current poll's options
//     if (!currentPoll.options.includes(answer)) {
//         console.log(`Student ${student.name} (${socket.id}) submitted invalid option: ${answer}`);
//         socket.emit('answer_error', 'Invalid option selected.');
//         return;
//     }

//     // 5. Record the valid answer
//     pollResults[answer]++; // Increment the count for the chosen option
//     activeStudents[socket.id].answered = true; // Mark the student as having answered

//     console.log(`Student ${student.name} (${socket.id}) answered: ${answer}`);

//     // --- IMPORTANT: Results Broadcasting Strategy ---
//     // We DO NOT broadcast results to everyone here.
//     // The client will request results via 'get_results' after submitting or on timeout.
//     // io.emit('poll_results', pollResults); // <-- This line is intentionally commented out/removed

//     // Optional: Send confirmation back to the specific student who submitted
//     socket.emit('answer_received', { success: true, answer: answer });

//   });

//   // --- Client Explicitly Requests Results ---
//   // This is triggered by the client after submitting or when its timer expires.
//   socket.on('get_results', () => {
//     if (!currentPoll) {
//       console.log(`Result request from ${socket.id} but no poll active.`);
//       // Optionally send error: socket.emit('results_error', 'No active poll.');
//       return;
//     }

//     console.log(`Sending results to ${socket.id} on request.`);
//     // Send the current results ONLY to the client that requested them
//     socket.emit('poll_results', pollResults);
//   });

//   // --- Handle Client Disconnection ---
//   socket.on('disconnect', () => {
//     const student = activeStudents[socket.id];
//     if (student) {
//       console.log(`Student disconnected: ${student.name} (Socket ID: ${socket.id})`);
//       // Remove the student from the active list
//       delete activeStudents[socket.id];
//       // Optional: If you need to update results based on disconnections (e.g., remove their vote),
//       // you would need more complex logic here to track which answer they gave.
//       // For simplicity, we currently keep their vote counted even if they disconnect.
//     } else {
//       console.log(`Client disconnected: ${socket.id} (was not registered as a student or teacher interface)`);
//     }
//     // Optional: Broadcast updated student list to a teacher interface if needed
//     // io.emit('student_list_update', Object.values(activeStudents).map(s => s.name));
//   });

//   // --- Error Handling ---
//   socket.on('error', (error) => {
//     console.error(`Socket Error from ${socket.id}:`, error);
//   });

// });

// // --- Basic HTTP API Endpoint (Example) ---
// // This endpoint is less useful now that results aren't broadcast immediately,
// // but kept here as it was in your original code.
// app.get('/api/poll/status', (req, res) => {
//   if (!currentPoll) {
//     return res.json({ pollActive: false, allAnswered: true }); // No poll, so technically all answered
//   }
//   // Check if all *currently connected* students have answered
//   const allAnswered = Object.values(activeStudents).every(student => student.answered);
//   res.json({ pollActive: true, allAnswered });
// });

// // --- Start the Server ---
// server.listen(PORT, () => {
//   console.log(`📊 Real-time Poll Server running on http://localhost:${PORT}`);
// });









// server/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000', // Your client-side URL
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());

const polls = {}; // Store active polls (pollId: { question, options, votes: { studentId: answer } })
const previousPollsData = []; // Store completed polls
const studentNames = {}; // Store registered student names (socketId: studentName)

// Generate a unique poll ID
const generatePollId = () => {
    return Math.random().toString(36).substring(2, 15);
};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // --- Student Registration ---
    socket.on('register_student', (studentName) => {
        studentNames[socket.id] = studentName;
        console.log(`Student registered: ${studentName} (${socket.id})`);
    });

    // --- Teacher Actions ---
    socket.on('create_poll', (pollData) => {
        const pollId = generatePollId();
        const newPoll = {
            id: pollId,
            question: pollData.question,
            options: pollData.options.map(option => option.trim()), // Trim options
            votes: {},
            duration: pollData.duration || 60 // Default duration in seconds
        };
        polls[pollId] = newPoll;
        console.log('New poll created:', newPoll);
        io.emit('new_poll', newPoll); // Broadcast the new poll to all connected clients
    });

    //send student list

    socket.on("Get-students",()=>{
        console.log(studentNames)
        io.emit("Recieved_student_list",{studentNames})
    })
    // Teacher requests previous polls
    socket.on('get_previous_polls', () => {
        socket.emit('previous_polls_data', previousPollsData);
    });

    // Teacher can (optionally) end a poll - you'd need UI for this
    socket.on('end_poll', (pollId) => {
        if (polls[pollId]) {
            const endedPoll = polls[pollId];
            previousPollsData.unshift({ poll: endedPoll, results: calculateResults(endedPoll.votes, endedPoll.options) });
            delete polls[pollId];
            io.emit('poll_ended', pollId); // Notify clients the poll has ended
            io.emit('new_poll', null); // Clear the current poll for students
            console.log(`Poll ended: ${pollId}`);
        }
    });

    // --- Student Actions ---
    socket.on('submit_answer', (data) => {
        const { pollId, answer } = data;
        const studentId = socket.id;

        if (!polls[pollId]) {
            socket.emit('answer_error', { message: 'Invalid poll ID', pollId });
            return;
        }

        const poll = polls[pollId];
        const trimmedAnswer = answer.trim();
        const validOption = poll.options.map(opt => opt.trim()).includes(trimmedAnswer);

        if (!validOption) {
            socket.emit('answer_error', { message: 'Invalid option selected.', pollId });
            return;
        }

        if (poll.votes[studentId]) {
            socket.emit('answer_error', { message: 'You have already submitted your answer for this poll.', pollId });
            return;
        }

        poll.votes[studentId] = trimmedAnswer;
        console.log(`Answer submitted by ${studentNames[studentId] || studentId} for poll ${pollId}: ${trimmedAnswer}`);
        socket.emit('answer_received', { success: true, answer: trimmedAnswer, pollId });

        // Optionally, immediately send updated results to the teacher
        const results = calculateResults(poll.votes, poll.options);
        io.emit('poll_results', results);
    });

    // Clients request current poll results
    socket.on('get_results', () => {
        // if (currentPollId && polls[currentPollId]) {
        //     const results = calculateResults(polls[currentPollId].votes, polls[currentPollId].options);
        //     io.emit('poll_results', results);
        // }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        delete studentNames[socket.id];
    });
});

// --- Helper Function to Calculate Poll Results ---
const calculateResults = (votes, options) => {
    const results = {};
    options.forEach(option => {
        results[option.trim()] = 0;
    });
    for (const studentId in votes) {
        const vote = votes[studentId].trim();
        if (results.hasOwnProperty(vote)) {
            results[vote]++;
        }
    }
    return results;
};

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});