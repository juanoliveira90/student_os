import { db } from "../../db/client.js"
import { Subjects, SubjectSubtasks } from "../../db/schema.js"
import { and, eq } from "drizzle-orm"
import type { createSubject, createSubtask, studyPlanSubject, updateSubject, updateSubtask } from "./studyPlan.type.js"


export const StudyPlanQueries = {
  async getStudyPlans(userId: number) {
    const rows = await db.select({
      subjectId: Subjects.id,
      subjectName: Subjects.name,
      subjectTag: Subjects.tag,
      scheduleBlockId: Subjects.schedule_block_id,
      subtaskId: SubjectSubtasks.id,
      subtaskName: SubjectSubtasks.name,
      subtaskDescription: SubjectSubtasks.description,
      subtaskDone: SubjectSubtasks.done
    })
    .from(Subjects)
    .leftJoin(SubjectSubtasks, eq(SubjectSubtasks.subject_id, Subjects.id))
    .where(eq(Subjects.user_id, userId))

    const subjects = new Map<string, studyPlanSubject>()

    for (const row of rows) {
      const subject = subjects.get(row.subjectId) ?? {
        id: row.subjectId,
        name: row.subjectName,
        tag: row.subjectTag,
        schedule_block: row.scheduleBlockId,
        subtasks: []
      }

      if (row.subtaskId) {
        subject.subtasks.push({
          id: row.subtaskId,
          name: row.subtaskName!,
          description: row.subtaskDescription,
          done: row.subtaskDone!
        })
      }

      subjects.set(row.subjectId, subject)
    }

    return Array.from(subjects.values())
  },

  async createSubject(userId: number, data: createSubject) {
    return await db.insert(Subjects)
    .values({ 
      id: data.id,
      user_id: userId,
      name: data.name,
      tag: data.tag || null,
      schedule_block_id: data.schedule_block || null
    })
  },
  
  async createSubtasks(userId: number, data: createSubtask) {
    const subject = await db.select({ id: Subjects.id })
    .from(Subjects)
    .where(and(eq(Subjects.id, data.subject_id), eq(Subjects.user_id, userId)))

    if (!subject[0]) {
      throw new Error("subject not found")
    }

    await db.insert(SubjectSubtasks).values(
      data.subtasks.map((subtask) => ({
        id: subtask.id,
        subject_id: data.subject_id,
        name: subtask.name,
        description: subtask.description ?? null,
      }))
    )
  },

  async transactionSubjectSubtask(userId: number, data: createSubject) {
    //await db.transaction(async (trx) => {
      await db.insert(Subjects)
      .values({ 
        id: data.id,
        user_id: userId,
        name: data.name,
        tag: data.tag || null,
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
  },

  async deleteSubtask(userId: number, subtaskId: string) {
    const subtask = await db.select({ id: SubjectSubtasks.id })
    .from(SubjectSubtasks)
    .leftJoin(Subjects, eq(SubjectSubtasks.subject_id, Subjects.id))
    .where(and(eq(SubjectSubtasks.id, subtaskId), eq(Subjects.user_id, userId)))

    if (!subtask[0]) {
      return
    }

    await db.delete(SubjectSubtasks).where(eq(SubjectSubtasks.id, subtaskId))
  },

    async deleteSubject(userId: number, subjectId: string) {
    const subject = await db.select({ id: Subjects.id })
    .from(Subjects)
    .where(and(eq(Subjects.id, subjectId), eq(Subjects.user_id, userId)))

    if (!subject[0]) {
      return
    }

    await db.delete(Subjects).where(eq(Subjects.id, subjectId))
  },

  async updateSubject(userId: number, data: updateSubject) {
    const subject = await db.select({ id: Subjects.id })
    .from(Subjects)
    .where(and(eq(Subjects.id, data.id), eq(Subjects.user_id, userId)))

    if (!subject[0]) {
      throw new Error("subject not found")
    }

    await db.update(Subjects)
    .set({
      name: data.name,
      tag: data.tag || null,
      schedule_block_id: data.schedule_block || null,
      updated_at: new Date()
    })
    .where(eq(Subjects.id, data.id))
  },

  async updateSubtask(userId: number, data: updateSubtask) {
    const subtask = await db.select({ id: SubjectSubtasks.id })
    .from(SubjectSubtasks)
    .leftJoin(Subjects, eq(SubjectSubtasks.subject_id, Subjects.id))
    .where(and(eq(SubjectSubtasks.id, data.id), eq(Subjects.user_id, userId)))

    if (!subtask[0]) {
      throw new Error("subtask not found")
    }

    await db.update(SubjectSubtasks)
    .set({
      name: data.name,
      description: data.description ?? null,
      done: data.done,
      updated_at: new Date()
    })
    .where(eq(SubjectSubtasks.id, data.id))
  }
  
}
