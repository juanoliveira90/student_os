import Build from "./app.js"
import 'dotenv/config'

const server = Build()
const PORT = process.env.PORT!

await server.listen({
    port: parseInt(PORT),
    host: "0.0.0.0"
})
console.log(`server listening on port ${PORT}`)
