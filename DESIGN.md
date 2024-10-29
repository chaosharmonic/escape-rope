sHere's a lengthier overview of what I laid out in the README.

## What? (Overview)

This is a loose collection of tooling I've been working on as a side project to
automate my job search habits. Primarily, this has involved building crawlers to
grab results from job boards and output the results as JSON, via
[an extended experiment in Web scraping](https://bhmt.dev/blog/scraping).

But the longer-term goal is I _guess_ closer to a minimalist CRM. Ultimately, I
want to also be able to do recon on _companies_ this way, and use the data to
automate more of this process. Varying ideas I've been throwing around include:

- tracking interactions with a company over time, referrals, etc
  - automating basic recon on companies that I'm potentially interested in
- cover letter generation
- a frontend loosely resembling Tinder for "swiping" through results
  (partially implemented; repo link in README)
- interview tracking
- tracking for multiple job searches
- a plugin system for new data sourcs

But you shouldn't assume the above is necessarily a roadmap, because this
_isn't_ a product.

## Why? (Goals and non-goals)

This is a tool for me first, and a tool for others second. I'm sharing as I go,
but my core use case is speed up/scale up my own workflow, and while I have a
backlog of "features" I want to add this is something I'm more doing as I have
bandwidth to spare and not really really trying to pour all my time into.

Primarily, it's a tool I've been building for me -- as an experiment, a learning
exercise, and a tech demo to show off to anyone that it's aided me in connecting
with. It's still not the _most_ efficient way of doing this, necessarily -- I
know there's a scattering of platforms with more modern ways of streamlining
this process than what's offered by traditional job boards -- but I believe that
there's value in
[building the things you want to use](https://bhmt.dev/blog/diy).

As for why it's not more than that:

- First of all, the point of this is to _remove_ tedium, and I don't really want
  the support burden of maintaining a this as a product. Just the integrations
  are an arms race I really don't want to deal with. At one point that also
  applied to the scraping code, but now I'm redesigining parts of it to work
  with the other parts of this project. In the meantime some examples are in
  the `scripts/` folder, but you'll want to modify them to suit your own targets.
  (I'm also being generic when I say "targets" because the _long_ long-term plan
  is to automate other personal nonsense like apartment searching with this. The
  whole process of scrolling through listings, filtering them down by overall
  feasibility, and drafting a whole cover letter only to probably get ghosted is
  _infuriatingly_ identical.)
- I'm also not sure I'll ever specifically care about deploying a live version
  of this, because it's mostly annoyance- and ego-driven development. My use
  cases are to save myself a bunch of time and have something interesting that I
  can then link back to in all of my cover letters. My primary use case is to
  run it locally, so while I might _build_ a Web interface for it later, and I
  do have a loose backlog of personal feature requests (see above), that list
  doesn't necessarily prioritize things I'd need in order to deploy it in public
  (auth, for instance). It's mostly going to evolve as I use it, and you
  shouldn't assume there's _planning_ or _direction_ so much as just a loose
  barometer of what would make it more immediately useful to me in the moment.
- Moreover, I'm using it as a testing ground for various tools I haven't used
  before -- I'm still toying with some new options for data persistence, and as
  a prerequisite to even getting that running I've also been taking a first
  crack at TypeScript for modeling out its contents. (My use cases mostly
  prioritize brevity, so using it for the whole codebase also explicitly isn't a
  goal here.) So while I'm aiming to clean up the parts of this that I do make
  public, pieces of this I consider to be reasonably _good_, and pieces of this
  are experiments.

_But_, because the whole point here is to remove tedium, it _also_ isn't heavily
reliant on third-party libraries in order to run. The whole thing is built using
Deno, and aims at avoiding excessive use of outside dependences. So far, not 
counting the Deno stdlib, it's been limited to:

- API routing (`oak`)
- Tooling for Deno KV (`kvdex`)
- Browser automation (`astral`)
- Markdown (`remark`/`rehype`)
- UI code written in React purely until I make real decisions about that

I don't expect it to _stay_ that way as I eventually flesh out the various
pieces of this -- it isn't an explicit goal, and I can already think of several
places where I'd hit walls if it were -- but my bias is to default to built-in
tooling wherever it makes sense to do so, and scale past that only as I _need_
outside libs. So what you _won't_ need is to run a heavy toolchain of
third-party dependencies in order to handle basic functionality.
