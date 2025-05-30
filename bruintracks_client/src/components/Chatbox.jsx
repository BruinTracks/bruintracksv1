import { Card } from './Card';
import { Button } from './Button';
import { InputField } from './InputField';
import { motion } from 'framer-motion';

const messages = [
  'Hi! How may I help you?',
  'This is a test message',
  'This is a test message',
];

export const Chatbox = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full"
    >
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, ind) => (
          <motion.div
            key={ind}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${ind % 2 === 0 ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                ind % 2 === 0
                  ? 'bg-gray-700 text-white'
                  : 'bg-blue-600 text-white'
              }`}
            >
              <p className="text-sm font-medium mb-1">
                {ind % 2 === 0 ? 'Assistant' : 'You'}
              </p>
              <p className="text-sm">{message}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700 p-4 bg-gray-800">
        <div className="flex items-center space-x-2">
          <InputField
            className="flex-1 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Type your message..."
          />
          <Button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
