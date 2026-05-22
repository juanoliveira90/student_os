import fastify from "fastify"
import fastifyCookie from "@fastify/cookie"
import fastifyJwt from "@fastify/jwt"

import 'dotenv/config'

export default function Build() {
    const app = fastify()

    app.register(fastifyCookie, {
        secret: process.env.COOKIE_SECRET! 
    })
    app.register(fastifyJwt, {
        secret: process.env.JWT_SECRET!
    })

    return app
}