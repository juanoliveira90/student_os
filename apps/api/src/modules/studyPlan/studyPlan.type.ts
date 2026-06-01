export interface createSubject {
    id: string,
    name: string,
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
    name: string
    tag?: string | null
    schedule_block?: string | null
}

export interface updateSubtask {
    id: string
    name: string
    description?: string | null
}

export interface studyPlanSubject {
    id: string
    name: string
    tag: string | null
    schedule_block: string | null
    subtasks: Array<{
        id: string
        name: string
        description: string | null
    }>
}
