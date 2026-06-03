import type { FastifyInstance } from "fastify";
import { AuthService } from "./auth.service.js";
import { registerSchema, loginSchema } from "./auth.schemas.js";

export async function AuthController(app: FastifyInstance) {
    app.post('/register', { schema: registerSchema, config: { public: true } }, async (request, reply) => {
        const data = request.body as Parameters<typeof AuthService.register>[0]
        const result = await AuthService.register(data)
        return reply.code(201).send(result)
    })

    app.post('/login', { schema: loginSchema, config: { public: true } }, async (request, reply) => {
        const data = request.body as Parameters<typeof AuthService.login>[0]
        const user = await AuthService.login(data)
        if (!user.id || !user.email) {
            throw new Error("missing credentials")
        }
        const token = app.jwt.sign({
            sub: user.id?.toString(),
            email: user.email,
        })
        const isProduction = process.env.NODE_ENV === "production"
        const sameSite = process.env.COOKIE_SAME_SITE === "none" ? "none" : "lax"
        const secure = process.env.COOKIE_SECURE === "true" || isProduction

        reply.setCookie('access_token', token, {
            path: '/',
            httpOnly: true,
            sameSite,
            secure,
            maxAge: 60 * 60 * 24 * 7
        })

        return reply.send(user)
    })

    app.get('/me', async (request, reply) => {
        const user = request.user as { email: string }
        const info = await AuthService.userInformation(user)

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

    app.patch('/profile', async (request, reply) => {
        const data = request.body as { name: string }
        const result = await AuthService.updateProfile(parseInt(request.user.sub), data.name)
        if (result.error) {
            return reply.code(result.statusCode).send(result.error)
        }

        return reply.code(result.statusCode).send(result.message)
    })

    app.patch('/password', async (request, reply) => {
        const data = request.body as { new_password: string }
        const result = await AuthService.updatePassword(parseInt(request.user.sub), data.new_password)
        if (result.error) {
            return reply.code(result.statusCode).send(result.error)
        }

        return reply.code(result.statusCode).send(result.message)
    })
}
