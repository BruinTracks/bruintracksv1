export const tools = [
  {
    type: "function",
    function: {
      name: "get_courses_by_foundation",
      description: "Retrieve courses that satisfy a specific general education foundation.",
      parameters: {
        type: "object",
        properties: {
          foundation_text: {
            type: "string",
            description: "The foundation name (e.g., 'Scientific Inquiry')",
          },
        },
        required: ["foundation_text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_courses_by_subject",
      description: "List all courses offered by a specific subject code.",
      parameters: {
        type: "object",
        properties: {
          subject_code: {
            type: "string",
            description: "The subject code (e.g., 'MATH')",
          },
        },
        required: ["subject_code"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_courses",
      description: "Search for courses matching a free-text term in titles and descriptions, returning them ordered by relevance.",
      parameters: {
        type: "object",
        properties: {
          search_term: {
            type: "string",
            description: "The search term to query courses by (e.g., 'robots')",
          },
        },
        required: ["search_term"],
      },
    },
  },
];