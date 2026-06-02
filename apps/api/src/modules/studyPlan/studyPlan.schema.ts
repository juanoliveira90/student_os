export const subjectInsertSchema =
{
  body: {
    type: 'object',
    required: ['id', 'name'],
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      tag: { type: 'string', nullable: true },
      schedule_block: { type: 'string', nullable: true },
      subtasks: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' }
          }
        }
      }
    }
  }
}

export const deleteSubtaskSchema = {
  body: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' }
    }
  }
}

export const deleteSubjectSchema = {
  body: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' }
    }
  }
}

export const subjectUpdateSchema = {
  body: {
    type: 'object',
    required: ['id', 'name'],
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      tag: { type: 'string', nullable: true },
      schedule_block: { type: 'string', nullable: true }
    }
  }
}

export const subtaskUpdateSchema = {
  body: {
    type: 'object',
    required: ['id', 'name'],
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string', nullable: true },
      done: { type: 'boolean' }
    }
  }
}

export const subtaskInsertSchema = {
  body: {
    type: 'object',
    required: ['subject_id', 'subtasks'],
    properties: {
      subject_id: { type: 'string' },
      subtasks: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
          }
        }
      }
    }
  }
}
