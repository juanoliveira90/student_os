export const noteInsertSchema = {
    body: {
        type: 'object',
        required: ['id', 'title', 'content'],
        properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' }
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
            content: { type: 'string' }
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
