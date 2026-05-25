import Build from "./app.ts"
import 'dotenv/config'

const server = Build()
const PORT = process.env.PORT!

await server.listen({
    port: parseInt(PORT)
})
console.log(`server listening on port ${PORT}`)