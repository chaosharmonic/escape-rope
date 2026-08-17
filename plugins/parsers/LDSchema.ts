import { getDOMQueryResults, parseHTML } from '../../src/utils/scraping.js'

import { filterValues } from 'collections/'

export const DOMSelectors = {
  json: 'script[type="application/json"]',
  jsonld: 'script[type="application/ld+json"]'
}

// Schema.org job post stuff here

const getLDScripts = html => {
  const doc = parseHTML(html)

  const ld = getDOMQueryResults(DOMSelectors.jsonld, doc)
  .map(e => JSON.parse(e.innerText))

  return ld
}

const expandSchemaData = (schema) => {
  if (schema["@graph"] || schema.itemListElement) {
    
    const graph = schema["@graph"] || []
    const list = schema.itemListElement || []

    return [...graph, ...list]
      .flatMap(e => expandSchemaData(e))
  }

  return schema
}

const validateJobSchema = schema => [schema['@type'], schema.additionalType].includes('JobPosting')

const getLDJobs = schemaList => schemaList.map(e => {
  if (validateJobSchema(e)) return [e]

  const data = expandSchemaData(e)

  return data.filter(e => validateJobSchema(e))
}).reduce((a, b) => [...a, ...b], [])

const extractSalaryData = job => {
  const sal = job.baseSalary

  const currency = job.salaryCurrency || sal?.currency || sal?.priceCurrency || 'USD' // TODO: default should be localized

  // if static value, skip parsing ranges
  const num = Number(sal) || Number(sal?.value) || Number(sal?.price)

  if (num) return {
    currency,
    min: num,
    per: 'year' // TODO: handle setting a default for this
  }

  const { value: val } = sal
  const per = val?.unitText?.toLowerCase() || 'year'

  const text = [sal?.price, val, val?.value]
    .find(e => typeof(e) == 'string')

  // if value is text, return text values along with any other extracted data
  if (text) return { currency, value: text, per }

  // min/max fields are explicitly defined as numbers
  const min = val?.minValue || val?.minPrice || val.value

  const max = val?.maxValue || val?.maxPrice

  if (!max) return { currency, min, per }

  return { currency, min, max, per }
}

export const parseLDJob = job => {
  const {
    title,
    hiringOrganization: employer,
    // url: retrievalLink // this is optional, apparently\
    //  but in practical terms it won't matter
  } = job

  const company = {
    name: employer?.name,
    companyProfileLink: employer?.url || employer?.sameAs
  }

  const data = {
    title,
    company,
  }

  const {
    employerOverview,
    employmentUnit,
    industry,
    baseSalary,
    applicationContact,
    incentiveCompensation,
    jobBenefits,
    salaryCurrency,
    description,
    datePosted,
    validThrough,
    totalJobOpenings,
    applicantLocationRequirements,
    qualifications,
    skills,
    educationalRequirements,
    experienceRequirements,
    experienceInPlaceOfEducation,
    securityClearanceRequirement
  } = job

  const pay = baseSalary ? extractSalaryData(job) : null

  const optionalParameters = filterValues({
    pay,
    description,
  }, e => e)

  // const extraParameters = filterValues({
  //   employerOverview
  //   employmentUnit
  //   industry,
  //   applicationContact,
  //   incentiveCompensation,
  //   jobBenefits,
  //   datePosted,
  //   validThrough,
  //   totalJobOpenings,
  //   applicantLocationRequirements,
  //   qualifications,
  //   skills,
  //   educationalRequirements,
  //   experienceRequirements
  //   experienceInPlaceOfEducation,
  //   securityClearanceRequirement
  // })

  return { ...data, ...optionalParameters }
}

export const parseJobDetailsPage = (html) => {
  const ld = getLDScripts(html)

  const ldJobs = getLDJobs(ld)
  if (!ldJobs.length) return {}

 // optionally, validate by title
 // there *could* be more than one on a page...
  const target = ldJobs.at(0)

  return parseLDJob(target)
}
