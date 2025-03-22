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

const school_options = [
  'College of Letters and Sciences',
  'HSSEAS',
  'Music',
  'Film',
  'Arts & Arch',
  'Education',
  'Nursing',
  'Public Affairs',
];
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
    'COM SCI 118'
  ],
  'EC ENGR': [
    'EC ENGR 3',
    'EC ENGR 100',
    'EC ENGR 102',
    'EC ENGR 115C'
  ],
  'MATH': [
    'MATH 31A',
    'MATH 31B',
    'MATH 32A',
    'MATH 32B',
    'MATH 33A',
    'MATH 33B',
    'MATH 42',
    'MATH 61',
    'MATH 70',
    'MATH 115A'
  ]
}

const FormModal = ({ children, handleClick, handleBackClick }) => {
  return (
    <motion.div
      className="bg-gray-100 rounded-xl  border border-gray-700"
      style={{ width: '50%', 'padding-top': '2%', 'padding-bottom': '2%' }}
      whileHover={{ scale: 0.95, opacity: 1 }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 0.75, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
    >
      <div className="text-black flex flex-col items-center p-8 mt-5 space-y-4">
        {children}
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
          <button
            onClick={handleClick}
            className="text-black inline-block mt-1 hover:text-blue-500"
          >
            <ArrowRightCircle size={30} />
          </button>
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
  handleNextClick = () => {},
}) => {
  return (
    <FormModal handleClick={handleNextClick} handleBackClick={null}>
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
          options={school_options}
          onSelect={setSchool}
          defaultOption={school}
        />
      </div>
    </FormModal>
  );
};

const InfoDetail = ({
  handleBackClick = () => {},
  handleNextClick = () => {},
  gradQuarter = '',
  setGradQuarter = () => {},
  gradYear = -1,
  setGradYear = () => {},
  major = '',
  setMajor = () => {},
  wantsDbMajor = false,
  setWantsDbMajor = () => {},
  wantsMinor = false,
  setWantsMinor = () => {},
  doubleMajor = '',
  setDoubleMajor = () => {},
  minor = '',
  setMinor = () => {},
  wantsSummerClasses = false,
  setSummerClasses = () => {},
  maxWorkload = -1,
  setMaxWorkload = () => {},
}) => {
  const [dbMajorSelect, setDbMajorSelect] = useState(wantsDbMajor);
  const [minorSelect, setMinorSelect] = useState(wantsMinor);

  const showDbMajor = (visible) => {
    setWantsDbMajor(visible == 'Yep');
    setDbMajorSelect(visible == 'Yep');
  };

  const showMinor = (visible) => {
    setWantsMinor(visible == 'Yep');
    setMinorSelect(visible == 'Yep');
  };

  return (
    <FormModal
      handleClick={handleNextClick}
      handleBackClick={handleBackClick}
      back={true}
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
        <Dropdown options={majors} onSelect={setMajor} defaultOption={major} />
      </div>
      <div className="flex flex-row justify-center items-center">
        <label className="text-xl mr-5">Summer classes?</label>
        <Dropdown
          options={['Yep', 'No, thanks']}
          onSelect={setSummerClasses}
          defaultOption={wantsSummerClasses}
        />
      </div>
      <div className="flex flex-row justify-center items-center">
        <label className="text-xl mr-5">Double major?</label>
        <Dropdown
          options={['Yep', 'No, thanks']}
          onSelect={showDbMajor}
          defaultOption={wantsDbMajor}
        />
      </div>
      <div
        className="flex flex-row justify-center items-center"
        hidden={!dbMajorSelect}
      >
        <label className="text-xl mr-5">Which one?</label>
        <Dropdown
          options={majors}
          onSelect={setDoubleMajor}
          defaultOption={doubleMajor}
        />
      </div>
      <div className="flex flex-row justify-center items-center">
        <label className="text-xl mr-5">Minor?</label>
        <Dropdown
          options={['Yep', 'No, thanks']}
          onSelect={showMinor}
          defaultOption={wantsMinor}
        />
      </div>
      <div
        className="flex flex-row justify-center items-center"
        hidden={!minorSelect}
      >
        <label className="text-xl mr-5">Which one?</label>
        <Dropdown options={majors} onSelect={setMinor} defaultOption={minor} />
      </div>
    </FormModal>
  );
};

/*const ClassSelect = (classesList = [], setClassesList = () => {}) => {
  const [classes, setClasses] = useState(classes);
  
};*/

const ClassSelect = ({ items, defaultDept="COM SCI", columns = 4, handleNextClick = () => {}, handleBackClick = () => {} }) => {
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [dept, setDept] = useState(defaultDept);

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

  return (
    <FormModal handleClick={handleNextClick} handleBackClick={handleBackClick}>
    <div className="p-4">
    <Dropdown options={["ALL", "COM SCI", "EC ENGR", "MATH"]} onSelect={setDept} defaultOption={dept} placeholder={"Department"} />

      <div
        className={`grid gap-2`}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {(dept != "ALL" ? classes[dept] : Object.values(classes).flat()).map((item, index) => (
          <div
            key={index}
            className={`pl-4 pr-4 pt-2 pb-2 border rounded-lg text-center cursor-pointer transition ${
              selectedItems.has(item) ? "bg-blue-500 text-white" : "bg-gray-100"
            }`}
            onClick={() => toggleItem(item)}
          >
            {item}
          </div>
        ))}
      </div>

      <div className="mt-4 p-2 border rounded">
        <strong>Selected Items:</strong> {Array.from(selectedItems).join(", ") || "None"}
      </div>
    </div>
    </FormModal>
  );
}

const SummaryView = ({ handleBackClick = () => {} }) => {
  const navigate = useNavigate();
  console.log(handleBackClick)
  return <FormModal handleClick={() => navigate("/Home")} handleBackClick={handleBackClick}>
    Hello

  </FormModal>;
};

export const Form = () => {
  const [step, setStep] = useState(1);
  const handleNextClick = () => setStep(step + 1);
  const handleBackClick = () => setStep(step - 1);

  const [fullName, setFullName] = useState('');
  const [school, setSchool] = useState('');
  const [gradQuarter, setGradQuarter] = useState('');
  const [gradYear, setGradYear] = useState(-1);
  const [major, setMajor] = useState('');
  const [wantsDbMajor, setWantsDbMajor] = useState(false);
  const [doubleMajor, setDoubleMajor] = useState('');
  const [wantsMinor, setWantsMinor] = useState(false);
  const [minor, setMinor] = useState('');
  const [wantsSummerClasses, setWantsSummerClasses] = useState(false);
  const [maxWorkload, setMaxWorkload] = useState(-1);

  return (
    <div className="w-screen h-screen flex justify-center items-center">
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
          major={major}
          setMajor={setMajor}
          wantsDbMajor={wantsDbMajor}
          setWantsDbMajor={setWantsDbMajor}
          doubleMajor={doubleMajor}
          setDoubleMajor={setDoubleMajor}
          wantsMinor={wantsMinor}
          setWantsMinor={setWantsMinor}
          minor={minor}
          setMinor={setMinor}
          wantsSummerClasses={wantsSummerClasses}
          setWantsSummerClasses={setWantsSummerClasses}
          maxWorkload={maxWorkload}
          setMaxWorkload={setMaxWorkload}
        />
      ) : (
        <></>
      )}
      {step == 2 ? (
        <InfoDetail
          handleNextClick={handleNextClick}
          handleBackClick={handleBackClick}
        />
      ) : (
        <></>
      )}
      {step == 3 ? (
        <ClassSelect handleNextClick={handleNextClick} handleBackClick={handleBackClick} items={["hey", "COM SCI 35L", "hi", "1", "2", "3", "4", "5"]}/>
      ) : (
        <></>
      )}
      {step == 4 ? (
        <SummaryView handleBackClick={handleBackClick} />
      ) : <></>}
    </div>
  );
};
