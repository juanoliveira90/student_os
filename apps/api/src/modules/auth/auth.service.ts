"use server"

import { AuthQueries } from "./auth.queries.js"
import { type RegisterInput, type LoginInput, type getUserInput } from "./auth.types.js"
import * as bcrypt from "bcrypt"
import 'dotenv/config'

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
            throw { statusCode: 401, error: "wrong credentials" }
        }

        const checkPassword = userExists.password ? await bcrypt.compare(data.password, userExists.password) : false
        if (!checkPassword) {
            return { statusCode: 401, error: "wrong credentials" }
        }

        return {
            id: userExists.id,
            name: userExists.name,
            email: userExists.email,
        }
    },

    async userInformation(data: getUserInput) {
        const getUser = await AuthQueries.getUserByEmail(data.email)
        if (!getUser) {
            throw { statusCode: 401, message: "user is not registered" }
        }

        return {
            id: getUser.id,
            name: getUser.name,
            email: getUser.email
        }
    },

    async updateProfile(userId: number, name: string) {
        try {
            await AuthQueries.updateProfile(name, userId)
            return { statusCode: 201, message: "profile name updated!" }
        } catch (error) {
            console.error(error)
            return { statusCode: 500, error: "could not update profile name." }
        }
    },

    async updatePassword(userId: number, newPassword: string) {
        try {
            const newHashedPassword = await bcrypt.hash(newPassword, 10)
            await AuthQueries.updatePassword(userId, newHashedPassword)
            return { statusCode: 201, message: "password updated!" }
        } catch (error) {
            console.error(error)
            return { statusCode: 500, error: "could not update password." }
        }
    }
}
