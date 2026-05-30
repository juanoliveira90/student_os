import { db } from "../../db/client.ts"
import { StudyPlans, Subjects, SubjectSubtasks } from "../../db/schema.ts"
import { eq } from "drizzle-orm"
import type { createSubject, createSubtask } from "./studyPlan.type.ts"


export const StudyPlanQueries = {
  async getStudyPlans(userId: number) {
    return await db.select().from(StudyPlans)
    .where(eq(StudyPlans.user_id, userId))
  },

  async createSubject(data: createSubject) {
    return await db.insert(Subjects)
    .values({ 
      id: data.id,
      name: data.name,
      schedule_block_id: data.schedule_block || null
    })
  },
  
  async createSubtasks(data: createSubtask) {
    await db.insert(SubjectSubtasks).values(
      data.subtasks.map((subtask) => ({
        id: subtask.id,
        subject_id: data.subject_id,
        name: subtask.name,
        description: subtask.description ?? null,
      }))
    )
  },

  async transactionSubjectSubtask(data: createSubject) {
    //await db.transaction(async (trx) => {
      await db.insert(Subjects)
      .values({ 
        id: data.id,
        name: data.name,
        schedule_block_id: data.schedule_block || null
      })
      
      if (data.subtasks?.length) {
        await db.insert(SubjectSubtasks).values(
          data.subtasks.map((subtask) => ({
            id: subtask.id,
            subject_id: data.id,
            name: subtask.name,
            description: subtask.description ?? null,
          }))
        )
      }
    //})
  }
  /*
  async createStudyPlanReturningId(userId: number, data: createSubject) {
    return await db.insert(StudyPlans).values({ user_id: userId, name: data.subject_name })
    .onConflictDoUpdate({ 
        target: StudyPlans.id,
        set: {
            user_id: sql`${StudyPlans.id}`
        }
    })
    .returning({ id: StudyPlans.id })
  },*/
  

}
