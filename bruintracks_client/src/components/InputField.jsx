import React, { useState, useEffect, useRef } from 'react';

export const InputField = (props) => {
  const [curValue, setCurValue] = useState(
    props.defaultValue ? props.defaultValue : ''
  );

  const updateValue = (e) => {
    setCurValue(e.target.value);
    if (props.setValue) props.setValue(e.target.value);
  };

  return (
    <input
      {...props}
      value={curValue}
      onChange={updateValue}
      className={
        'p-4 bg-gray-100 border border-gray-300 text-gray-900 text-xl rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
      }
    ></input>
  );
};
