import React, { useState, useEffect } from 'react';
import '../index.css';
import '../main.jsx';
import { motion } from 'framer-motion';
import '../App.css';
import { Chatbox } from './Chatbox.jsx';
import { FullCoursePlan } from './FullCoursePlan.jsx';
import { handleSignOut } from '../supabaseClient.js';
import { useNavigate } from 'react-router-dom';

export const HomePage = () => {
  const navigate = useNavigate();
  const [scheduleData, setScheduleData] = useState(null);

  useEffect(() => {
    // Get schedule data from localStorage
    const storedSchedule = localStorage.getItem('scheduleData');
    if (storedSchedule) {
      setScheduleData(JSON.parse(storedSchedule));
    }
  }, []);

  const onSignOut = () => {
    handleSignOut();
    navigate("/");
  };

  // Convert schedule data to weekly format
  const getWeeklySchedule = () => {
    if (!scheduleData?.schedule) return {};

    const weeklySchedule = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: []
    };

    // Process each term's schedule
    Object.entries(scheduleData.schedule).forEach(([term, courses]) => {
      Object.entries(courses).forEach(([courseId, courseInfo]) => {
        if (courseInfo.lecture?.times) {
          courseInfo.lecture.times.forEach(time => {
            const days = time.days.split('');
            days.forEach(day => {
              const dayName = {
                'M': 'Monday',
                'T': 'Tuesday',
                'W': 'Wednesday',
                'Th': 'Thursday',
                'F': 'Friday'
              }[day];
              if (dayName) {
                weeklySchedule[dayName].push({
                  time: `${time.start} - ${time.end}`,
                  course: `${courseId} (${courseInfo.lecture.section})`,
                  building: time.building,
                  room: time.room,
                  instructors: courseInfo.lecture.instructors.join(', ')
                });
              }
            });
          });
        }
      });
    });

    // Sort each day's schedule by start time
    Object.keys(weeklySchedule).forEach(day => {
      weeklySchedule[day].sort((a, b) => a.time.localeCompare(b.time));
    });

    return weeklySchedule;
  };

  const weeklySchedule = getWeeklySchedule();

  return (
    <div className="bg-gray-900 min-h-screen min-w-screen text-white flex flex-col items-center pt-10 pl-5">
      <motion.h1
        className="text-3xl font-bold mt-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        My Dashboard
      </motion.h1>
      <button onClick={onSignOut}>SIGN OUT</button>
      <div className="flex flex-col items-stretch mr-10">
        <motion.div
          className="flex-1 mt-6 space-y-6 ml-10 mr-10 bg-gray-500 p-5 items-stretch rounded-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.75 }}
          whileHover={{ opacity: 1, y: 20 }}
        >
          <motion.h2
            className="text-3xl font-bold mt-6 mb-6 p-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Proposed schedule
          </motion.h2>
          <div className="flex flex-row">
            {Object.entries(weeklySchedule).map(([day, classes], index) => (
              <motion.div
                key={index}
                className="bg-gray-700 mr-4 rounded-2xl shadow-md p-5 h-full"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 0.75, y: 0 }}
                whileHover={{ opacity: 1, y: 50 }}
                transition={{ delay: index * 0.1 }}
              >
                <h2 className="text-xl font-bold text-blue-400">{day}</h2>
                {classes.map((item, i) => (
                  <div key={i} className="mt-2">
                    <p className="text-lg font-semibold">{item.time}</p>
                    <p className="text-gray-400">{item.course}</p>
                    <p className="text-sm text-gray-500">{item.building} {item.room}</p>
                    <p className="text-sm text-gray-500">{item.instructors}</p>
                  </div>
                ))}
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="flex flex-row ml-10 mr-10 h-full">
          <FullCoursePlan />
          <Chatbox />
        </div>
      </div>
    </div>
  );
};
