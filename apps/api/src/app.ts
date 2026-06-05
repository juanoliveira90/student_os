import fastify from "fastify"
import fastifyCookie from "@fastify/cookie"
import fastifyCors from "@fastify/cors"
import fastifyJwt from "@fastify/jwt"
import fastifyRateLimit from "@fastify/rate-limit"

import 'dotenv/config'

import { AuthController } from "./modules/auth/auth.controller.js"
import { AuthQueries } from "./modules/auth/auth.queries.js"
import { NotesController } from "./modules/notes/notes.controller.js"
import { ScheduleController } from "./modules/schedule/schedule.controller.js"
import { StudyPlanController } from "./modules/studyPlan/studyPlan.controller.js"

export default function Build() {
    const app = fastify()
    const frontendOrigin = process.env.FRONTEND_ORIGIN
    const isDev = process.env.NODE_ENV === "development"

    if (frontendOrigin && !isDev) {
        app.register(fastifyCors, {
            origin: frontendOrigin.split(",").map((origin) => origin.trim()),
            credentials: true,
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
        })
    }
    else if (isDev) {
        app.register(fastifyCors, {
            origin: [
                'http://localhost:3001', 
                'http://localhost:5173',
                'http://127.0.0.1:5173',
            ],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS', 'DELETE'],
        })
    }

    app.register(fastifyCookie, {
        secret: process.env.COOKIE_SECRET! 
    })
    
    app.register(fastifyJwt, {
        secret: process.env.JWT_SECRET!,
        cookie: {
            cookieName: "access_token",
            signed: false
        }
    })

    app.register(fastifyRateLimit, {
        global: false,
    })

    app.setErrorHandler((error, _request, reply) => {
        const statusCode = typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number"
            ? error.statusCode
            : 500
        const message = typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
            ? error.message
            : "Request failed"

        if (statusCode >= 500) {
            console.error(error)
            return reply.code(statusCode).send({ message: "Something went wrong. Please try again." })
        }

        return reply.code(statusCode).send({ message })
    })

    app.addHook("onRequest", async (request, reply) => {
        if (request.routeOptions.config?.public) return

        const token = request.cookies.access_token
        if (!token) {
            return reply.code(401).send({ message: "not authenticated" })
        }

        try {
            await request.jwtVerify({ onlyCookie: true })
        } catch {
            return reply.code(401).send({ error: "Unauthorized" })
        }

        if (request.routeOptions.config?.allowUnverifiedEmail) return
    })

    app.decorate('assertEmailNotVerified', async (request, reply) => {
        const user = await AuthQueries.getUserByEmail(request.user.email)
        if (!user) {
            return reply.code(401).send({ message: "not authenticated" })
        }

        if (user.email_verified) {
            return reply.code(409).send({ message: "email already confirmed" })
        }
    })

    app.decorate('assertEmailVerified', async (request, reply) => {
        const user = await AuthQueries.getUserByEmail(request.user.email)
        if (!user) {
            return reply.code(401).send({ message: "not authenticated" })
        }

        if (!user.email_verified) {
            return reply.code(403).send({ message: "email is not confirmed" })
        }
    })

    app.register(AuthController, {
        prefix: '/auth'
    })

    app.register(ScheduleController, {
        prefix: '/schedule'
    })
    
    app.register(StudyPlanController, {
        prefix: '/plan'
    })

    app.register(NotesController, {
        prefix: '/notes'
    })

    return app
}
