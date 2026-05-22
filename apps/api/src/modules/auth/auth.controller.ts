import type { FastifyInstance } from "fastify";
import { AuthService } from "./auth.service.ts";

const registerSchema = {
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

const loginSchema = {
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


export async function AuthController(app: FastifyInstance) {
    app.post('/register', { schema: registerSchema }, async (request, reply) => {
        const result = await AuthService.register(request.body as any)
        return reply.code(201).send(result)
    })

    app.post('/login', { schema: loginSchema } ,async (request, reply) => {
        const user = await AuthService.login(request.body as any)
        const token = app.jwt.sign({
            sub: user.id,
            email: user.email,
        })

        reply.setCookie('access_token', token, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
            maxAge: 60 * 60 * 24 * 7
        })

        return reply.send(user)
    })

    app.get('/me', async (request, reply) => {
        try {
            const token = request.cookies.access_token

            if (!token) {
                return reply.code(401).send({ message: "not authenticated" })
            }

            const payload = app.jwt.verify(token)

            return reply.send({ user: payload })
        } catch {
            return reply.code(401).send({ message: "not authenticated" })
        }
    })
}