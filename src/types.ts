// WIP. Mostly here for database schema

export interface Person {
  name: string
  title?: string
  email?: string
  linkedIn?: string
  notes: string // Markdown
  // ...other contact info? LinkedIn, phone
  // contactHistory??
  // also this should account for personal outreach
  //  beyond just a loose "notes" field
}

// this *seems* like it could feasibly be used
//  for reviews *or* job listings, honestly
// I'm actually not sure I need anything more
//  specific than this
export interface SearchSource {
  name: string
  postDate?: Date // if available
  retrievalDate: Date
  retrievalLink?: string // may be blank if recruiter/referral
  // also is URL a valid TS type?
}

// export interface ReviewSearchParams?
// do I want to specifically filter for, say, rating?

export interface JobSearchParams { // more?
  searchTerms: string
  location: string
  maxAge?: number
  salaryTarget?: number
}

type JobSearchSource = SearchSource & {
  searchParams?: JobSearchParams
  // this could be entered manually
  redirectLink?: string
  // this might be a place to put location if, say, a company on LI
  //  behaves like a bad actor and spams a listing for every region
  easyApply?: boolean // mostly for validation, assuming it's there even
  // (not every platform exposes this if you're not logged in)
}

// interface Referral {
//     company: string
//     contact: Person
//     internal?: Boolean
// }

// TODO: parse these from a Markdown file?
//  take that file as an an upload
// at least, *maybe*... eventually need to handle input
//  sanitization for that but I should theoretically
//  be doing that anyway... even if I could otherwise
//  just scaffold them from a list of inputs
//  given a set of default parameters
// but, properly sanitized, separating by newline
//  would be an easy way to setup scaffold a bunch of these
// the other fields *do* all start blank...
export interface InterviewQuestion {
  isRecon: boolean // indicates that this question is mine
  // (that name is temporary though)
  question: string
  answer: string // could include 'n/a' if not relevant
  // could be parsed during recon and not actually
  //  asked *during an interview*
  children?: InterviewQuestion[] // follow-up questions
}

export interface Interview {
  round: number
  category: string // 'phone screen', 'technical', etc
  notes: string[] // Markdown
  questions: InterviewQuestion[]
  interviewer: Person[]
}

export enum LifecycleStage {
  Queued = 'queued',
  Ignored = 'ignored',
  Expired = 'expired',
  Liked = 'liked',
  Stashed = 'stashed',
  Shortlisted = 'shortlisted',
  Unmatched = 'unmatched', 
  Applied = 'applied',
  Rejected = 'rejected',
  Declined = 'declined',
  Ghosted = 'ghosted',
  Interview = 'interview',
  Withdrawn = 'withdrawn',
  Offer = 'offer',
  Rescinded = 'rescinded',
  Hire = 'hire',
}

export interface ForumPost {
  source: string // enum for this?
  postDate: Date
  retrievalDate: Date
  content: string
  // jobs?: JobPost[] this can be filled later; I'm undecided on how
  //  best to link these
}

export interface JobPost {
  title: string
  company: string
  location?: string
  notes?: string[] // Markdown
  sources: JobSearchSource[]
  // prune all posts >90 days old and not at least swiped right
  //  (that date should be user-configurable)
  // entry *could* be manual, since this is kind of a CRM ofc --
  //  should maybe have something for that actually
  // duplicate stacking should be default only if associated company
  //  isn't a recruiting firm (else, those could actually be
  //  different jobs)
  hiringManager?: Person
  referral?: Person
  recruiter?: Person
  // may not be internal
  // I might want to set person as an ID reference though
  pay?: {
    per: string // time
    min?: number
    max?: number
    listedRange: string // fallback in case parsing fails
  } | string // fallback in general
  directApply?: boolean // for recruiting firms
  applyLink?: string
  applyEmail?: string // this is different from a contact
  // because it *could* just be a generic email
  lifecycle?: LifecycleStage // FIXME: = LifecycleStage.Saved
  summary?: string
  description?: string
  interviews?: {
    totalRounds: number
    details: Interview[]
  }
}

// one collection might all share a single source
type JobPostSourceOptional = JobPost & {
  sources?: JobSearchSource[]
}

export interface BulkJobPosts {
  jobs: JobPostSourceOptional[]
  source: SearchSource
}

enum Reviewer {
  Customer = 'customer',
  Employee = 'employee',
}

export interface CompanyReview {
  rating: number
  detail: string
  source: SearchSource // should job boards have enums?
  date: Date
  createdBy: Reviewer
}

export interface Company {
  name: string // assume public-facing name for now
  // dba?: string
  website: string
  // locations??
  recruitingFirm?: boolean
  jobs?: JobPost[] // id references?
  contacts?: Person[] // separate model for this?
  ownership?: string // enum for this?
  funding?: string // enum for this?
  // ignorePosts: boolean, // should this be a user setting instead?
  // user settings should also include cover letter overrides
  // from here...
  bio?: string
  size?: number
  industry?: string // (this is loose)
  employeeReviews?: CompanyReview[] // maybe also capture customer reviews
  // ...to here should maybe be prioritized by source,
  //  or level of detail, or something
  // (or, possibly grouped by source)
  // also (while 'bio' is a little more scoped) 'about' can mean
  //  a *lot* of things
  // see also: benefits, culture stuff, remote, etc
  // this is a later recon thing anyway, but *still*,
  //  parsing that might *also* be a job for an LLM
  // recentNews?, // {source, headline, date}
  //  define recent?
  // redFlags?: string[] // enum?
  // greenFlags?: string[] // enum?
  // outreach history?
}

// settings

// this is a single, global structure
// since the application is local-first, and built
//  for me, it's primarily single-user

export interface CoverLetter {
  name?: string
  text: string // should be Markdown
}

// TODO: type for levels?

// this has layers to cover cases like
//  hiring managers/reporting structures
//  that might be in a job description,
//  but are titles you'd otherwise filter
// aimed at scraping use, but I might want
//  to add levels of granularity to this later
//  both at upload and for generally more
//  configurable crawler behavior
export interface Blocklist {
  company?: string[] // for now
  title?: string[]
  description?: string[]
  global?: string[]
}

// *but,* one person might have multiple job
//  searches -- concurrently, or over time
export interface Campaign {
  name: string
  // these are used as search fields
  roles?: string[]
  skills?: string[]
  locations?: string[]
  salary?: {
    min: number,
    max?: number
  }
  coverLetters?: CoverLetter[]
  blocklist?: Blocklist
}

// global overrides
// for instance, job searches would have specific
//  title blocklists, while you might want to put
//  generic titles for various levels here
export interface Settings {
  campaigns: Campaign[]
  locations?: string[]
  coverLetters?: CoverLetter[]
  blocklist?: Blocklist
}