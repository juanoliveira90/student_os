export interface createNote {
    id: string
    title: string
    content: string
    subject_id?: string | null
}

export interface updateNote {
    id: string
    title: string
    content: string
    subject_id?: string | null
}

export interface deleteNote {
    id: string
}
