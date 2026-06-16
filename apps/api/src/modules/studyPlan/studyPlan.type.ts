export interface createStudyPlan {
    id: string
    name: string
    day_of_week?: string | null
    start_time?: string | null
    start_period?: string | null
    end_time?: string | null
    end_period?: string | null
    schedule_block?: string | null
}

export interface createSubject {
    id: string,
    study_plan_id?: string | null,
    name: string,
    description?: string | null,
    tag?: string | null,
    schedule_block?: string | null,
    subtasks?: Array<
        {
            id: string,
            name: string
            description?: string
        }
    >
}

export interface createSubtask {
    subject_id: string,
    subtasks: Array<{
        id: string,
        name: string
        description?: string
    }>
}

export interface updateSubject {
    id: string
    study_plan_id?: string | null
    name: string
    description?: string | null
    tag?: string | null
    schedule_block?: string | null
}

export interface updateSubtask {
    id: string
    name: string
    description?: string | null
    done: boolean
}

export interface studyPlanSubject {
    id: string
    study_plan_id?: string | null
    name: string
    description: string | null
    tag: string | null
    schedule_block: string | null
    subtasks: Array<{
        id: string
        name: string
        description: string | null
        done: boolean
    }>
}

export interface studyPlan {
    id: string
    name: string
    day_of_week: string | null
    start_time: string | null
    start_period: string | null
    end_time: string | null
    end_period: string | null
    schedule_block: string | null
    subjects: studyPlanSubject[]
}
