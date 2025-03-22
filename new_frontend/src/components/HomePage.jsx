
import React, { useState, useEffect, useRef } from 'react';
import '../index.css';
import '../main.jsx';
import { motion } from 'framer-motion';
import '../App.css';
import { ArrowLeftCircle, ArrowRightCircle } from 'react-bootstrap-icons';
import { Dropdown } from './Dropdown';
import { InputField } from './InputField';
import { useNavigate } from 'react-router-dom';
import { Card } from "./Card";
import { Button } from "./Button";

const schedule = {
  Monday: [
    { time: "9:00 AM", course: "CS 31 - Introduction to Computer Science" },
    { time: "11:00 AM", course: "Math 33A - Linear Algebra" },
    { time: "2:00 PM", course: "Physics 1A - Mechanics" },
  ],
  Tuesday: [
    { time: "10:00 AM", course: "GE Cluster - Evolution of the Universe" },
    { time: "1:00 PM", course: "CS 32 - Data Structures & Algorithms" },
  ],
  Wednesday: [
    { time: "9:00 AM", course: "CS 31 - Introduction to Computer Science" },
    { time: "11:00 AM", course: "Math 33A - Linear Algebra" },
    { time: "2:00 PM", course: "Physics 1A - Mechanics" },
  ],
  Thursday: [
    { time: "10:00 AM", course: "GE Cluster - Evolution of the Universe" },
    { time: "1:00 PM", course: "CS 32 - Data Structures & Algorithms" },
  ],
  Friday: [
    { time: "9:00 AM", course: "CS 31 - Introduction to Computer Science" },
    { time: "12:00 PM", course: "Math 33A - Linear Algebra" },
  ],
};

export const HomePage = () => {
  return (
    <div className="bg-gray-900 min-h-screen text-white flex flex-col items-center p-6 w-full">
      <motion.h1 
        className="text-3xl font-bold mt-6" 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
      >
        UCLA Course Schedule
      </motion.h1>
      
      <div className="w-full max-w-md mt-6 space-y-6 flex flex-row">
        {Object.keys(schedule).map((day, index) => (
          <motion.div 
            key={index} 
            className="bg-gray-800 p-4 rounded-2xl shadow-md"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
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
      
      <div className="fixed bottom-6 w-full max-w-md">
        <Card className="bg-gray-800 p-4 rounded-2xl shadow-md flex items-center">
          <InputField 
            className="flex-grow bg-gray-700 border-none text-white placeholder-gray-400"
            placeholder="Ask me anything..." 
          />
          <Button className="ml-2 bg-blue-500 hover:bg-blue-600 text-white">Send</Button>
        </Card>
      </div>
    </div>
  );
}
