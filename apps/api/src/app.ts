import fastify from "fastify"
import fastifyCookie from "@fastify/cookie"
import fastifyJwt from "@fastify/jwt"

import 'dotenv/config'

import { AuthController } from "./modules/auth/auth.controller.ts"

export default function Build() {
    const app = fastify()

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
    })

    app.register(AuthController, {
        prefix: '/auth'
    })
    

    return app
}