import Build from "./app.ts"

const server = Build()

server.listen({
    port: 3001
})