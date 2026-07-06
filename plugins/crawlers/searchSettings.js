// TODO: like it says,
// these should eventually be tied to settings

let location = Deno.env.get('SEARCH_LOCATION')
const country = Deno.env.get('SEARCH_COUNTRY')
|| 'United States'

const remote = Boolean(!location)
|| location?.toLowerCase().includes('remote')

if (remote) location = country

Deno.env.get('SEARCH_PAY_PER') || 'year'

// TODO: move this later
export const defaultSearchParams = {
  minSalary: Deno.env.get('SEARCH_MIN_SALARY'),
  maxSalary: Deno.env.get('SEARCH_MAX_SALARY'),
  query: Deno.env.get('SEARCH_TERMS'),
  location,
  remote,
  maxAge: Deno.env.get('SEARCH_MAX_AGE'),
  autoUpload: !Boolean(Deno.env.get('DISABLE_CRAWLER_AUTO_UPLOAD'))
}