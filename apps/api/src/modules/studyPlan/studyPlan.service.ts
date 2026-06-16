"use server"

import { StudyPlanQueries } from "./studyPlan.queries.js"
import type { createStudyPlan, createSubtask, createSubject, updateSubject, updateSubtask } from "./studyPlan.type.js"

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

    async createStudyPlan(userId: number, data: createStudyPlan) {
        try {
            await StudyPlanQueries.createStudyPlan(userId, data)
            return { message: "study plan created!" }
        } catch (error) {
            console.error(error)
            return { error: "could not create study plan." }
        }
    },

    async updateStudyPlan(userId: number, data: createStudyPlan) {
        try {
            await StudyPlanQueries.updateStudyPlan(userId, data)
            return { message: "study plan updated!" }
        } catch (error) {
            console.error(error)
            return { error: "could not update study plan." }
        }
    },

    async deleteStudyPlan(userId: number, studyPlanId: string) {
        try {
            await StudyPlanQueries.deleteStudyPlan(userId, studyPlanId)
            return { message: "study plan deleted!" }
        } catch (error) {
            console.error(error)
            return { error: "could not delete study plan." }
        }
    },

    async createSubject(userId: number, data: createSubject) {
        try {
            await StudyPlanQueries.transactionSubjectSubtask(userId, data)
            return { message: "subject created!" }
        } catch (error) {
            console.error(error)
            return { error: "an error occured when creating the subject." }
        }
    },

    async deleteSubtask(userId: number, subtaskId: string) {
        try {
            await StudyPlanQueries.deleteSubtask(userId, subtaskId)
            return { message: "subtask deleted!" }
        } catch (error) {
            console.error(error)
            return { error: "could not delete subtask." }
        }
    },

    async deleteSubject(userId: number, subjectId: string) {
        try {
            await StudyPlanQueries.deleteSubject(userId, subjectId)
            return { message: "subject deleted!" }
        } catch (error) {
            console.error(error)
            return { error: "could not delete subject." }
        }
    },

    async addSubtask(userId: number, data: createSubtask) {
        try {
            await StudyPlanQueries.createSubtasks(userId, data)
            return { message: `subtask(s) created!` }
        } catch (error) {
            console.error(error)
            return { error: "no subtasks created." }
        }
    },

    async updateSubject(userId: number, data: updateSubject) {
        try {
            await StudyPlanQueries.updateSubject(userId, data)
            return { message: "subject updated!" }
        } catch (error) {
            console.error(error)
            return { error: "could not update subject." }
        }
    },

    async updateSubtask(userId: number, data: updateSubtask) {
        try {
            await StudyPlanQueries.updateSubtask(userId, data)
            return { message: "subtask updated!" }
        } catch (error) {
            console.error(error)
            return { error: "could not update subtask." }
        }
    },
}
