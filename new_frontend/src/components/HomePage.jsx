import React, { useState, useEffect, useRef } from 'react';
import '../index.css';
import '../main.jsx';
import { motion } from 'framer-motion';
import '../App.css';
import { ArrowLeftCircle, ArrowRightCircle } from 'react-bootstrap-icons';
import { Dropdown } from './Dropdown';
import { InputField } from './InputField';
import { useNavigate } from 'react-router-dom';
import { Card } from './Card';
import { Button } from './Button';
import { Chatbox } from './Chatbox';
import { FullCoursePlan } from './FullCoursePlan';
const schedule = {
  Monday: [
    { time: '9:00 AM', course: 'CS 31 - Introduction to Computer Science' },
    { time: '11:00 AM', course: 'Math 33A - Linear Algebra' },
    { time: '2:00 PM', course: 'Physics 1A - Mechanics' },
  ],
  Tuesday: [
    { time: '10:00 AM', course: 'GE Cluster - Evolution of the Universe' },
    { time: '1:00 PM', course: 'CS 32 - Data Structures & Algorithms' },
  ],
  Wednesday: [
    { time: '9:00 AM', course: 'CS 31 - Introduction to Computer Science' },
    { time: '11:00 AM', course: 'Math 33A - Linear Algebra' },
    { time: '2:00 PM', course: 'Physics 1A - Mechanics' },
  ],
  Thursday: [
    { time: '10:00 AM', course: 'GE Cluster - Evolution of the Universe' },
    { time: '1:00 PM', course: 'CS 32 - Data Structures & Algorithms' },
  ],
  Friday: [
    { time: '9:00 AM', course: 'CS 31 - Introduction to Computer Science' },
    { time: '12:00 PM', course: 'Math 33A - Linear Algebra' },
  ],
};

export const HomePage = () => {
  return (
    <div className="bg-gray-900 min-h-screen min-w-screen text-white flex flex-col items-center pt-10 pl-5">
      <motion.h1
        className="text-3xl font-bold mt-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        My Dashboard
      </motion.h1>
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
          </motion.h2>{' '}
          <br />
          <div className="flex flex-row">
            {Object.keys(schedule).map((day, index) => (
              <motion.div
                key={index}
                className="bg-gray-700 mr-4 rounded-2xl shadow-md p-5 h-full"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 0.75, y: 0 }}
                whileHover={{ opacity: 1, y: 50 }}
                transition={{ delay: index * 0.1 }}
              >
                <h2 className="text-xl font-bold text-blue-400">{day}</h2>
                {schedule[day].map((item, i) => (
                  <div key={i} className="mt-2">
                    <p className="text-lg font-semibold">{item.time}</p>
                    <p className="text-gray-400">{item.course}</p>
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
