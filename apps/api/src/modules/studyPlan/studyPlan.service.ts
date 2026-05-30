"use server"

import { StudyPlanQueries } from "./studyPlan.queries.ts"
import type { createSubtask, createSubject } from "./studyPlan.type.ts"

export const StudyPlanService = {
    async getStudyPlans(userId: number) {
        try {
            const plans = await StudyPlanQueries.getStudyPlans(userId)
            return { plans }
        } catch (error) {
            console.error(error)
            return { error: "could not load study plans" }
        }
    },

    async createSubject(data: createSubject) {
        try {
            await StudyPlanQueries.transactionSubjectSubtask(data)
            return { message: "subject created!" }
        } catch (error) {
            console.error(error)
            return { error: "an error occured when creating the subject" }
        }
    },

    /*async addSubtask(studyPlanId: number, data: createSubtask) {
        try {
            await StudyPlanQueries
            return { message: `subtask(s) created!` }
        } catch (error) {
            console.error(error)
            return { error: "no substasks created." }
        }
    },*/
}