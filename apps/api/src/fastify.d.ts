import "fastify"
import "@fastify/jwt"
//import type { User } from "./modules/auth/auth.types.ts"

declare module "fastify" {
    interface FastifyContextConfig {
        public?: boolean
        allowUnverifiedEmail?: boolean
    }
    interface FastifyInstance {
        assertEmailNotVerified: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
        assertEmailVerified: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    }
    /*interface FastifyRequest {
        dbUser?: User
    }*/
}

declare module "@fastify/jwt" {
    interface FastifyJWT {
        payload: { sub: string, email: string }
        user: { sub: string, email: string }
    }
}
