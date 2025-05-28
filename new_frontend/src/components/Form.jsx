// src/components/MultiStepForm.js
import React, { useState, useEffect, useRef } from 'react';
import '../index.css';
import '../main.jsx';
import { motion } from 'framer-motion';
import '../App.css';
import { ArrowLeftCircle, ArrowRightCircle } from 'react-bootstrap-icons';
import { Dropdown } from './Dropdown';
import { InputField } from './InputField';
import { useNavigate } from 'react-router-dom';
import { handleSignOut } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';

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
    fetch('http://localhost:3000/schools')
      .then(res => res.json())
      .then(data => {
        setSchoolOptions(data);
        if (!school && data.length > 0) setSchool(data[0]);
      });
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

const MajorAutocomplete = ({ school, major, setMajor }) => {
  const [options, setOptions] = useState([]);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [schoolId, setSchoolId] = useState(null);

  useEffect(() => {
    if (!school) return;
    fetch(`http://localhost:3000/schools`)
      .then(res => res.json())
      .then(data => {
        // Assume backend returns [{id, name}] in future, for now just name
        // So we need to fetch all schools and find the id
        fetch(`http://localhost:3000/schools/all`)
          .then(res2 => res2.json())
          .then(schools => {
            const found = schools.find(s => s.name === school);
            if (found) setSchoolId(found.id);
            console.log(found.id);
          });
      });
  }, [school]);

  useEffect(() => {
    if (!schoolId) return;
    fetch(`http://localhost:3000/majors?school_id=${schoolId}`)
      .then(res => res.json())
      .then(data => setOptions(data));
  }, [schoolId]);

  const filtered = options.filter(opt => opt.toLowerCase().includes(query.toLowerCase()));

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
        className="border rounded p-1 w-full bg-gray-100"
        placeholder="Search majors..."
      />
      {showDropdown && filtered.length > 0 && (
        <div className="absolute bg-white border w-full z-10 max-h-40 overflow-y-auto">
          {filtered.map(opt => (
            <div
              key={opt}
              className="p-2 hover:bg-blue-100 cursor-pointer"
              onClick={() => {
                setMajor(opt);
                setShowDropdown(false);
              }}
            >
              {opt}
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
  wantsDbMajor = null,
  setWantsDbMajor = () => {},
  doubleMajor = '',
  setDoubleMajor = () => {},
  wantsSummerClasses = null,
  setWantsSummerClasses = () => {},
  maxWorkload = -1,
  setMaxWorkload = () => {},
  school = '',
  validate = () => {}
}) => {
  const [dbMajorSelect, setDbMajorSelect] = useState(wantsDbMajor);

  const showDbMajor = (visible) => {
    setWantsDbMajor(visible == 'Yep');
    setDbMajorSelect(visible == 'Yep');
  };

  const setSummerClassesOn = (visible) => {
    setWantsSummerClasses(visible == 'Yep');
  };

  return (
    <FormModal
      handleClick={handleNextClick}
      handleBackClick={handleBackClick}
      back={true}
      validate={validate}
    >
      <p className="text-4xl font-bold mb-4">Tell us more!</p>
      <br />
      <div className="flex flex-row justify-center items-center">
        <label className="text-xl mr-5">Maximum # units:</label>
        <InputField
          type="number"
          defaultValue={maxWorkload > -1 ? maxWorkload : null}
          setValue={setMaxWorkload}
          required
          placeholder="0"
        />
      </div>
      <div className="flex flex-row justify-center items-center">
        <label className="text-xl mr-5">Major:</label>
        <div className="flex-1">
          <MajorAutocomplete school={school} major={major} setMajor={setMajor} />
        </div>
      </div>
      <div className="flex flex-row justify-center items-center">
        <label className="text-xl mr-5">Summer classes?</label>
        <Dropdown
          options={['Yep', 'No, thanks']}
          onSelect={setSummerClassesOn}
          defaultOption={
            wantsSummerClasses != null
              ? wantsSummerClasses
                ? 'Yep'
                : 'No, thanks'
              : undefined
          }
        />
      </div>
      <div className="flex flex-row justify-center items-center">
        <label className="text-xl mr-5">Double major?</label>
        <Dropdown
          options={['Yep', 'No, thanks']}
          onSelect={showDbMajor}
          defaultOption={
            wantsDbMajor != null
              ? wantsDbMajor
                ? 'Yep'
                : 'No, thanks'
              : undefined
          }
        />
      </div>
      <div
        className="flex flex-row justify-center items-center"
        hidden={!dbMajorSelect}
      >
        <label className="text-xl mr-5">Which one?</label>
        <Dropdown
          options={[]}
          onSelect={setDoubleMajor}
          defaultOption={doubleMajor}
        />
      </div>
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
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  const handleCreateProfile = async () => {
    if (!session || !session.user) {
      return;
    }

    const { error } = await supabase.from('profiles').insert([
      {
        profile_id: session.user.id, // Use the same id to match what you're checking for in GoogleAuthRouter
        // You can add other default fields here if your table requires them
        complete: true,
        full_name: "hi",
        created_at: "hi"
      },
    ]);

    if (error) {
      console.error(error);
    } else {
      navigate('/Home');
    }

  };

  return (
    <FormModal
      handleClick={handleCreateProfile}
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
          {data.wantsDbMajor ? (
            <span>
              <strong>Double major:</strong> {data.doubleMajor}
            </span>
          ) : (
            <></>
          )}
          <span>
            <strong>Summer Classes?</strong>{' '}
            {data.wantsSummerClasses ? 'Yes' : 'No'}
          </span>
          <span>
            <strong>Max workload:</strong> {data.maxWorkload}
          </span>
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
    </FormModal>
  );
};

// Grade options for transcript
const gradeOptions = [
  'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'
];

const TranscriptStep = ({ transcript, setTranscript, handleNextClick, handleBackClick }) => {
  // Use the same course list as in ClassSelect
  const allCourses = Object.values(classes).flat();
  const [selectedCourses, setSelectedCourses] = useState(Object.keys(transcript));

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

  return (
    <FormModal handleClick={handleNextClick} handleBackClick={handleBackClick}>
      <div className="p-4">
        <div className="mb-4">
          <strong>Select completed courses and assign a grade:</strong>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {allCourses.map((course, idx) => {
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
  const [wantsDbMajor, setWantsDbMajor] = useState(null);
  const [doubleMajor, setDoubleMajor] = useState('');
  const [wantsSummerClasses, setWantsSummerClasses] = useState(null);
  const [maxWorkload, setMaxWorkload] = useState(-1);
  const [earliestClassTime, setEarliestClassTime] = useState(null);
  const [latestClassTime, setLatestClassTime] = useState(null);

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
    return majors.includes(major) &&
      (!wantsDbMajor || majors.includes(doubleMajor)) &&
        maxWorkload >= 12;
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
          wantsDbMajor={wantsDbMajor}
          setWantsDbMajor={setWantsDbMajor}
          doubleMajor={doubleMajor}
          setDoubleMajor={setDoubleMajor}
          wantsSummerClasses={wantsSummerClasses}
          setWantsSummerClasses={setWantsSummerClasses}
          maxWorkload={maxWorkload}
          setMaxWorkload={setMaxWorkload}
          school={school}
          validate={infoDetailValidate}
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
            doubleMajor: doubleMajor,
            wantsDbMajor: wantsDbMajor,
            wantsSummerClasses: wantsSummerClasses,
            maxWorkload: maxWorkload,
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
            prefPriority: prefPriority
          }}
        />
      ) : (
        <></>
      )}
    </div>
  );
};
