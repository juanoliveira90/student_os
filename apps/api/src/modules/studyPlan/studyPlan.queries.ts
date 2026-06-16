import { db } from "../../db/client.js"
import { Schedule, ScheduleItems, StudyPlans, Subjects, SubjectSubtasks } from "../../db/schema.js"
import { and, eq, isNull } from "drizzle-orm"
import type { createStudyPlan, createSubject, createSubtask, studyPlan, studyPlanSubject, updateSubject, updateSubtask } from "./studyPlan.type.js"

async function createScheduleBlockForStudyPlan(userId: number, data: createStudyPlan) {
  if (!data.day_of_week || !data.start_time || !data.end_time) {
    return
  }

  const schedule = await db.insert(Schedule).values({ user_id: userId })
  .onConflictDoUpdate({
    target: Schedule.user_id,
    set: { user_id: userId }
  })
  .returning({ id: Schedule.id })

  await db.insert(ScheduleItems).values({
    id: data.id,
    schedule_id: schedule[0]!.id,
    study_plan_id: data.id,
    day_of_week: data.day_of_week,
    title: data.name,
    description: null,
    start_time: data.start_time,
    start_period: data.start_period ?? null,
    end_time: data.end_time,
    end_period: data.end_period ?? null,
  }).onConflictDoUpdate({
    target: ScheduleItems.id,
    set: {
      study_plan_id: data.id,
      day_of_week: data.day_of_week,
      title: data.name,
      start_time: data.start_time,
      start_period: data.start_period ?? null,
      end_time: data.end_time,
      end_period: data.end_period ?? null,
    }
  })
}

async function assignScheduleBlock(userId: number, studyPlanId: string, scheduleBlockId: string | null | undefined) {
  await db.update(ScheduleItems)
  .set({ study_plan_id: null })
  .where(eq(ScheduleItems.study_plan_id, studyPlanId))

  if (!scheduleBlockId) {
    return
  }

  const block = await db.select({ id: ScheduleItems.id })
  .from(ScheduleItems)
  .leftJoin(Schedule, eq(ScheduleItems.schedule_id, Schedule.id))
  .where(and(eq(ScheduleItems.id, scheduleBlockId), eq(Schedule.user_id, userId)))

  if (!block[0]) {
    throw new Error("schedule block not found")
  }

  await db.update(ScheduleItems)
  .set({ study_plan_id: studyPlanId })
  .where(eq(ScheduleItems.id, scheduleBlockId))
}

