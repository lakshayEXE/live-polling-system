// server/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*' , 
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());

const polls = {};
const previousPollsData = []; 
const studentNames = {}; 

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

  
    socket.on('create_poll', (pollData) => {
        const pollId = generatePollId();
        const newPoll = {
            id: pollId,
            question: pollData.question,
            options: pollData.options.map(option => option.trim()), 
            votes: {},
            duration: pollData.duration || 60 
        };
        polls[pollId] = newPoll;
        console.log('New poll created:', newPoll);
        io.emit('new_poll', newPoll); 
    });

    //send student list

    socket.on("Get-students",()=>{
        console.log(studentNames)
        io.emit("Recieved_student_list",{studentnames})
    })
    // Teacher requests previous polls
    socket.on('get_previous_polls', () => {
        socket.emit('previous_polls_data', previousPollsData);
    });

    // Teacher can (optionally) end a poll - you'd need UI for this
    socket.on('end_poll', (pollId) => {
    setTimeout(() => {
         if (polls[pollId]) {
            const endedPoll = polls[pollId];
            previousPollsData.unshift({ poll: endedPoll, results: calculateResults(endedPoll.votes, endedPoll.options) });
            delete polls[pollId];
            io.emit('poll_ended', pollId); 
            io.emit('new_poll', null); 
            console.log(`Poll ended: ${pollId}`);
        }
    }, (newPoll.duration || 60) * 1000 );    
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


