// src/components/MultiStepForm.js
import React, { useState, useEffect, useRef } from 'react';
import '../index.css';
import '../main.jsx';
import { motion } from 'framer-motion';
import '../App.css';
import { ArrowLeftCircle, ArrowRightCircle } from 'react-bootstrap-icons';
import { Dropdown } from './Dropdown.jsx';
import { InputField } from './InputField.jsx';
import { useNavigate } from 'react-router-dom';
import { handleSignOut } from '../supabaseClient.js';
import { useAuth } from '../AuthContext.jsx';
import { supabase } from '../supabaseClient.js';

const majors = [
  'CS',
  'CSE',
  'EE',
  'Math',
  'Linguistics',
  'Film',
  'DESMA',
  'English',
  'History',
];

const classes = {
  'COM SCI': [
    'COM SCI 31',
    'COM SCI 32',
    'COM SCI 33',
    'COM SCI 35L',
    'COM SCI M51A',
    'COM SCI 180',
    'COM SCI 111',
    'COM SCI 181',
    'COM SCI 118',
  ],
  'EC ENGR': ['EC ENGR 3', 'EC ENGR 100', 'EC ENGR 102', 'EC ENGR 115C'],
  MATH: [
    'MATH 31A',
    'MATH 31B',
    'MATH 32A',
    'MATH 32B',
    'MATH 33A',
    'MATH 33B',
    'MATH 42',
    'MATH 61',
    'MATH 70',
    'MATH 115A',
  ]
};

const FormModal = ({ children, handleClick, handleBackClick, validate }) => {
  const [isInvalid, setIsInvalid] = useState(false);

  return (
    <motion.div
      className="bg-gray-100 rounded-xl  border border-gray-700"
      style={{ width: '50%', 'paddingTop': '2%', 'paddingBottom': '2%' }}
      whileHover={{ scale: 0.95, opacity: 1 }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 0.75, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
    >
      <div className="text-black flex flex-col items-center p-8 mt-5 space-y-4">
        {children}
        { isInvalid && <span className="text-red-800 mb-5 font-bold">Make sure to complete all required fields.</span> }
        <div className="flex flex-row">
          {handleBackClick != null ? (
            <button
              onClick={handleBackClick}
              className="text-black inline-block mt-1 hover:text-blue-500"
            >
              <ArrowLeftCircle size={30} />
            </button>
          ) : (
            <></>
          )}
          <div className="flex flex-col">
            <button
              onClick={validate ? () => (validate() ? handleClick() : setIsInvalid(true)) : handleClick}
              className=" text-black inline-block mt-1 hover:text-blue-500"
            >
              <ArrowRightCircle size={30} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Icebreaker = ({
  name = '',
  setName = () => {},
  school = '',
  setSchool = () => {},
  gradQuarter = '',
  setGradQuarter = () => {},
  gradYear = undefined,
  setGradYear = () => {},
  handleNextClick = () => {},
  validate = null
}) => {
  const [schoolOptions, setSchoolOptions] = useState([]);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        console.log('Fetching schools...');
        const response = await fetch('http://localhost:3000/schools');
        if (!response.ok) {
          throw new Error('Failed to fetch schools');
        }
        const data = await response.json();
        console.log('Fetched schools:', data);
        setSchoolOptions(data);
        if (!school && data.length > 0) {
          console.log('Setting default school to:', data[0]);
          setSchool(data[0]);
        }
      } catch (error) {
        console.error('Error fetching schools:', error);
      }
    };

    fetchSchools();
  }, []);

  return (
    <FormModal handleClick={handleNextClick} validate={validate} handleBackClick={null}>
      <p className="text-4xl font-bold mt-4">But first,</p>
      <p className="text-4xl font-light mb-4">tell us about yourself!</p>
      <br />
      <div className="flex flex-row justify-center items-center">
        <label className="text-xl mr-5">Name:</label>
        <InputField
          type="text"
          defaultValue={name}
          setValue={setName}
          required
          placeholder="Jane Doe"
        />
      </div>
      <div className="flex flex-row justify-center items-center">
        <label className="text-xl mr-5">School:</label>
        <Dropdown
          options={schoolOptions}
          onSelect={setSchool}
          defaultOption={school}
          placeholder="Select a school"
        />
      </div>
      <div className="flex flex-row justify-center items-center">
        <label className="text-xl mr-5">Grad year:</label>
        <InputField
          type="number"
          defaultValue={gradYear || null}
          setValue={setGradYear}
          required
          placeholder="2027"
        />
      </div>
      <div className="flex flex-row justify-center items-center">
        <label className="text-xl mr-5">Grad quarter:</label>
        <Dropdown
          options={['Fall', 'Winter', 'Spring']}
          onSelect={setGradQuarter}
          defaultOption={gradQuarter}
        />
      </div>
    </FormModal>
  );
};

