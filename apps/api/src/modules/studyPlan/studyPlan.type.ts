export interface createSubject {
    id: string,
    name: string,
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
