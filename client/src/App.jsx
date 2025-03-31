import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import Teacher from './components/Teacher';
import Student from './components/Student';

function App() {
  return (
    <Router>
      <div className="app">
        {/* <header className="app-header">
          <nav>
            <Link to="/teacher" className="nav-link">Teacher</Link>
            
            <Link to="/student" className="nav-link">Student</Link>
          </nav>
        </header> */}
        
        <main className="app-main">
          <Routes>
            <Route path="/teacher" element={<Teacher />} />
            <Route path="/student" element={<Student />} />
            <Route path="/" element={
              <div className="home">
                <h2>Welcome to the Live Polling System</h2>
                <p>Choose your role:</p>
                <div className="role-buttons">
                  <Link to="/teacher" className="role-button">
                    <i className="fas fa-chalkboard-teacher icon"></i>
                    Teacher
                  </Link>
                  <Link to="/student" className="role-button">
                    <i className="fas fa-user-graduate icon"></i>
                    Student
                  </Link>
                </div>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;