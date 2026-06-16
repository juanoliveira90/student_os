export const studyPlanInsertSchema = {
  body: {
    type: 'object',
    required: ['id', 'name'],
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      day_of_week: { type: 'string', nullable: true },
      start_time: { type: 'string', nullable: true },
      start_period: { type: ['string', 'null'], enum: ['AM', 'PM', null] },
      end_time: { type: 'string', nullable: true },
      end_period: { type: ['string', 'null'], enum: ['AM', 'PM', null] },
      schedule_block: { type: 'string', nullable: true }
    }
  }
}

export const subjectInsertSchema =
{
  body: {
    type: 'object',
    required: ['id', 'name'],
    properties: {
      id: { type: 'string' },
      study_plan_id: { type: 'string', nullable: true },
      name: { type: 'string' },
      description: { type: 'string', nullable: true },
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

export const deleteStudyPlanSchema = deleteSubjectSchema

export const subjectUpdateSchema = {
  body: {
    type: 'object',
    required: ['id', 'name'],
    properties: {
      id: { type: 'string' },
      study_plan_id: { type: 'string', nullable: true },
      name: { type: 'string' },
      description: { type: 'string', nullable: true },
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
