export const InsertSchema = 
{
    body: 
    {
        type: "object",
        properties: {
        events: {
            type: "array",
            items: {
            type: "object",
            properties: {
                id: { type: "string" },
                day_of_week: { type: "string" },
                title: { type: "string" },
                start_time: { type: "string" },
                start_period: { type: "string", enum: ["AM", "PM"] },
                end_time: { type: "string" },
                end_period: { type: "string", enum: ["AM", "PM"] }
            },
            required: ["id", "day_of_week", "title", "start_time", "start_period", "end_time", "end_period"]
            }
        }
        },
        required: ["events"]
    }
}

export const updateSchema = 
{
    body: 
    {
        type: "object",
        properties: {
        events: {
            type: "array",
            items: {
            type: "object",
            properties: {
                id: { type: "string" },
                day_of_week: { type: "string" },
                title: { type: "string" },
                start_time: { type: "string" },
                start_period: { type: "string", enum: ["AM", "PM"] },
                end_time: { type: "string" },
                end_period: { type: "string", enum: ["AM", "PM"] }
            },
            required: ["id", "day_of_week", "title", "start_time", "start_period", "end_time", "end_period"]
            }
        }
        },
        required: ["events"]
    }
}
