export const noteInsertSchema = {
    body: {
        type: 'object',
        required: ['id', 'title', 'content'],
        properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            subject_id: { type: 'string', nullable: true }
        }
    }
}

export const noteUpdateSchema = {
    body: {
        type: 'object',
        required: ['id', 'title', 'content'],
        properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            subject_id: { type: 'string', nullable: true }
        }
    }
}

export const noteDeleteSchema = {
    body: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string' }
        }
    }
}
