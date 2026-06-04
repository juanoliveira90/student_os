export interface RegisterInput {
    email: string
    name: string
    password: string
}

export interface LoginInput {
    email: string
    password: string
}

export interface getUserInput {
    email: string
}

export interface recipientData {
    email: string,
    name: string
}

export interface storeEmailVerificationCode {
    userId: number,
    code_hash: string,
    expires_at: Date
}
