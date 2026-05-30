export const subjectInsertSchema =
{
  body: {
    type: 'object',
    required: ['id', 'name'],
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
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
