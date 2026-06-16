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
                study_plan_id: { type: "string", nullable: true },
                day_of_week: { type: "string" },
                title: { type: "string" },
                tag: { type: "string" },
                description: { type: "string", nullable: true },
                start_time: { type: "string" },
                start_period: { type: "string", enum: ["AM", "PM"] },
                end_time: { type: "string" },
                end_period: { type: "string", enum: ["AM", "PM"] }
            },
            required: ["id", "day_of_week", "title", "start_time" , "end_time"]
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
                    study_plan_id: { type: "string", nullable: true },
                    day_of_week: { type: "string" },
                    title: { type: "string" },
                    tag: { type: "string" },
                    description: { type: "string", nullable: true },
                    start_time: { type: "string" },
                    start_period: { type: "string", enum: ["AM", "PM"] },
                    end_time: { type: "string" },
                    end_period: { type: "string", enum: ["AM", "PM"] }
                },
                required: ["id", "day_of_week", "title", "start_time", "end_time"]
                }
            }
        },
        required: ["events"]
    }
}

export const DeleteSchema = 
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
                },
                required: ["id"]
                }
            }
        },
        required: ["events"]
    }
}
