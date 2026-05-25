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
    app.post('/register', { schema: registerSchema, config: { public: true } }, async (request, reply) => {
        const result = await AuthService.register(request.body as any)
        return reply.code(201).send(result)
    })

    app.post('/login', { schema: loginSchema, config: { public: true } }, async (request, reply) => {
        const user = await AuthService.login(request.body as any)
        if (!user.id || !user.email) {
            throw new Error("missing id")
        }
        const token = app.jwt.sign({
            sub: user.id?.toString(),
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
        const user = request.user
        const info = await AuthService.userInformation(user as { email: string })

        return reply.send({ user: info })
    })

    app.post('/logout', async (request, reply) => {
        try {
            reply.clearCookie('access_token', { path: '/' })

            return reply.send({ message: 'you logged out.' })
        } catch (error) {
            console.error(error)
            return reply.code(401).send({ message: "not authenticated" })
        }
    })
}