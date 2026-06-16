export interface add {
    events: Array<
        {
            id: string,
            study_plan_id?: string | null,
            day_of_week: string,
            title: string,
            tag?: string
            description?: string | null,
            start_time: string,
            start_period?: string,
            end_time: string,
            end_period?: string,
        }
    >
}

export interface remove {
    events: Array<
        {
             id: string,
        }
    >
}
