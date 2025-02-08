import {
    Blocklist,
    CoverLetterTemplate,
    Settings
} from "../types.ts"
import { db } from '../db.ts'

export const getSettings = async () => {
    const result = await db.settings.getOne()

    return result
}

export const updateSettings = async (settings: Settings) => {
    const result = await db.settings.updateOne(settings, {strategy: 'merge-shallow'})

    return result
}

const updatePartialSettings = async (
    newSetting, // TODO: actually enforce the name
    // something something subset properties
    // look up whatever TypeScript has on this
    campaignName: string = 'user'
) => {
    const { value: settings } = await db.settings.getOne()
    
    console.log({campaignName})

    if (campaignName == 'user') {
        return await db.settings.updateOne({ ...newSetting })
    }

    const { campaigns } = settings
    
    const target = campaigns
    .findIndex(({name}) => name == campaignName)

    const newValue = { ...campaigns[target], ...newSetting }

    const next = campaigns.toSpliced(target, 1, newValue)

    // TODO: on fixing the typing, I maybe
    //  could just call the collection's update
    //  handler directly
    return await updateSettings({
        ...settings,
        campaigns: [ ...next ]
    })
}

const updateSingleGlobalSetting = async (newSetting) =>
    await updatePartialSettings({ ...newSetting })

export const updateCoverLetters = async (
    coverLetters: CoverLetterTemplate[],
    campaignName: string = 'user'
) => {
    if (campaignName == 'user') {
        return await updateSingleGlobalSetting({
            ...coverLetters
        })
    }

    return await updatePartialSettings({
        ...coverLetters
    }, campaignName)
}

export const updateBlocklist = async (
    blocklist: Blocklist,
    campaignName: string = 'user'
) => {
    if (campaignName == 'user') {
        return await updateSingleGlobalSetting({
            ...blocklist
        })
    }

    return await updatePartialSettings({
        ...blocklist
    }, campaignName)
}

export const updateDefaultInterviewQuestions = async (
    defaultInterviewQuestions: string[],
    campaignName: string = 'user'
) => {
    if (campaignName == 'user') {
        return await updateSingleGlobalSetting({
            defaultInterviewQuestions
        })
    }

    return await updatePartialSettings({
        defaultInterviewQuestions
    }, campaignName)
}
