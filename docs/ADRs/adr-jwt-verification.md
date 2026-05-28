I've choosen to include fastify onRequest hoook instead of a preHandler. That's because fastify hook will check before the body is parsed, making it more efficient.

Reference: https://fastify.dev/docs/latest/Reference/Lifecycle/