const MajorAutocomplete = ({ school, major, setMajor, setMajorName }) => {
  const [options, setOptions] = useState([]);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [schoolId, setSchoolId] = useState(null);

  useEffect(() => {
    if (!school) return;
    fetch(`http://localhost:3000/schools`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(schools => {
        const schoolIndex = schools.findIndex(s => 
          s.toLowerCase() === school.toLowerCase()
        );
        if (schoolIndex !== -1) {
          setSchoolId(schoolIndex + 1);
        } else {
          setSchoolId(null);
        }
      })
      .catch(() => setSchoolId(null));
  }, [school]);

  useEffect(() => {
    if (!schoolId) return;
    fetch(`http://localhost:3000/majors?school_id=${schoolId}`)
      .then(res => res.json())
      .then(data => {
        fetch('http://localhost:3000/majors/all')
          .then(res2 => res2.json())
          .then(allMajors => {
            const filtered = allMajors.filter(m => data.includes(m.full_name));
            setOptions(filtered);
          });
      })
      .catch(() => setOptions([]));
  }, [schoolId]);

  const filtered = options.filter(opt => opt.full_name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={major}
        onChange={e => {
          setQuery(e.target.value);
          setMajor(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        className="border rounded p-1 w-full bg-gray-100"
        placeholder="Search majors..."
      />
      {showDropdown && filtered.length > 0 && (
        <div className="absolute bg-white border border-gray-300 rounded shadow-lg w-full z-50 max-h-60 overflow-y-auto mt-1">
          {filtered.map(opt => (
            <div
              key={opt.major_name}
              className="p-2 hover:bg-blue-100 cursor-pointer text-black"
              onClick={() => {
                setMajor(opt.full_name);
                setMajorName && setMajorName(opt.major_name);
                setShowDropdown(false);
              }}
            >
              {opt.full_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const InfoDetail = ({
  handleBackClick = () => {},
  handleNextClick = () => {},
  major = '',
  setMajor = () => {},
  setMajorName = () => {},
  wantsDbMajor = null,
  setWantsDbMajor = () => {},
  doubleMajor = '',
  setDoubleMajor = () => {},
  setDoubleMajorName = () => {},
  school = '',
  validate = () => {},
  techBreadth = '',
  setTechBreadth = () => {},
  secondTechBreadth = '',
  setSecondTechBreadth = () => {}
}) => {
  const [dbMajorSelect, setDbMajorSelect] = useState(wantsDbMajor);
  const [secondSchool, setSecondSchool] = useState('');
  const [techBreadthError, setTechBreadthError] = useState('');

  const showDbMajor = (visible) => {
    setWantsDbMajor(visible == 'Yep');
    setDbMajorSelect(visible == 'Yep');
  };

  const isEngineeringSchool = (schoolName) => {
    return schoolName === 'Engineering';
  };

  const getTechBreadthOptions = (majorName) => {
    const allOptions = [
      'Bioengineering',
      'Chemical & Biomolecular Engineering',
      'Civil & Environmental Engineering',
      'Computer Science',
      'Electrical & Computer Engineering',
      'Materials Science & Engineering',
      'Mechanical & Aerospace Engineering',
      'Computational Genomics',
      'Digital Humanities',
      'Energy and the Environment',
      'Engineering Mathematics',
      'Engineering Science',
      'Nanotechnology',
      'Pre-Med',
      'Technology Management',
      'Urban Planning'
    ];

    // Special case for Computer Engineering and CSE majors
    if (majorName === 'Computer Engineering' || majorName === 'Computer Science and Engineering') {
      return allOptions;
    }

    // Filter out the major's own department
    return allOptions.filter(option => {
      if (majorName === 'Bioengineering' && option === 'Bioengineering') return false;
      if (majorName === 'Chemical Engineering' && option === 'Chemical & Biomolecular Engineering') return false;
      if (majorName === 'Civil Engineering' && option === 'Civil & Environmental Engineering') return false;
      if (majorName === 'Computer Science' && option === 'Computer Science') return false;
      if (majorName === 'Electrical Engineering' && option === 'Electrical & Computer Engineering') return false;
      if (majorName === 'Materials Science' && option === 'Materials Science & Engineering') return false;
      if (majorName === 'Mechanical Engineering' && option === 'Mechanical & Aerospace Engineering') return false;
      return true;
    });
  };

  const validateTechBreadth = () => {
    if (isEngineeringSchool(school) && !techBreadth) {
      setTechBreadthError('Please select a technical breadth area');
      return false;
    }
    if (isEngineeringSchool(secondSchool) && !secondTechBreadth) {
      setTechBreadthError('Please select a technical breadth area for your second major');
      return false;
    }
    setTechBreadthError('');
    return true;
  };

  return (
    <FormModal
      handleClick={() => validateTechBreadth() && handleNextClick()}
      handleBackClick={handleBackClick}
      back={true}
      validate={validate}
    >
      <p className="text-4xl font-bold mb-4">Tell us more!</p>
      <br />
      <div className="flex flex-row justify-center items-center">
        <label className="text-xl mr-5">Major:</label>
        <div className="flex-1">
          <MajorAutocomplete school={school} major={major} setMajor={setMajor} setMajorName={setMajorName} />
        </div>
      </div>
      {isEngineeringSchool(school) && (
        <div className="flex flex-row justify-center items-center mt-4">
          <label className="text-xl mr-5">Technical Breadth Area:</label>
          <div className="flex-1">
            <Dropdown
              options={getTechBreadthOptions(major)}
              onSelect={setTechBreadth}
              defaultOption={techBreadth}
              placeholder="Select a technical breadth area"
            />
          </div>
        </div>
      )}
      <div className="flex flex-row justify-center items-center">
        <label className="text-xl mr-5">Double major?</label>
        <Dropdown
          options={['Yep', 'No, thanks']}
          onSelect={showDbMajor}
          defaultOption={wantsDbMajor != null ? (wantsDbMajor ? 'Yep' : 'No, thanks') : undefined}
        />
      </div>
      {dbMajorSelect && (
        <>
          <div className="flex flex-row justify-center items-center">
            <label className="text-xl mr-5">Second School:</label>
            <Dropdown
              options={['Arts & Architecture', 'The College', 'Education & Information Studies', 'Engineering', 'Music', 'Nursing', 'Public Affairs', 'Theater, Film & Television']}
              onSelect={setSecondSchool}
              defaultOption={secondSchool}
            />
          </div>
          <div className="flex flex-row justify-center items-center">
            <label className="text-xl mr-5">Second Major:</label>
            <div className="flex-1">
              <MajorAutocomplete school={secondSchool} major={doubleMajor} setMajor={setDoubleMajor} setMajorName={setDoubleMajorName} />
            </div>
          </div>
          {isEngineeringSchool(secondSchool) && (
            <div className="flex flex-row justify-center items-center mt-4">
              <label className="text-xl mr-5">Second Major Technical Breadth Area:</label>
              <div className="flex-1">
                <Dropdown
                  options={getTechBreadthOptions(doubleMajor)}
                  onSelect={setSecondTechBreadth}
                  defaultOption={secondTechBreadth}
                  placeholder="Select a technical breadth area"
                />
              </div>
            </div>
          )}
        </>
      )}
      {techBreadthError && (
        <div className="text-red-600 font-semibold mt-4">{techBreadthError}</div>
      )}
    </FormModal>
  );
};

const daysOfWeek = ['M', 'T', 'W', 'Th', 'F'];

const SchedulePreferences = ({
  prefNoDays,
  setPrefNoDays,
  earliestClassTime,
  setEarliestClassTime,
  latestClassTime,
  setLatestClassTime,
  handleNextClick = () => {},
  handleBackClick = () => {},
  validate = () => {}
}) => {
  const toggleDay = (day) => {
    if (prefNoDays.includes(day)) {
      setPrefNoDays(prefNoDays.filter(d => d !== day));
    } else {
      setPrefNoDays([...prefNoDays, day]);
    }
  };

  return (
    <FormModal handleClick={handleNextClick} handleBackClick={handleBackClick} validate={validate}>
      <div className="p-4">
        <div className="flex flex-row justify-center items-center mb-4">
          <label className="text-xl mr-5">Prefer no class days on:</label>
          <div className="flex flex-row gap-2">
            {daysOfWeek.map((day, idx) => (
              <button
                key={idx}
                type="button"
                className={`px-3 py-1 rounded-lg border transition ${prefNoDays.includes(day) ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-100 text-black border-gray-300'}`}
                onClick={() => toggleDay(day)}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-row justify-center items-center">
        <label className="text-xl mr-5">Earliest start time:</label>
        <InputField
          type="time"
          defaultValue={earliestClassTime}
          setValue={setEarliestClassTime}
          required
          placeholder="HH:MM"
        />
      </div>
      <div className="flex flex-row justify-center items-center">
        <label className="text-xl mr-5">Latest end time:</label>
        <InputField
          type="time"
          defaultValue={latestClassTime}
          setValue={setLatestClassTime}
          required
          placeholder="HH:MM"
        />
      </div>
    </FormModal>
  )
};

const InstructorAutocomplete = ({ selected, setSelected }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const timeoutRef = useRef();

  const fetchInstructors = async (q) => {
    if (!q) {
      setResults([]);
      return;
    }
    try {
      const res = await fetch(`http://localhost:3000/instructors/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.filter(name => !selected.includes(name)));
    } catch (e) {
      setResults([]);
    }
  };

  const onChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => fetchInstructors(val), 200);
    setShowDropdown(true);
  };

  const onSelect = (name) => {
    setSelected([...selected, name]);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  const onRemove = (name) => {
    setSelected(selected.filter(n => n !== name));
  };

  return (
    <div className="relative w-full">
      <div className="flex flex-wrap gap-2 mb-1">
        {selected.map(name => (
          <span key={name} className="bg-blue-900 text-white px-2 py-1 rounded">
            {name}
            <button onClick={() => onRemove(name)} className="ml-1 text-white">&times;</button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={query}
        onChange={onChange}
        onFocus={() => setShowDropdown(true)}
        className="border rounded p-1 w-full"
        placeholder="Search instructors..."
      />
      {showDropdown && results.length > 0 && (
        <div className="absolute bg-white border w-full z-10 max-h-40 overflow-y-auto">
          {results.map(name => (
            <div
              key={name}
              className="p-2 hover:bg-blue-100 cursor-pointer"
              onClick={() => onSelect(name)}
            >
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const PreferencesStep = ({
  leastCoursesPerTerm,
  setLeastCoursesPerTerm,
  maxCoursesPerTerm,
  setMaxCoursesPerTerm,
  prefInstructors,
  setPrefInstructors,
  prefBuildings,
  setPrefBuildings,
  handleNextClick,
  handleBackClick
}) => {
  const isValid =
    maxCoursesPerTerm > leastCoursesPerTerm &&
    maxCoursesPerTerm <= 6 &&
    leastCoursesPerTerm >= 1;

  let errorMsg = '';
  if (maxCoursesPerTerm <= leastCoursesPerTerm) {
    errorMsg = 'Max courses per term must be greater than least courses per term.';
  } else if (maxCoursesPerTerm > 6) {
    errorMsg = 'Max courses per term cannot exceed 6.';
  }

  return (
    <FormModal handleClick={isValid ? handleNextClick : () => {}} handleBackClick={handleBackClick}>
      <div className="p-4 flex flex-col gap-6">
        <div className="flex flex-row items-center gap-4">
          <label className="text-xl w-64">Least courses per term:</label>
          <input
            type="number"
            min={1}
            value={leastCoursesPerTerm}
            onChange={e => setLeastCoursesPerTerm(Number(e.target.value))}
            className="border rounded p-1 w-24"
          />
        </div>
        <div className="flex flex-row items-center gap-4">
          <label className="text-xl w-64">Max courses per term:</label>
          <input
            type="number"
            min={1}
            value={maxCoursesPerTerm}
            onChange={e => setMaxCoursesPerTerm(Number(e.target.value))}
            className="border rounded p-1 w-24"
          />
        </div>
        {errorMsg && (
          <div className="text-red-600 font-semibold">{errorMsg}</div>
        )}
        <div className="flex flex-row items-center gap-4">
          <label className="text-xl w-64">Preferred instructors:</label>
          <div className="flex-1">
            <InstructorAutocomplete selected={prefInstructors} setSelected={setPrefInstructors} />
          </div>
        </div>
        <div className="flex flex-row items-center gap-4">
          <label className="text-xl w-64">Preferred buildings:</label>
          <input
            type="text"
            value={prefBuildings.join(', ')}
            onChange={e => setPrefBuildings(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            className="border rounded p-1 flex-1"
            placeholder="e.g. MS, SCI"
          />
        </div>
      </div>
    </FormModal>
  );
};

const AdvancedPreferencesStep = ({
  allowWarnings,
  setAllowWarnings,
  allowPrimaryConflicts,
  setAllowPrimaryConflicts,
  allowSecondaryConflicts,
  setAllowSecondaryConflicts,
  prefPriority,
  setPrefPriority,
  handleNextClick,
  handleBackClick
}) => {
  // Drag and drop logic
  const [draggedIdx, setDraggedIdx] = useState(null);

  const onDragStart = (idx) => setDraggedIdx(idx);
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (idx) => {
    if (draggedIdx === null || draggedIdx === idx) return;
    const newOrder = [...prefPriority];
    const [removed] = newOrder.splice(draggedIdx, 1);
    newOrder.splice(idx, 0, removed);
    setPrefPriority(newOrder);
    setDraggedIdx(null);
  };

  return (
    <FormModal handleClick={handleNextClick} handleBackClick={handleBackClick}>
      <div className="p-4 flex flex-col gap-6">
        <div className="flex flex-row items-center gap-4">
          <label className="text-xl w-64">Ignore unenforced requisites</label>
          <input
            type="checkbox"
            checked={allowWarnings}
            onChange={e => setAllowWarnings(e.target.checked)}
            className="w-6 h-6 accent-blue-900"
          />
        </div>
        <div className="flex flex-row items-center gap-4">
          <label className="text-xl w-64">Allow lecture conflicts</label>
          <input
            type="checkbox"
            checked={allowPrimaryConflicts}
            onChange={e => setAllowPrimaryConflicts(e.target.checked)}
            className="w-6 h-6 accent-blue-900"
          />
        </div>
        <div className="flex flex-row items-center gap-4">
          <label className="text-xl w-64">Allow discussion conflicts</label>
          <input
            type="checkbox"
            checked={allowSecondaryConflicts}
            onChange={e => setAllowSecondaryConflicts(e.target.checked)}
            className="w-6 h-6 accent-blue-900"
          />
        </div>
        <div className="flex flex-col gap-2 mt-4">
          <label className="text-xl mb-2">Rank your preferences (drag to reorder):</label>
          {prefPriority.map((item, idx) => (
            <div
              key={item}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(idx)}
              className={`flex items-center gap-2 px-4 py-2 rounded shadow cursor-move bg-gray-100 border border-gray-300 ${draggedIdx === idx ? 'opacity-50' : ''}`}
              style={{ userSelect: 'none' }}
            >
              <span className="w-32 capitalize">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </FormModal>
  );
};

const ClassSelect = ({
  items,
  defaultDept = 'COM SCI',
  columns = 4,
  handleNextClick = () => {},
  handleBackClick = () => {},
}) => {
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [dept, setDept] = useState(defaultDept);
  const [myClasses, setMyClasses] = useState([]);

  const toggleItem = (item) => {
    setSelectedItems((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(item)) {
        newSelection.delete(item);
      } else {
        newSelection.add(item);
      }
      return newSelection;
    });
  };

  useEffect(() => {
    console.log("testing");
    fetch("http://localhost:3000/get_courses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "majorName": "ComputerScienceBS"
      }),
    }).then(res => res.json()).then((res) => {
      setMyClasses(res);
    });
  }, []);

  console.log(myClasses);

  return (
    <FormModal handleClick={handleNextClick} handleBackClick={handleBackClick}>
      <div className="p-4">
        <Dropdown
          options={['ALL', 'My Major', 'COM SCI', 'EC ENGR', 'MATH']}
          onSelect={setDept}
          defaultOption={dept}
          placeholder={'Department'}
        />

        <div className="max-h-50 overflow-y-auto">
          <div
            className={`grid gap-2`}
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {(dept == 'My Major' ? myClasses : dept != 'ALL' ? classes[dept] : Object.values(classes).flat()).map(
              (item, index) => (
                <div
                  key={index}
                  className={`pl-4 pr-4 pt-2 pb-2 border rounded-lg text-center cursor-pointer transition ${
                    selectedItems.has(item)
                      ? 'bg-blue-900 text-white'
                      : 'bg-gray-100'
                  }`}
                  onClick={() => toggleItem(item)}
                >
                  {item}
                </div>
              )
            )}
          </div>
        </div>
        <div className="mt-4 p-2 border rounded">
          <strong>In-progress/completed classes:</strong>{' '}
          {Array.from(selectedItems).join(', ') || 'None'}
        </div>
      </div>
    </FormModal>
  );
};

const SummaryView = ({
  data = {},
  handleBackClick = () => {},
  setStep = () => {},
}) => {
  const { session } = useAuth();
  const navigate = useNavigate();

  const handleCreateProfile = async () => {
    console.log("hello world")
    console.log(session)
    if (!session || !session.user) {
      return;
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('profile_id')
      .eq('profile_id', session.user.id)
      .single();

    // Only create profile if it doesn't exist
    if (!existingProfile) {
      const { error } = await supabase.from('profiles').insert([
        {
          profile_id: session.user.id,
          complete: true,
          full_name: "hi",
          created_at: "hi"
        },
      ]);

      if (error) {
        console.error(error);
        return;
      }
    }

    navigate('/Home');
  };

  const handleGenerateSchedule = async () => {
    try {
      handleCreateProfile();
      console.log("Starting schedule generation...");
      console.log("Current session:", session); // Debug log
      
      // Get selected majors
      const selectedMajors = [data.majorName];
      if (data.doubleMajorName) {
        selectedMajors.push(data.doubleMajorName);
      }
      console.log("Selected majors:", selectedMajors);

      // Check for session
      if (!session || !session.access_token) {
        console.error("No active session found");
        // Redirect to login if no session
        navigate('/');
        return;
      }
      console.log("Got session:", session);

      // Fetch major requisites from Supabase
      console.log("Fetching major requisites...");
      const { data: majorRequisites, error: supabaseError } = await supabase
        .from('major_requisites')
        .select('json_data')
        .in('major_name', selectedMajors);

      if (supabaseError) {
        console.error("Error fetching major requisites:", supabaseError);
        return;
      }

      if (!majorRequisites || majorRequisites.length === 0) {
        console.log("No major requisites found for selected majors:", selectedMajors);
        return;
      }

      console.log("Raw JSON data from Supabase:", JSON.stringify(majorRequisites, null, 2));

      // Process the JSON data from each major
      const processedRequirements = majorRequisites.map(req => {
        console.log("Processing requirement:", JSON.stringify(req.json_data, null, 2));
        return req.json_data;
      });
      console.log("Processed requirements:", JSON.stringify(processedRequirements, null, 2));

      // Convert transcript object to array of course IDs
      const completedCourses = Object.keys(data.transcript || {}).map(course => {
        // Convert from "COM SCI|31" format to "COM SCI 31" format
        return course.replace('|', ' ');
      });

      const formattedTranscript = Object.fromEntries(
        Object.entries(data.transcript || {}).map(([course, grade]) => {
          const parts = course.split(' ');
          const catalogNumber = parts.pop();
          const subject = parts.join(' ');
          return [`${subject}|${catalogNumber}`, grade];
        })
      );
      console.log("Completed courses:", formattedTranscript);

      console.log("Calling get-courses-to-schedule endpoint...");
      // Call the get-courses-to-schedule endpoint
      const response = await fetch('http://localhost:3000/courses/get-courses-to-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          jsonData: processedRequirements,
          transcript: data.transcript,
          grad_year: data.gradYear,
          grad_quarter: data.gradQuarter,
          preferences: {
            allow_warnings: data.allowWarnings,
            allow_primary_conflicts: data.allowPrimaryConflicts,
            allow_secondary_conflicts: data.allowSecondaryConflicts,
            pref_priority: data.prefPriority,
            pref_earliest: data.earliestClassTime,
            pref_latest: data.latestClassTime,
            pref_no_days: data.prefNoDays,
            pref_buildings: data.prefBuildings,
            pref_instructors: data.prefInstructors,
            max_courses_per_term: data.maxCoursesPerTerm,
            least_courses_per_term: data.leastCoursesPerTerm,
            tech_breadth: data.techBreadth,
            second_tech_breadth: data.secondTechBreadth
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response from server:", errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const scheduleData = await response.json();
      console.log("Schedule data received:", JSON.stringify(scheduleData, null, 2));

      // Store schedule data in localStorage
      localStorage.setItem('scheduleData', JSON.stringify(scheduleData));
      console.log("Schedule data stored in localStorage");

      // Navigate to home page
      console.log("Navigating to home page...");
      navigate('/Home');
    } catch (error) {
      console.error("Error in handleGenerateSchedule:", error);
    }
  };

  return (
    <FormModal
      handleClick={handleGenerateSchedule}
      handleBackClick={handleBackClick}
    >
      <p className="text-4xl font-bold mb-4">Registration Summary</p>
      <div className="flex flex-col">
        <motion.div
          className="flex flex-col bg-gray-300 rounded-xl p-5 mb-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.75, y: 0 }}
          whileHover={{ opacity: 1, y: 20 }}
        >
          <a onClick={() => setStep(1)} className="cursor-pointer">
            Edit
          </a>
          <span>
            <strong>Full name:</strong> {data.fullName}
          </span>
          <span>
            <strong>School:</strong> {data.school}
          </span>
          <span>
            <strong>Graduation:</strong> {data.gradQuarter} {data.gradYear}
          </span>
        </motion.div>
        <motion.div
          className="flex flex-col bg-gray-300 rounded-xl p-5 mb-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.75, y: 0 }}
          whileHover={{ opacity: 1, y: 20 }}
        >
          <a onClick={() => setStep(2)} className="cursor-pointer underline">
            Edit
          </a>
          <span>
            <strong>Major:</strong> {data.major}
          </span>
          {data.techBreadth && (
            <span>
              <strong>Technical Breadth Area:</strong> {data.techBreadth}
            </span>
          )}
          {data.wantsDbMajor ? (
            <>
              <span>
                <strong>Double major:</strong> {data.doubleMajor}
              </span>
              {data.secondTechBreadth && (
                <span>
                  <strong>Second Major Technical Breadth Area:</strong> {data.secondTechBreadth}
                </span>
              )}
            </>
          ) : (
            <></>
          )}
        </motion.div>
        <motion.div
          className="flex flex-col bg-gray-300 rounded-xl p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.75, y: 0 }}
          whileHover={{ opacity: 1, y: 20 }}
        >
          <a onClick={() => setStep(3)} className="cursor-pointer underline">
            Edit
          </a>
          <span>
            <strong>Prefer no class days on:</strong>{' '}
            {data.prefNoDays.join(', ')}
          </span>
          <span>
            <strong>Earliest start time:</strong>{' '}
            {data.earliestClassTime}
          </span>
          <span>
            <strong>Latest end time:</strong> {data.latestClassTime}
          </span>
        </motion.div>
      </div>
      <button
        onClick={() => {
          console.log("Generate Schedule button clicked");
          handleGenerateSchedule();
        }}
        className="mt-4 bg-blue-900 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700"
      >
        Generate Schedule
      </button>
    </FormModal>
  );
};

// Grade options for transcript
const gradeOptions = [
  'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'
];

const TranscriptStep = ({ transcript, setTranscript, handleNextClick, handleBackClick, majorName, doubleMajorName }) => {
  const [selectedCourses, setSelectedCourses] = useState(Object.keys(transcript));
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('All');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const majors = [majorName].filter(Boolean);
        if (doubleMajorName) {
          majors.push(doubleMajorName);
        }
        const response = await fetch('http://localhost:3000/courses/by-majors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ majors }),
        });
        if (!response.ok) {
          throw new Error('Failed to fetch courses');
        }
        const courses = await response.json();
        setAvailableCourses(courses);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    };
    if (majorName) {
      fetchCourses();
    }
  }, [majorName, doubleMajorName]);

  const toggleCourse = (course) => {
    let newSelected;
    if (selectedCourses.includes(course)) {
      newSelected = selectedCourses.filter(c => c !== course);
      const newTranscript = { ...transcript };
      delete newTranscript[course];
      setTranscript(newTranscript);
    } else {
      newSelected = [...selectedCourses, course];
      setTranscript({ ...transcript, [course]: 'A' }); // default grade
    }
    setSelectedCourses(newSelected);
  };

  const setGrade = (course, grade) => {
    setTranscript({ ...transcript, [course]: grade });
  };

  const subjects = ['All', ...new Set(availableCourses.map(course => course.split(' ')[0]))];

  const filteredCourses = selectedSubject === 'All'
    ? availableCourses
    : availableCourses.filter(course => course.startsWith(selectedSubject));

  if (loading) {
    return (
      <FormModal handleClick={handleNextClick} handleBackClick={handleBackClick}>
        <div className="p-4 text-center">
          <p>Loading courses...</p>
        </div>
      </FormModal>
    );
  }

  return (
    <FormModal handleClick={handleNextClick} handleBackClick={handleBackClick}>
      <div className="p-4">
        <div className="mb-4">
          <strong>Select completed courses and assign a grade:</strong>
        </div>
        <div className="mb-4">
          <label className="text-xl mr-5">Filter by subject:</label>
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="border rounded p-1"
          >
            {subjects.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4 max-h-60 overflow-y-auto">
          {filteredCourses.map((course, idx) => {
            const isSelected = selectedCourses.includes(course);
            return (
              <div
                key={idx}
                className={`pl-4 pr-4 pt-2 pb-2 border rounded-lg text-center cursor-pointer transition ${isSelected ? 'bg-blue-900 text-white' : 'bg-gray-100'}`}
                onClick={() => toggleCourse(course)}
              >
                <div>{course}</div>
                {isSelected && (
                  <div className="mt-2">
                    <select
                      value={transcript[course] || 'A'}
                      onClick={e => e.stopPropagation()}
                      onChange={e => setGrade(course, e.target.value)}
                      className="border rounded p-1 bg-blue-900 text-white"
                    >
                      {gradeOptions.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </FormModal>
  );
};

export const Form = () => {
  const [step, setStep] = useState(1);
  useEffect(() => {
    setStep(1);
  }, []);
  const handleNextClick = () => setStep(step + 1);
  const handleBackClick = () => setStep(step - 1);

  const [fullName, setFullName] = useState('');
  const [school, setSchool] = useState('');
  const [gradQuarter, setGradQuarter] = useState('');
  const [gradYear, setGradYear] = useState(null);
  const [major, setMajor] = useState('');
  const [majorName, setMajorName] = useState('');
  const [wantsDbMajor, setWantsDbMajor] = useState(null);
  const [doubleMajor, setDoubleMajor] = useState('');
  const [doubleMajorName, setDoubleMajorName] = useState('');
  const [earliestClassTime, setEarliestClassTime] = useState(null);
  const [latestClassTime, setLatestClassTime] = useState(null);
  const [techBreadth, setTechBreadth] = useState('');
  const [secondTechBreadth, setSecondTechBreadth] = useState('');

  const [endYear, setEndYear] = useState(null);
  const [endQuarter, setEndQuarter] = useState('');

  // Transcript: { 'COM SCI|31': 'A', ... }
  const [transcript, setTranscript] = useState({});

  // Preferences
  const [allowWarnings, setAllowWarnings] = useState(true);
  const [allowPrimaryConflicts, setAllowPrimaryConflicts] = useState(true);
  const [allowSecondaryConflicts, setAllowSecondaryConflicts] = useState(true);
  const [prefPriority, setPrefPriority] = useState(['time', 'building', 'days', 'instructor']);
  const [prefEarliest, setPrefEarliest] = useState('09:00');
  const [prefLatest, setPrefLatest] = useState('18:00');
  const [prefNoDays, setPrefNoDays] = useState([]); // e.g. ['F']
  const [prefBuildings, setPrefBuildings] = useState([]); // e.g. ['MS', 'SCI']
  const [prefInstructors, setPrefInstructors] = useState([]); // e.g. ['Smith']
  const [maxCoursesPerTerm, setMaxCoursesPerTerm] = useState(5);
  const [leastCoursesPerTerm, setLeastCoursesPerTerm] = useState(3);

  const icebreakerValidate = () => {
    return fullName.length > 0 &&
      school && school.length > 0 &&
        ["Fall", "Winter", "Spring"].includes(gradQuarter) &&
          gradYear > 2023 &&
            gradYear < 2040;
  };

  const infoDetailValidate = () => {
    return major.length > 0 && // Check if major is not empty
      (!wantsDbMajor || (wantsDbMajor && doubleMajor.length > 0)); // If double major is selected, check if second major is not empty
  };

  const scheduleValidate = () => {
    return earliestClassTime != null && latestClassTime != null;
  };

  const navigate = useNavigate();
  const onSignOut = async () => {
    await handleSignOut();
    navigate("/");
  };

  return (
    <div className="w-screen h-screen flex justify-center items-center bg-gray-900 relative">
      <button
        onClick={onSignOut}
        className="absolute top-6 right-8 text-white bg-blue-900 px-4 py-2 rounded-lg shadow hover:bg-blue-700 z-50"
      >
        SIGN OUT
      </button>
      {step == 1 ? (
        <Icebreaker
          handleNextClick={handleNextClick}
          name={fullName}
          setName={setFullName}
          school={school}
          setSchool={setSchool}
          gradQuarter={gradQuarter}
          setGradQuarter={setGradQuarter}
          gradYear={gradYear}
          setGradYear={setGradYear}
          validate={icebreakerValidate}
        />
      ) : (
        <></>
      )}
      {step == 2 ? (
        <InfoDetail
          handleNextClick={handleNextClick}
          handleBackClick={handleBackClick}
          gradQuarter={gradQuarter}
          setGradQuarter={setGradQuarter}
          gradYear={gradYear}
          setGradYear={setGradYear}
          major={major}
          setMajor={setMajor}
          setMajorName={setMajorName}
          wantsDbMajor={wantsDbMajor}
          setWantsDbMajor={setWantsDbMajor}
          doubleMajor={doubleMajor}
          setDoubleMajor={setDoubleMajor}
          setDoubleMajorName={setDoubleMajorName}
          school={school}
          validate={infoDetailValidate}
          techBreadth={techBreadth}
          setTechBreadth={setTechBreadth}
          secondTechBreadth={secondTechBreadth}
          setSecondTechBreadth={setSecondTechBreadth}
        />
      ) : (
        <></>
      )}
      {step == 3 ? (
        <SchedulePreferences
          prefNoDays={prefNoDays}
          setPrefNoDays={setPrefNoDays}
          earliestClassTime={earliestClassTime}
          latestClassTime={latestClassTime}
          setEarliestClassTime={setEarliestClassTime}
          setLatestClassTime={setLatestClassTime}
          handleNextClick={handleNextClick}
          handleBackClick={handleBackClick}
          validate={scheduleValidate}
        />
      ) : (
        <></>
      )}
      {step == 4 ? (
        <PreferencesStep
          leastCoursesPerTerm={leastCoursesPerTerm}
          setLeastCoursesPerTerm={setLeastCoursesPerTerm}
          maxCoursesPerTerm={maxCoursesPerTerm}
          setMaxCoursesPerTerm={setMaxCoursesPerTerm}
          prefInstructors={prefInstructors}
          setPrefInstructors={setPrefInstructors}
          prefBuildings={prefBuildings}
          setPrefBuildings={setPrefBuildings}
          handleNextClick={handleNextClick}
          handleBackClick={handleBackClick}
        />
      ) : (
        <></>
      )}
      {step == 5 ? (
        <AdvancedPreferencesStep
          allowWarnings={allowWarnings}
          setAllowWarnings={setAllowWarnings}
          allowPrimaryConflicts={allowPrimaryConflicts}
          setAllowPrimaryConflicts={setAllowPrimaryConflicts}
          allowSecondaryConflicts={allowSecondaryConflicts}
          setAllowSecondaryConflicts={setAllowSecondaryConflicts}
          prefPriority={prefPriority}
          setPrefPriority={setPrefPriority}
          handleNextClick={handleNextClick}
          handleBackClick={handleBackClick}
        />
      ) : (
        <></>
      )}
      {step == 6 ? (
        <TranscriptStep
          transcript={transcript}
          setTranscript={setTranscript}
          handleNextClick={handleNextClick}
          handleBackClick={handleBackClick}
          majorName={majorName}
          doubleMajorName={wantsDbMajor ? doubleMajorName : null}
        />
      ) : (
        <></>
      )}
      {step == 7 ? (
        <SummaryView
          handleBackClick={handleBackClick}
          setStep={setStep}
          data={{
            fullName: fullName,
            school: school,
            gradQuarter: gradQuarter,
            gradYear: gradYear,
            major: major,
            majorName: majorName,
            doubleMajor: doubleMajor,
            doubleMajorName: doubleMajorName,
            wantsDbMajor: wantsDbMajor,
            prefNoDays: prefNoDays,
            earliestClassTime: earliestClassTime,
            latestClassTime: latestClassTime,
            transcript: transcript,
            leastCoursesPerTerm: leastCoursesPerTerm,
            maxCoursesPerTerm: maxCoursesPerTerm,
            prefInstructors: prefInstructors,
            prefBuildings: prefBuildings,
            allowWarnings: allowWarnings,
            allowPrimaryConflicts: allowPrimaryConflicts,
            allowSecondaryConflicts: allowSecondaryConflicts,
            prefPriority: prefPriority,
            techBreadth: techBreadth,
            secondTechBreadth: secondTechBreadth
          }}
        />
      ) : (
        <></>
      )}
    </div>
  );
};
