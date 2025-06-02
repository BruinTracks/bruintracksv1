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
        name: "get_instructors_filtered",
        description: 
          "Retrieve instructors teaching in a given term. " +
          "If subject_code and catalog_number are provided, return only instructors for that specific course in the term.",
        parameters: {
          type: "object",
          properties: {
            term_name: {
              type: "string",
              description: "The term (e.g., 'Fall 2025')."
            },
            subject_code: {
              type: ["string", "null"],
              description: "Optional: Department code (e.g., 'COM SCI'). Use null if not filtering by course."
            },
            catalog_number: {
              type: ["string", "null"],
              description: "Optional: Course catalog number (e.g., '31'). Use null if not filtering by course."
            }
          },
          required: ["term_name"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_course_description",
        description: "Retrieve the description for a specific course.",
        parameters: {
          type: "object",
          properties: {
            subject_code: {
              type: "string",
              description: "The subject code (e.g., 'PHYSICS', 'COM SCI')"
            },
            catalog_number: {
              type: "string",
              description: "The catalog number (e.g., '31', '170')"
            }
          },
          required: ["subject_code", "catalog_number"]
        }
      }
    },
  ];