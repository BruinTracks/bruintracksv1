import React from 'react';

export const InputField = ({ setValue, ...props }) => {
  return (
    <input
      {...props}
      onChange={(e) => {
        if (props.type === 'number') {
          setValue(Number(e.target.value));
        } else {
          setValue(e.target.value);
        }
      }}
      className={
        'p-4 bg-gray-100 border border-gray-300 text-gray-900 text-xl rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
      }
    ></input>
  );
};
