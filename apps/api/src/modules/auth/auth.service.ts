"use server"

import { AuthQueries } from "./auth.queries.ts"
import { type RegisterInput, type LoginInput, type getUserInput } from "./auth.types.ts"
import * as bcrypt from "bcrypt"

export const AuthService = {    
    async register(data: RegisterInput) {
        const userExists = await AuthQueries.getUserByEmail(data.email)
        if (userExists) {
            throw { statusCode: 409, message: "user already logged in" }
        }

        const hashedPassword = await bcrypt.hash(data.password, 10)

        await AuthQueries.createUser(data.name, data.email, hashedPassword)

        return { message: "user created!" }
    },

    async login(data: LoginInput) {
        const userExists = await AuthQueries.getUserByEmail(data.email)
        if (!userExists) {
            throw { statusCode: 409, message: "user is not registered" }
        }

        const checkPassword = userExists.password ? await bcrypt.compare(data.password, userExists.password) : false
        if (!checkPassword) {
            return { error: "wrong credentials" }
        }

        return {
            id: userExists.id,
            name: userExists.name,
            email: userExists.email,
        }
    },

    async userInformation(data: getUserInput) {
        console.log(data)
        const getUser = await AuthQueries.getUserByEmail(data.email)
        if (!getUser) {
            throw { statusCode: 409, message: "user is not registered" }
        }

        return {
            name: getUser.name,
            email: getUser.email
        }
    }
}