export const StudyPlanQueries = {
  async getStudyPlans(userId: number) {
    const rows = await db.select({
      studyPlanId: StudyPlans.id,
      studyPlanName: StudyPlans.name,
      studyPlanDayOfWeek: StudyPlans.day_of_week,
      studyPlanStartTime: StudyPlans.start_time,
      studyPlanStartPeriod: StudyPlans.start_period,
      studyPlanEndTime: StudyPlans.end_time,
      studyPlanEndPeriod: StudyPlans.end_period,
      studyPlanScheduleBlockId: StudyPlans.schedule_block_id,
      subjectId: Subjects.id,
      subjectStudyPlanId: Subjects.study_plan_id,
      subjectName: Subjects.name,
      subjectDescription: Subjects.description,
      subjectTag: Subjects.tag,
      scheduleBlockId: Subjects.schedule_block_id,
      subtaskId: SubjectSubtasks.id,
      subtaskName: SubjectSubtasks.name,
      subtaskDescription: SubjectSubtasks.description,
      subtaskDone: SubjectSubtasks.done
    })
    .from(StudyPlans)
    .leftJoin(Subjects, eq(Subjects.study_plan_id, StudyPlans.id))
    .leftJoin(SubjectSubtasks, eq(SubjectSubtasks.subject_id, Subjects.id))
    .where(eq(StudyPlans.user_id, userId))

    const orphanRows = await db.select({
      subjectId: Subjects.id,
      subjectStudyPlanId: Subjects.study_plan_id,
      subjectName: Subjects.name,
      subjectDescription: Subjects.description,
      subjectTag: Subjects.tag,
      scheduleBlockId: Subjects.schedule_block_id,
      subtaskId: SubjectSubtasks.id,
      subtaskName: SubjectSubtasks.name,
      subtaskDescription: SubjectSubtasks.description,
      subtaskDone: SubjectSubtasks.done
    })
    .from(Subjects)
    .leftJoin(SubjectSubtasks, eq(SubjectSubtasks.subject_id, Subjects.id))
    .where(and(eq(Subjects.user_id, userId), isNull(Subjects.study_plan_id)))

    const plans = new Map<string, studyPlan>()
    const subjects = new Map<string, studyPlanSubject>()

    for (const row of rows) {
      const plan = plans.get(row.studyPlanId) ?? {
        id: row.studyPlanId,
        name: row.studyPlanName,
        day_of_week: row.studyPlanDayOfWeek,
        start_time: row.studyPlanStartTime,
        start_period: row.studyPlanStartPeriod,
        end_time: row.studyPlanEndTime,
        end_period: row.studyPlanEndPeriod,
        schedule_block: row.studyPlanScheduleBlockId,
        subjects: []
      }

      if (row.subjectId) {
        const subject = subjects.get(row.subjectId) ?? {
          id: row.subjectId,
          study_plan_id: row.subjectStudyPlanId,
          name: row.subjectName!,
          description: row.subjectDescription,
          tag: row.subjectTag,
          schedule_block: row.scheduleBlockId,
          subtasks: []
        }

        if (row.subtaskId && !subject.subtasks.some((subtask) => subtask.id === row.subtaskId)) {
          subject.subtasks.push({
            id: row.subtaskId,
            name: row.subtaskName!,
            description: row.subtaskDescription,
            done: row.subtaskDone!
          })
        }

        subjects.set(row.subjectId, subject)
        if (!plan.subjects.some((planSubject) => planSubject.id === row.subjectId)) {
          plan.subjects.push(subject)
        }
      }

      plans.set(row.studyPlanId, plan)
    }

    for (const row of orphanRows) {
      const subject = subjects.get(row.subjectId) ?? {
        id: row.subjectId,
        study_plan_id: row.subjectStudyPlanId,
        name: row.subjectName,
        description: row.subjectDescription,
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

    return [...Array.from(plans.values()), ...Array.from(subjects.values()).filter((subject) => !subject.study_plan_id)]
  },

  async createStudyPlan(userId: number, data: createStudyPlan) {
    await db.insert(StudyPlans).values({
      id: data.id,
      user_id: userId,
      name: data.name,
      day_of_week: data.day_of_week ?? null,
      start_time: data.start_time ?? null,
      start_period: data.start_period ?? null,
      end_time: data.end_time ?? null,
      end_period: data.end_period ?? null,
      schedule_block_id: data.schedule_block ?? null,
    })

    if (data.schedule_block) {
      await assignScheduleBlock(userId, data.id, data.schedule_block)
    } else {
      await createScheduleBlockForStudyPlan(userId, data)
    }
  },

  async createSubject(userId: number, data: createSubject) {
    return await db.insert(Subjects)
    .values({ 
      id: data.id,
      user_id: userId,
      study_plan_id: data.study_plan_id ?? null,
      name: data.name,
      description: data.description ?? null,
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
        study_plan_id: data.study_plan_id ?? null,
        name: data.name,
        description: data.description ?? null,
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
      description: data.description ?? null,
      study_plan_id: data.study_plan_id ?? null,
      tag: data.tag || null,
      schedule_block_id: data.schedule_block || null,
      updated_at: new Date()
    })
    .where(eq(Subjects.id, data.id))
  },

  async updateStudyPlan(userId: number, data: createStudyPlan) {
    const plan = await db.select({ id: StudyPlans.id })
    .from(StudyPlans)
    .where(and(eq(StudyPlans.id, data.id), eq(StudyPlans.user_id, userId)))

    if (!plan[0]) {
      throw new Error("study plan not found")
    }

    await db.update(StudyPlans)
    .set({
      name: data.name,
      day_of_week: data.day_of_week ?? null,
      start_time: data.start_time ?? null,
      start_period: data.start_period ?? null,
      end_time: data.end_time ?? null,
      end_period: data.end_period ?? null,
      schedule_block_id: data.schedule_block ?? null,
      updated_at: new Date()
    })
    .where(eq(StudyPlans.id, data.id))

    if (data.schedule_block) {
      await assignScheduleBlock(userId, data.id, data.schedule_block)
    } else {
      await createScheduleBlockForStudyPlan(userId, data)
    }
  },

  async deleteStudyPlan(userId: number, studyPlanId: string) {
    const plan = await db.select({ id: StudyPlans.id })
    .from(StudyPlans)
    .where(and(eq(StudyPlans.id, studyPlanId), eq(StudyPlans.user_id, userId)))

    if (!plan[0]) {
      return
    }

    await assignScheduleBlock(userId, studyPlanId, null)
    await db.delete(StudyPlans).where(eq(StudyPlans.id, studyPlanId))
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
