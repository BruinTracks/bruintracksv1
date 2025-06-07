import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { supabase } from '../supabaseClient.js';
import { ScheduleSummary } from './HomePage.jsx';
import { WeeklyCalendar } from './HomePage.jsx';
import { QuarterSchedule } from './HomePage.jsx';
import { ArrowLeftCircle, ArrowRightCircle } from 'react-bootstrap-icons';

export const SavedSchedules = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Helper function to convert quarter string to sortable number
  const quarterToSortValue = (quarterStr) => {
    const [quarter, yearStr] = quarterStr.split(' ');
    const year = parseInt(yearStr);
    // Adjust year for Fall quarter since it comes before Winter/Spring of next year
    // e.g., Fall 2024 should come before Winter 2025
    if (quarter === 'Fall') {
      return year * 10;
    } else if (quarter === 'Winter') {
      return (year - 1) * 10 + 1;
    } else if (quarter === 'Spring') {
      return (year - 1) * 10 + 2;
    } else { // Summer
      return (year - 1) * 10 + 3;
    }
  };

  // Helper function to sort quarters within a schedule
  const sortQuarters = (schedule) => {
    if (!schedule) return schedule;
    const sortedEntries = Object.entries(schedule).sort((a, b) => {
      return quarterToSortValue(a[0]) - quarterToSortValue(b[0]);
    });
    return Object.fromEntries(sortedEntries);
  };

  useEffect(() => {
    const fetchSchedules = async () => {
      if (!session?.user?.id) return;

      try {
        console.log("Fetching schedules for user ID:", session.user.id);
        
        // First, let's check if the user exists in profiles
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('profile_id')
          .eq('profile_id', session.user.id)
          .single();
          
        console.log("Profile data:", profileData);
        if (profileError) console.error("Profile error:", profileError);

        // Now fetch schedules
        const { data, error } = await supabase
          .from('schedules')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Sort quarters within each schedule
        const sortedSchedules = data?.map(schedule => ({
          ...schedule,
          schedule: {
            ...schedule.schedule,
            schedule: sortQuarters(schedule.schedule?.schedule)
          }
        })) || [];

        console.log("Sorted schedules data:", sortedSchedules);
        setSchedules(sortedSchedules);
      } catch (error) {
        console.error('Error fetching schedules:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [session]);

  const handlePrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(schedules.length - 1, prev + 1));
  };

  if (loading) {
    return (
      <div className="bg-gray-900 min-h-screen text-white flex flex-col items-center pt-10">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </div>
    );
  }

  const currentSchedule = schedules[currentIndex]?.schedule?.schedule;

  return (
    <div className="bg-gray-900 min-h-screen text-white flex flex-col items-center pt-10">
      <div className="max-w-7xl mx-auto px-4 w-full">
        <div className="flex justify-between items-center mb-8">
          <motion.h1
            className="text-3xl font-bold"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Saved Schedules
          </motion.h1>
          <motion.button
            onClick={() => navigate('/home')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Back to Home
          </motion.button>
        </div>

        {schedules.length === 0 ? (
          <motion.div
            className="bg-gray-700 rounded-lg shadow-md p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-gray-400">No saved schedules found.</p>
          </motion.div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className={`text-white ${currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:text-blue-500'}`}
              >
                <ArrowLeftCircle size={30} />
              </button>
              <span className="text-gray-400">
                Schedule {currentIndex + 1} of {schedules.length}
              </span>
              <button
                onClick={handleNext}
                disabled={currentIndex === schedules.length - 1}
                className={`text-white ${currentIndex === schedules.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:text-blue-500'}`}
              >
                <ArrowRightCircle size={30} />
              </button>
            </div>

            {currentSchedule && (
              <>
                <ScheduleSummary scheduleData={currentSchedule} />
                
                {/* Weekly Calendar - only show for first term */}
                {Object.entries(currentSchedule)[0] && (
                  <WeeklyCalendar courses={Object.entries(currentSchedule)[0][1]} />
                )}

                {/* Quarter Schedules */}
                {Object.entries(currentSchedule)
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
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}; 