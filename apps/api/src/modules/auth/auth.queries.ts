"use server"

import { db } from "../../db/client.ts"
import { Accounts, Users } from "../../db/schema.ts"
import { eq } from "drizzle-orm"

export const AuthQueries = {
    async createUser(name: string, email: string, passwordHash: string) {
        await db.insert(Users).values({ name: name, email: email, password: passwordHash })
    },
    
    async getUserByEmail(email: string) {
        console.log(email)
        return await db.query.Users.findFirst({
            where: eq(Users.email, email) 
        })
    }
}
