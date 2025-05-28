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
      animate={{ opacity: 0.75 }}
      whileHover={{ opacity: 1, y: -20 }}
      className="flex-1 h-full"
    >
      <div className="mt-5 mb-5 bg-gray-500 rounded-2xl p-3">
        <motion.h2
          className="text-3xl font-bold mt-6 mb-6 p-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          AI Planning Assistant
        </motion.h2>

        {messages.map((message, ind) => (
          <div className="p-1">
            <strong>{ind % 2 == 0 ? 'Assistant:' : 'You:'}</strong> {message}
          </div>
        ))}
      </div>
      <Card className="bg-gray-500 p-4 rounded-2xl shadow-md flex items-center">
        <InputField
          className="flex-grow bg-gray-700 border-none text-white placeholder-gray-400"
          placeholder="Ask me anything..."
        />
        <Button className="ml-2 bg-blue-500 hover:bg-blue-600 text-white">
          Send
        </Button>
      </Card>
    </motion.div>
  );
};
