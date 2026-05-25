export const registerSchema = {
  body: {
    type: "object",
    required: ["email", "password", "name"],
    properties: {
        name:     { type: "string" },
        email:    { type: "string", format: "email" },
        password: { type: "string", minLength: 8 },
    },
    additionalProperties: false,
  },
} as const

export const loginSchema = {
  body: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email:    { type: "string", format: "email" },
      password: { type: "string" },
    },
    additionalProperties: false,
  },
} as const
