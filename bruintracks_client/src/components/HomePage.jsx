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

export const WeeklyCalendar = ({ courses }) => {
  /* ───────── constants ───────── */
  const days      = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]; // display order
  const timeSlots = [
    "8:00 AM","8:30 AM","9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM",
    "12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM","3:00 PM","3:30 PM",
    "4:00 PM","4:30 PM","5:00 PM"
  ];

  const DAY_LABEL_WIDTH = 96;  // px (Tailwind w‑24 ⇒ 6rem)
  const ROW_HEIGHT      = 40;  // px (min‑h‑[40px]) – each slot is 30 min

  /* ───────── helpers ───────── */
  const timeToMinutes = (t) => {
    if (!t) return 0;
    const [clock, period] = t.split(" ");
    let   [h, m]         = clock.split(":").map(Number);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h  = 0;
    return h * 60 + m;
  };

  const dayMap = { M:"Monday", T:"Tuesday", W:"Wednesday", R:"Thursday", F:"Friday" };

  const occursOn = (timeObj, day) =>
    (timeObj?.days || "").split("").some((d) => dayMap[d] === day);

  // New function to detect overlapping courses
  const findOverlappingCourses = (day) => {
    const sessions = sessionsForDay(day);
    const overlaps = new Map(); // Map to store overlaps for each time slot

    sessions.forEach((session1, idx1) => {
      const start1 = timeToMinutes(session1.start);
      const end1 = timeToMinutes(session1.end);

      sessions.forEach((session2, idx2) => {
        if (idx1 === idx2) return; // Skip same session

        const start2 = timeToMinutes(session2.start);
        const end2 = timeToMinutes(session2.end);

        // Check if sessions overlap
        if (start1 < end2 && start2 < end1) {
          const key = `${session1.name}-${session1.label}`;
          if (!overlaps.has(key)) {
            overlaps.set(key, new Set());
          }
          overlaps.get(key).add(`${session2.name}-${session2.label}`);
        }
      });
    });

    return overlaps;
  };

  /**
   * Flatten ‑> array of { name, label, start, end, building, room } for that day
   */
  const sessionsForDay = (day) =>
    Object.entries(courses).flatMap(([name, data]) => {
      const lecture    = data.lecture    || data;
      const discussion = data.discussion || {};
      return [
        { label: "Lecture",    info: lecture.times?.[0]    },
        { label: "Discussion", info: discussion.times?.[0] }
      ].filter(({ info }) => info && occursOn(info, day))
       .map(({ label, info }) => ({ name, label, ...info }));
    });

  /* ───────── render ───────── */
  return (
    <motion.div
      className="bg-gray-700 rounded-lg shadow-md p-6 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-2xl font-bold text-white mb-6">Weekly Schedule</h2>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* header row */}
          <div className="grid grid-cols-6 gap-y-4 mb-4">
            {/* gutter column */}
            <div style={{ width: DAY_LABEL_WIDTH }}></div>
            {days.map((d) => (
              <div
                key={d}
                className="text-center"
                style={{ width: `calc((100% - ${DAY_LABEL_WIDTH}px)/5)` }}
              >
                <h3 className="text-lg font-semibold text-blue-400">{d}</h3>
              </div>
            ))}
          </div>

          {/* time grid */}
          <div className="relative">
            {timeSlots.map((t) => (
              <div key={t} className="grid grid-cols-6" style={{ minHeight: ROW_HEIGHT }}>
                {/* time label */}
                <div
                  className="flex items-center justify-end pr-4 border-b border-gray-600"
                  style={{ width: DAY_LABEL_WIDTH }}
                >
                  <span className="text-sm text-gray-400">{t}</span>
                </div>
                {/* five day cells */}
                {days.map((d) => (
                  <div
                    key={`${d}-${t}`}
                    className="border-b border-gray-600"
                    style={{ width: `calc((100% - ${DAY_LABEL_WIDTH}px)/5)` }}
                  ></div>
                ))}
              </div>
            ))}

            {/* course blocks */}
            {days.flatMap((day, colIdx) => {
              const blocks = sessionsForDay(day);
              const overlaps = findOverlappingCourses(day);
              
              return blocks.map((blk) => {
                const startM = timeToMinutes(blk.start);
                const endM   = timeToMinutes(blk.end);
                const top    = ((startM - 480) / 30) * ROW_HEIGHT; // 480 = 8*60
                const height = Math.max((endM - startM) / 30 * ROW_HEIGHT, ROW_HEIGHT);
                const overlapCount = overlaps.get(`${blk.name}-${blk.label}`)?.size || 0;

                return (
                  <motion.div
                    key={`${blk.name}-${blk.label}-${day}`}
                    className="absolute bg-gray-800 border border-blue-500 rounded p-2 text-white text-sm shadow-lg overflow-hidden"
                    style={{
                      top: top,
                      height: height - 4, // small interior padding
                      left: `calc(${DAY_LABEL_WIDTH}px + ${colIdx} * ((100% - ${DAY_LABEL_WIDTH}px)/5))`,
                      width: `calc((100% - ${DAY_LABEL_WIDTH}px)/5)`
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05, backgroundColor: "#1a365d" }}
                  >
                    {overlapCount > 0 && (
                      <div className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {overlapCount}
                      </div>
                    )}
                    <p className="font-semibold text-blue-400 break-words">
                      {blk.name.replace(/\|/g, " ")}
                    </p>
                    <p className="text-xs text-gray-400">{blk.label}</p>
                    {blk.building && blk.room && (
                      <p className="text-xs text-gray-400 break-words">
                        {blk.building} {blk.room}
                      </p>
                    )}
                  </motion.div>
                );
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
  const [leastCoursesPerTerm, setLeastCoursesPerTerm] = useState(3);
  const [isChatOpen, setIsChatOpen] = useState(false);

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
          // Parse the note to get unscheduled courses with their reasons
          const unscheduled = data.schedule.note
            .replace('Unable to schedule: ', '')
            .split('; ')
            .map(course => course.trim());
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
              The following courses could not be scheduled:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unscheduledCourses.map((course, idx) => {
                // Parse the course and its reason
                const [courseCode, reason] = course.split(' (');
                const cleanReason = reason ? reason.slice(0, -1) : 'No reason provided';
                
                return (
                  <motion.div 
                    key={idx} 
                    className="bg-gray-800 rounded p-4"
                    whileHover={{ scale: 1.05 }}
                  >
                    <h3 className="text-lg font-semibold text-blue-400 mb-2">
                      {cleanCourseName(courseCode)}
                    </h3>
                    <p className="text-gray-300 text-sm">
                      {cleanReason}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Floating Chat Button */}
        <motion.div
          className="fixed bottom-8 right-8 z-50"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="bg-blue-600 text-white w-16 h-16 rounded-full shadow-xl flex items-center justify-center hover:bg-blue-700 transition-colors border-2 border-white"
            whileHover={{ scale: 1.1, boxShadow: "0 0 20px rgba(59, 130, 246, 0.5)" }}
            whileTap={{ scale: 0.9 }}
          >
            <div className="flex flex-col items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <span className="text-xs mt-1 font-medium">AI Assistant</span>
            </div>
          </motion.button>
        </motion.div>

        {/* Chat Interface */}
        {isChatOpen && (
          <motion.div
            className="fixed bottom-28 right-8 w-[400px] h-[600px] bg-gray-800 rounded-lg shadow-2xl z-50 border border-gray-700"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
          >
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 rounded-t-lg">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <h3 className="text-lg font-semibold text-white">AI Planning Assistant</h3>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="h-[calc(100%-4rem)] overflow-hidden">
              <Chatbox />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
