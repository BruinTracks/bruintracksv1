import React, { useState, useEffect, useRef } from 'react';
import '../index.css';
import '../main.jsx';
import { motion } from 'framer-motion';
import '../App.css';

export const Dropdown = ({
  options,
  onSelect,
  defaultOption,
  placeholder = null,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const [selectedOption, setSelectedOption] = useState(
    options.includes(defaultOption) ? defaultOption : ''
  );

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const selectOption = (option) => {
    setIsDropdownOpen(false);
    onSelect(option);
    setSelectedOption(option);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false); // Close dropdown
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside); // Cleanup the event listener
    };
  }, []);

  return (
    <div className="flex flex-row justify-center items-center">
      <input
        type="text"
        ref={inputRef}
        id="dropdown"
        className="p-4 bg-gray-100 border border-gray-300 text-gray-900 text-xl rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 focus:bg-white"
        placeholder={placeholder ? placeholder : 'Select an option'}
        value={selectedOption}
        onClick={toggleDropdown}
        readOnly
      />
      {isDropdownOpen && (
        <motion.div
          ref={dropdownRef}
          id="dropdown-options"
          className="absolute bg-white border border-gray-300 rounded-lg shadow-lg w-full mt-1 z-10 dark:bg-gray-700 dark:border-gray-600"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
        >
          {options.map((option) => (
            <div
              className="p-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
              onClick={() => selectOption(option)}
            >
              {option}
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
};
