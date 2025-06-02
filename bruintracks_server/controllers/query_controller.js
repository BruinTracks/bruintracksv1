import { OpenAI } from "openai";
import dotenv from "dotenv";
import supabase from "./supabase_client.js";
import { tools } from "../tools/gpt_tools/tools-list.js";

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Input validation middleware
export const validateQueryInput = (req, res, next) => {
  const { question } = req.body;

  if (
    !question ||
    typeof question !== "string" ||
    question.trim().length === 0
  ) {
    return res.status(400).json({
      error:
        "Invalid input: question is required and must be a non-empty string",
    });
  }

  next();
};

export const processQuery = async (req, res) => {
  const { question, chatHistory = [] } = req.body;

  try {
    // Build messages array with chat history
    const messages = [
      {
        role: "system",
        content: `You are a university course assistant. Use the available functions to help answer questions about courses, instructors, and schedules.
                 Always try to use the most specific function that matches the user's query.
                 Maintain context from previous messages to provide more relevant and personalized responses.`,
      },
      ...chatHistory,
      { role: "user", content: question },
    ];

    // Invoke GPT with function calling
    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools,
      tool_choice: "auto",
    });

    const toolCall = gptResponse.choices[0].message.tool_calls?.[0];
    if (!toolCall) {
      return res.status(400).json({
        error: "Could not determine appropriate action for your question.",
        suggestion:
          "Please try rephrasing your question to be more specific about what information you need.",
      });
    }

    const { name, arguments: args } = toolCall.function;
    const params = JSON.parse(args);

    // Call the corresponding Supabase RPC function
    const { data, error } = await supabase.rpc(name, params);

    if (error) {
      console.error("Database Error:", error);
      return res.status(500).json({
        error: "Failed to retrieve the requested information.",
        details: error.message,
      });
    }

    // If no data was found
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return res.json({
        function_called: name,
        parameters: params,
        result: [],
        answer: `No information found matching your criteria. Please try adjusting your search parameters.`,
        chatHistory: [...chatHistory, { role: "user", content: question }],
      });
    }

    // Summarize the result using GPT
    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a helpful university course assistant. Summarize the following data in a clear, concise way.
                   If the data contains specific details (like times, locations, or prerequisites, subject codes, course codes, course names, instructor names, etc.), include those in your summary.
                   Keep your response under 3 sentences.
                   Consider the chat history context when providing the summary.`,
        },
        ...chatHistory,
        {
          role: "user",
          content: `Question: ${question}\n\nData: ${JSON.stringify(data)}`,
        },
      ],
    });

    const assistantResponse = summaryResponse.choices[0].message.content.trim();

    res.json({
      function_called: name,
      parameters: params,
      result: data,
      answer: assistantResponse,
      chatHistory: [
        ...chatHistory,
        { role: "user", content: question },
        { role: "assistant", content: assistantResponse },
      ],
    });
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({
      error: "An unexpected error occurred while processing your request.",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};
