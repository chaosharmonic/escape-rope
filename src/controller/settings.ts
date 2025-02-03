import { Settings } from "../types.ts"
import { db } from '../db.ts'

export const getSettings = async () => {
    const result = await db.settings.getOne()

    return result
}

export const updateSettings = async (settings: Settings) => {
    const result = await db.settings.updateOne()

    return result
}

