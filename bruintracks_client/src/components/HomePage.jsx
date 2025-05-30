import React, { useState, useEffect } from 'react';
import '../index.css';
import '../App.css';
import { motion } from 'framer-motion';
import { Chatbox } from './Chatbox.jsx';
import { FullCoursePlan } from './FullCoursePlan.jsx';
import { handleSignOut } from '../supabaseClient.js';
import { useNavigate } from 'react-router-dom';

const CourseCard = ({ course, courseData, isFirstTerm }) => {
  console.log("Rendering CourseCard for:", course, "with data:", courseData);

  // Clean course name by replacing "|" with a space
  const cleanCourseName = (name) => {
    return name.replace(/\|/g, ' ');
  };

  // For terms after the first one, show a simple card
  if (!isFirstTerm) {
    return (
      <motion.div 
        className="bg-gray-700 rounded-lg shadow-md p-3 mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -5 }}
      >
        <h3 className="text-sm font-semibold text-white">
          {course === 'FILLER' ? 'Filler Course' : cleanCourseName(course)}
        </h3>
      </motion.div>
    );
  }

  // If courseData is not an object or is null, return a simple card
  if (!courseData || typeof courseData !== 'object') {
    return (
      <motion.div 
        className="bg-gray-700 rounded-lg shadow-md p-4 mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -5 }}
      >
        <h3 className="text-lg font-semibold text-white">
          {course === 'FILLER' ? 'Filler Course' : cleanCourseName(course)}
        </h3>
        <p className="text-gray-400">Course details not available</p>
      </motion.div>
    );
  }

  // Handle both old and new data structures
  const lecture = courseData.lecture || courseData;
  const discussion = courseData.discussion;

  // Calculate enrollment percentage
  const getEnrollmentPercentage = (enrollment, cap) => {
    if (!enrollment || !cap) return 0;
    return Math.min((enrollment / cap) * 100, 100);
  };

  // Get color based on enrollment percentage
  const getEnrollmentColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <motion.div 
      className="bg-gray-700 rounded-lg shadow-md p-4 mb-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
    >
      <h3 className="text-lg font-semibold text-white mb-2">{cleanCourseName(course)}</h3>
      
      {/* Lecture Section */}
      <div className="mb-3">
        <h4 className="text-md font-medium text-blue-400">Lecture</h4>
        <div className="ml-4">
          {lecture.section && (
            <p className="text-sm text-gray-400">Section: {lecture.section}</p>
          )}
          {lecture.instructors && (
            <p className="text-sm text-gray-400">Instructor: {Array.isArray(lecture.instructors) ? lecture.instructors.join(', ') : lecture.instructors}</p>
          )}
          {lecture.times && lecture.times.map((time, idx) => (
            <div key={idx} className="text-sm text-gray-400">
              {time.days && <p>Days: {time.days}</p>}
              {time.start && time.end && <p>Time: {time.start} - {time.end}</p>}
              {time.building && time.room && <p>Location: {time.building} {time.room}</p>}
            </div>
          ))}
          {lecture.enrollment_total !== undefined && (
            <div className="mt-2 space-y-2">
              {/* Enrollment Bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Enrollment: {lecture.enrollment_total}/{lecture.enrollment_cap}</span>
                  <span>{Math.round(getEnrollmentPercentage(lecture.enrollment_total, lecture.enrollment_cap))}%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getEnrollmentColor(getEnrollmentPercentage(lecture.enrollment_total, lecture.enrollment_cap))}`}
                    style={{ width: `${getEnrollmentPercentage(lecture.enrollment_total, lecture.enrollment_cap)}%` }}
                  />
                </div>
              </div>
              
              {/* Waitlist Bar */}
              {lecture.waitlist_total > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Waitlist: {lecture.waitlist_total}/{lecture.waitlist_cap}</span>
                    <span>{Math.round(getEnrollmentPercentage(lecture.waitlist_total, lecture.waitlist_cap))}%</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-purple-500"
                      style={{ width: `${getEnrollmentPercentage(lecture.waitlist_total, lecture.waitlist_cap)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Discussion Section */}
      {discussion && (
        <div>
          <h4 className="text-md font-medium text-blue-400">Discussion</h4>
          <div className="ml-4">
            {discussion.section && (
              <p className="text-sm text-gray-400">Section: {discussion.section}</p>
            )}
            {discussion.instructors && (
              <p className="text-sm text-gray-400">Instructor: {Array.isArray(discussion.instructors) ? discussion.instructors.join(', ') : discussion.instructors}</p>
            )}
            {discussion.times && discussion.times.map((time, idx) => (
              <div key={idx} className="text-sm text-gray-400">
                {time.days && <p>Days: {time.days}</p>}
                {time.start && time.end && <p>Time: {time.start} - {time.end}</p>}
                {time.building && time.room && <p>Location: {time.building} {time.room}</p>}
              </div>
            ))}
            {discussion.enrollment_total !== undefined && (
              <div className="mt-2 space-y-2">
                {/* Enrollment Bar */}
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Enrollment: {discussion.enrollment_total}/{discussion.enrollment_cap}</span>
                    <span>{Math.round(getEnrollmentPercentage(discussion.enrollment_total, discussion.enrollment_cap))}%</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getEnrollmentColor(getEnrollmentPercentage(discussion.enrollment_total, discussion.enrollment_cap))}`}
                      style={{ width: `${getEnrollmentPercentage(discussion.enrollment_total, discussion.enrollment_cap)}%` }}
                    />
                  </div>
                </div>
                
                {/* Waitlist Bar */}
                {discussion.waitlist_total > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Waitlist: {discussion.waitlist_total}/{discussion.waitlist_cap}</span>
                      <span>{Math.round(getEnrollmentPercentage(discussion.waitlist_total, discussion.waitlist_cap))}%</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-purple-500"
                        style={{ width: `${getEnrollmentPercentage(discussion.waitlist_total, discussion.waitlist_cap)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

const QuarterSchedule = ({ quarter, courses, isFirstTerm }) => {
  console.log(`Rendering QuarterSchedule for ${quarter}:`, courses);
  
  // If courses is not an array or object, return null
  if (!courses || (typeof courses !== 'object' && !Array.isArray(courses))) {
    return null;
  }

  return (
    <motion.div 
      className="mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-2xl font-bold text-white mb-4">{quarter}</h2>
      <div className={`grid ${isFirstTerm ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'} gap-4`}>
        {Array.isArray(courses) ? (
          courses.map((course, idx) => (
            <CourseCard key={idx} course={course} courseData={null} isFirstTerm={isFirstTerm} />
          ))
        ) : (
          Object.entries(courses).map(([course, courseData]) => (
            <CourseCard key={course} course={course} courseData={courseData} isFirstTerm={isFirstTerm} />
          ))
        )}
      </div>
    </motion.div>
  );
};

const ScheduleSummary = ({ scheduleData }) => {
  console.log("Rendering ScheduleSummary with data:", scheduleData);
  
  const totalCourses = Object.values(scheduleData).reduce((acc, quarter) => {
    if (Array.isArray(quarter)) {
      return acc + quarter.length;
    }
    return acc + Object.keys(quarter).length;
  }, 0);

  const quarters = Object.keys(scheduleData);
  const startQuarter = quarters[0];
  const endQuarter = quarters[quarters.length - 1];

  // Get preferences from localStorage
  const getPreferences = () => {
    try {
      const storedSchedule = localStorage.getItem('scheduleData');
      if (!storedSchedule) return null;
      
      const data = JSON.parse(storedSchedule);
      return data.schedule?.preferences || null;
    } catch (error) {
      console.error("Error getting preferences:", error);
      return null;
    }
  };

  const preferences = getPreferences();

  return (
    <motion.div 
      className="bg-gray-700 rounded-lg shadow-md p-6 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-2xl font-bold text-white mb-4">Schedule Summary</h2>
      
      {/* Basic Schedule Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <motion.div 
          className="bg-gray-800 p-4 rounded-lg"
          whileHover={{ scale: 1.05 }}
        >
          <h3 className="text-lg font-semibold text-blue-400">Total Courses</h3>
          <p className="text-3xl font-bold text-white">{totalCourses}</p>
        </motion.div>
        <motion.div 
          className="bg-gray-800 p-4 rounded-lg"
          whileHover={{ scale: 1.05 }}
        >
          <h3 className="text-lg font-semibold text-blue-400">Start Quarter</h3>
          <p className="text-xl text-white">{startQuarter}</p>
        </motion.div>
        <motion.div 
          className="bg-gray-800 p-4 rounded-lg"
          whileHover={{ scale: 1.05 }}
        >
          <h3 className="text-lg font-semibold text-blue-400">End Quarter</h3>
          <p className="text-xl text-white">{endQuarter}</p>
        </motion.div>
      </div>

      {/* Preferences Summary */}
      {preferences && (
        <motion.div 
          className="bg-gray-800 rounded-lg p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h3 className="text-lg font-semibold text-blue-400 mb-3">Your Preferences</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Course Load */}
            <div className="bg-gray-700 p-3 rounded">
              <p className="text-sm text-gray-400">Course Load</p>
              <p className="text-white">
                {preferences.least_courses_per_term} - {preferences.most_courses_per_term} courses per quarter
              </p>
            </div>

            {/* Time Preferences */}
            <div className="bg-gray-700 p-3 rounded">
              <p className="text-sm text-gray-400">Preferred Times</p>
              <p className="text-white">
                {preferences.preferred_times?.join(', ') || 'No time preferences'}
              </p>
            </div>

            {/* Day Preferences */}
            <div className="bg-gray-700 p-3 rounded">
              <p className="text-sm text-gray-400">Preferred Days</p>
              <p className="text-white">
                {preferences.preferred_days?.join(', ') || 'No day preferences'}
              </p>
            </div>

            {/* Professor Preferences */}
            {preferences.preferred_professors && preferences.preferred_professors.length > 0 && (
              <div className="bg-gray-700 p-3 rounded">
                <p className="text-sm text-gray-400">Preferred Professors</p>
                <p className="text-white">
                  {preferences.preferred_professors.join(', ')}
                </p>
              </div>
            )}

            {/* Course Preferences */}
            {preferences.preferred_courses && preferences.preferred_courses.length > 0 && (
              <div className="bg-gray-700 p-3 rounded">
                <p className="text-sm text-gray-400">Preferred Courses</p>
                <p className="text-white">
                  {preferences.preferred_courses.join(', ')}
                </p>
              </div>
            )}

            {/* Other Preferences */}
            {preferences.other_preferences && (
              <div className="bg-gray-700 p-3 rounded">
                <p className="text-sm text-gray-400">Additional Preferences</p>
                <p className="text-white">
                  {preferences.other_preferences}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

const WeeklyCalendar = ({ courses }) => {
  console.log("WeeklyCalendar received courses:", courses);
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = [
    '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
  ];

  // Convert time to minutes for easier comparison
  const timeToMinutes = (time) => {
    if (!time) return 0;
    const [timeStr, period] = time.split(' ');
    let [hours, minutes] = timeStr.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // Map day abbreviations to full names
  const dayMap = {
    'M': 'Monday',
    'T': 'Tuesday',
    'W': 'Wednesday',
    'R': 'Thursday',
    'F': 'Friday'
  };

  // Get course schedule for a specific day
  const getCoursesForDay = (day) => {
    console.log(`Getting courses for ${day}:`, courses);
    if (!courses || typeof courses !== 'object') {
      console.log("No valid courses data");
      return [];
    }

    return Object.entries(courses).filter(([courseName, courseData]) => {
      console.log(`Checking course ${courseName}:`, courseData);
      const lecture = courseData.lecture || courseData;
      const discussion = courseData.discussion;
      
      // Check both lecture and discussion times
      const lectureDays = lecture.times?.[0]?.days?.split('').map(d => dayMap[d]) || [];
      const discussionDays = discussion?.times?.[0]?.days?.split('').map(d => dayMap[d]) || [];
      
      console.log(`Lecture days for ${courseName}:`, lectureDays);
      console.log(`Discussion days for ${courseName}:`, discussionDays);
      
      return lectureDays.includes(day) || discussionDays.includes(day);
    });
  };

  // Calculate block height based on duration
  const calculateBlockHeight = (startTime, endTime) => {
    if (!startTime || !endTime) return '4rem';
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const duration = endMinutes - startMinutes;
    const calculatedHeight = `${duration / 30}rem`;
    // Ensure minimum height of 4rem for content visibility
    return `max(${calculatedHeight}, 4rem)`;
  };

  // Check if two time slots overlap
  const doTimesOverlap = (time1, time2) => {
    const start1 = timeToMinutes(time1.start);
    const end1 = timeToMinutes(time1.end);
    const start2 = timeToMinutes(time2.start);
    const end2 = timeToMinutes(time2.end);
    return (start1 < end2 && end1 > start2);
  };

  // Get overlapping courses for a specific day and time
  const getOverlappingCourses = (day, courseName, courseData) => {
    const lecture = courseData.lecture || courseData;
    const discussion = courseData.discussion;
    const courseTimes = [];
    
    if (lecture.times?.[0]) {
      const lectureTime = lecture.times[0];
      if (lectureTime.days?.split('').map(d => dayMap[d]).includes(day)) {
        courseTimes.push({ type: 'lecture', time: lectureTime });
      }
    }
    if (discussion?.times?.[0]) {
      const discussionTime = discussion.times[0];
      if (discussionTime.days?.split('').map(d => dayMap[d]).includes(day)) {
        courseTimes.push({ type: 'discussion', time: discussionTime });
      }
    }

    return Object.entries(courses)
      .filter(([otherName, otherData]) => {
        if (otherName === courseName) return false;
        const otherLecture = otherData.lecture || otherData;
        const otherDiscussion = otherData.discussion;
        
        return courseTimes.some(({ time: courseTime }) => {
          if (otherLecture.times?.[0]) {
            const otherLectureTime = otherLecture.times[0];
            if (otherLectureTime.days?.split('').map(d => dayMap[d]).includes(day)) {
              return doTimesOverlap(courseTime, otherLectureTime);
            }
          }
          if (otherDiscussion?.times?.[0]) {
            const otherDiscussionTime = otherDiscussion.times[0];
            if (otherDiscussionTime.days?.split('').map(d => dayMap[d]).includes(day)) {
              return doTimesOverlap(courseTime, otherDiscussionTime);
            }
          }
          return false;
        });
      })
      .map(([name]) => name);
  };

  // Calculate block position with overlap handling
  const calculateBlockPosition = (startTime, courseName, day) => {
    if (!startTime) return '0';
    const startMinutes = timeToMinutes(startTime);
    const earliestTime = timeToMinutes('8:00 AM');
    const minutesFromStart = startMinutes - earliestTime;
    const basePosition = `${minutesFromStart / 30}rem`;

    // Check for overlapping courses
    const overlappingCourses = getOverlappingCourses(day, courseName, courses[courseName]);
    if (overlappingCourses.length > 0) {
      // Add a small offset based on the number of overlapping courses
      const overlapIndex = overlappingCourses.indexOf(courseName);
      return `${minutesFromStart / 30 + (overlapIndex * 0.5)}rem`;
    }

    return basePosition;
  };

  return (
    <motion.div 
      className="bg-gray-700 rounded-lg shadow-md p-6 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-2xl font-bold text-white mb-6">Weekly Schedule</h2>
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header */}
          <div className="grid grid-cols-6 gap-4 mb-4">
            <div className="w-24"></div>
            {days.map(day => (
              <div key={day} className="text-center">
                <h3 className="text-lg font-semibold text-blue-400">{day}</h3>
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="relative">
            {/* Time slots */}
            {timeSlots.map((time) => (
              <div key={time} className="grid grid-cols-6 gap-4 mb-2">
                <div className="w-24 text-right pr-4">
                  <span className="text-sm text-gray-400">{time}</span>
                </div>
                {days.map(day => (
                  <div key={`${day}-${time}`} className="relative min-h-[40px] border-b border-gray-600"></div>
                ))}
              </div>
            ))}

            {/* Course Blocks */}
            {days.map(day => {
              const dayCourses = getCoursesForDay(day);
              
              return dayCourses.map(([courseName, courseData]) => {
                const lecture = courseData.lecture || courseData;
                const discussion = courseData.discussion;
                
                // Handle lecture
                if (lecture.times?.[0]) {
                  const lectureTime = lecture.times[0];
                  const lectureDays = lectureTime.days?.split('').map(d => dayMap[d]) || [];
                  if (lectureDays.includes(day)) {
                    const overlappingCourses = getOverlappingCourses(day, courseName, courseData);
                    return (
                      <motion.div
                        key={`${courseName}-lecture-${day}`}
                        className={`absolute bg-gray-800 border border-blue-500 rounded p-2 text-white text-sm shadow-lg ${
                          overlappingCourses.length > 0 ? 'z-10' : ''
                        }`}
                        style={{
                          left: `${(days.indexOf(day) + 1) * (100 / 6)}%`,
                          top: calculateBlockPosition(lectureTime.start, courseName, day),
                          height: calculateBlockHeight(lectureTime.start, lectureTime.end),
                          width: `${100 / 6 - 2}%`,
                          minHeight: '4rem', // Ensure minimum height for content
                        }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.05, backgroundColor: '#1a365d' }}
                      >
                        <div className="flex flex-col h-full">
                          <p className="font-semibold text-blue-400 break-words">{courseName.replace(/\|/g, ' ')}</p>
                          <p className="text-xs text-gray-400">Lecture</p>
                          <p className="text-xs text-gray-400 break-words">
                            {lectureTime.building} {lectureTime.room}
                          </p>
                          {overlappingCourses.length > 0 && (
                            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                              {overlappingCourses.length}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  }
                }

                // Handle discussion
                if (discussion?.times?.[0]) {
                  const discussionTime = discussion.times[0];
                  const discussionDays = discussionTime.days?.split('').map(d => dayMap[d]) || [];
                  if (discussionDays.includes(day)) {
                    const overlappingCourses = getOverlappingCourses(day, courseName, courseData);
                    return (
                      <motion.div
                        key={`${courseName}-discussion-${day}`}
                        className={`absolute bg-gray-800 border border-blue-400 rounded p-2 text-white text-sm shadow-lg ${
                          overlappingCourses.length > 0 ? 'z-10' : ''
                        }`}
                        style={{
                          left: `${(days.indexOf(day) + 1) * (100 / 6)}%`,
                          top: calculateBlockPosition(discussionTime.start, courseName, day),
                          height: calculateBlockHeight(discussionTime.start, discussionTime.end),
                          width: `${100 / 6 - 2}%`,
                          minHeight: '4rem', // Ensure minimum height for content
                        }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.05, backgroundColor: '#1a365d' }}
                      >
                        <div className="flex flex-col h-full">
                          <p className="font-semibold text-blue-400 break-words">{courseName.replace(/\|/g, ' ')}</p>
                          <p className="text-xs text-gray-400">Discussion</p>
                          <p className="text-xs text-gray-400 break-words">
                            {discussionTime.building} {discussionTime.room}
                          </p>
                          {overlappingCourses.length > 0 && (
                            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                              {overlappingCourses.length}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  }
                }
                return null;
              });
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const HomePage = () => {
  const navigate = useNavigate();
  const [scheduleData, setScheduleData] = useState(null);
  const [unscheduledCourses, setUnscheduledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leastCoursesPerTerm, setLeastCoursesPerTerm] = useState(3); // Default value

  // Clean course name by replacing "|" with a space
  const cleanCourseName = (name) => {
    return name.replace(/\|/g, ' ');
  };

  useEffect(() => {
    console.log("HomePage component mounted");
    
    const loadScheduleData = () => {
      console.log("Starting to load schedule data from localStorage...");
      const storedSchedule = localStorage.getItem('scheduleData');
      
      if (!storedSchedule) {
        console.log("No schedule data found in localStorage");
        setLoading(false);
        return;
      }

      console.log("Raw data from localStorage:", storedSchedule);

      try {
        const data = JSON.parse(storedSchedule);
        console.log("Successfully parsed schedule data:", data);
        
        if (!data.schedule || !data.schedule.schedule) {
          console.error("Schedule data is missing the 'schedule' property:", data);
          setLoading(false);
          return;
        }

        // Get the actual schedule data from the nested structure
        const actualSchedule = data.schedule.schedule;
        console.log("Actual schedule data:", actualSchedule);

        // Get least_courses_per_term from preferences if available
        if (data.schedule.preferences && data.schedule.preferences.least_courses_per_term) {
          setLeastCoursesPerTerm(data.schedule.preferences.least_courses_per_term);
        }

        // Validate and clean the schedule data
        const cleanedSchedule = {};
        Object.entries(actualSchedule).forEach(([quarter, courses]) => {
          // Skip if courses is not an object or array
          if (!courses || (typeof courses !== 'object' && !Array.isArray(courses))) {
            console.warn(`Invalid courses data for quarter ${quarter}:`, courses);
            return;
          }

          // If it's an array, filter out invalid entries and FILLER
          if (Array.isArray(courses)) {
            const validCourses = courses.filter(course => 
              course && typeof course === 'string' && course.trim() !== '' && course !== 'FILLER'
            );
            
            // Add filler courses if needed
            while (validCourses.length < leastCoursesPerTerm) {
              validCourses.push('FILLER');
            }
            
            cleanedSchedule[quarter] = validCourses;
          } else {
            // If it's an object, keep only valid course data
            cleanedSchedule[quarter] = {};
            Object.entries(courses).forEach(([courseId, courseData]) => {
              if (courseData && typeof courseData === 'object') {
                cleanedSchedule[quarter][courseId] = courseData;
              }
            });
            
            // Add filler courses if needed
            while (Object.keys(cleanedSchedule[quarter]).length < leastCoursesPerTerm) {
              const fillerId = `FILLER_${Object.keys(cleanedSchedule[quarter]).length + 1}`;
              cleanedSchedule[quarter][fillerId] = 'FILLER';
            }
          }
        });

        console.log("Cleaned schedule data:", cleanedSchedule);
        setScheduleData(cleanedSchedule);

        if (data.schedule.note) {
          console.log("Found note in schedule data:", data.schedule.note);
          const unscheduled = data.schedule.note.replace('Unable to schedule: ', '').split(', ');
          console.log("Parsed unscheduled courses:", unscheduled);
          setUnscheduledCourses(unscheduled);
        }
      } catch (error) {
        console.error("Error parsing schedule data:", error);
        console.error("Error stack:", error.stack);
        console.error("Raw data that caused the error:", storedSchedule);
      } finally {
        setLoading(false);
      }
    };

    loadScheduleData();
  }, [leastCoursesPerTerm]);

  // Add a debug button to reload schedule data
  const reloadSchedule = () => {
    console.log("Manually reloading schedule data...");
    setLoading(true);
    const storedSchedule = localStorage.getItem('scheduleData');
    console.log("Current localStorage data:", storedSchedule);
    if (storedSchedule) {
      try {
        const data = JSON.parse(storedSchedule);
        console.log("Reloaded schedule data:", data);
        setScheduleData(data.schedule.schedule);
        if (data.schedule.note) {
          const unscheduled = data.schedule.note.replace('Unable to schedule: ', '').split(', ');
          setUnscheduledCourses(unscheduled);
        }
      } catch (error) {
        console.error("Error reloading schedule:", error);
      }
    }
    setLoading(false);
  };

  const onSignOut = () => {
    handleSignOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="bg-gray-900 min-h-screen min-w-screen text-white flex flex-col items-center pt-10">
        <div className="max-w-7xl mx-auto">
          <motion.h1
            className="text-3xl font-bold mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Your Schedule
          </motion.h1>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!scheduleData) {
  return (
      <div className="bg-gray-900 min-h-screen min-w-screen text-white flex flex-col items-center pt-10">
        <div className="max-w-7xl mx-auto">
      <motion.h1
            className="text-3xl font-bold mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
            Your Schedule
      </motion.h1>
        <motion.div
            className="bg-gray-700 rounded-lg shadow-md p-6"
          initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-gray-400 mb-4">No schedule data available. Please generate a schedule first.</p>
            <motion.button
              onClick={() => navigate('/form')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Generate Schedule
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen min-w-screen text-white flex flex-col items-center pt-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <motion.h1
            className="text-3xl font-bold"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Your Schedule
          </motion.h1>
          <div className="flex gap-4">
            <motion.button
              onClick={reloadSchedule}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Reload Schedule
            </motion.button>
            <motion.button 
              onClick={onSignOut}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Sign Out
            </motion.button>
          </div>
                  </div>
        
        {/* Schedule Summary */}
        <ScheduleSummary scheduleData={scheduleData} />

        {/* Weekly Calendar - only show for first term */}
        {scheduleData && Object.entries(scheduleData)[0] && (
          <WeeklyCalendar courses={Object.entries(scheduleData)[0][1]} />
        )}

        {/* Quarter Schedules */}
        {Object.entries(scheduleData)
          .filter(([_, courses]) => {
            if (Array.isArray(courses)) {
              return courses.length > 0 && courses[0] !== 'FILLER';
            }
            return Object.keys(courses).length > 0;
          })
          .map(([quarter, courses], index) => (
            <QuarterSchedule
              key={quarter}
              quarter={quarter}
              courses={courses}
              isFirstTerm={index === 0}
            />
          ))}

        {/* Unscheduled Courses */}
        {unscheduledCourses.length > 0 && (
          <motion.div 
            className="mt-8 bg-gray-700 rounded-lg shadow-md p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-2xl font-bold text-white mb-4">Unscheduled Courses</h2>
            <p className="text-gray-400 mb-4">
              The following courses could not be scheduled due to conflicts or availability:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {unscheduledCourses.map((course, idx) => (
                <motion.div 
                  key={idx} 
                  className="bg-gray-800 rounded p-3"
                  whileHover={{ scale: 1.05 }}
                >
                  <p className="text-gray-300">{cleanCourseName(course)}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
        )}

        {/* Chatbox */}
        <div className="mt-8">
          <Chatbox />
        </div>
      </div>
    </div>
  );
};
