Here's a lengthier overview of what I laid out in the README.

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
- a frontend loosely resembling Tinder for "swiping" through results (partially
  implemented; repo link in README)
- interview tracking
- tracking for multiple job searches
- a plugin system for new data sources

But you shouldn't assume the above is necessarily a roadmap, because this
_isn't_ a product.

There's also a base for the crawlers and a couple of examples. Your parsing
logic may vary, but the idea is that now the parsing logic is separated out from
the fetching logic, so you can setup a data source from an arbitrary source -- a
bare request handler like `curl`, other crawlers, a browser extension, etc --
and parse it server-side. I'm still not sure exactly how I want to handle
configuring data sources overall, but the goal is to enable a variety of
different ways of going about this.

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

First of all, the point of this is to _remove_ tedium, and I don't really want
the support burden of maintaining a this as a product. Just the integrations are
an arms race I really don't want to deal with. I've included some building
blocks, and a skeleton of an application you can play with, and hopefully modify
to suit target platforms of your choice. But I'm not really taking feature
requests in the immediate term. It's mostly going to evolve as I use it, as I'm
prioritizing things that enhance (or break) that usage and may sometimes also be
getting sidetracked on upstram PRs accordingly.

(I'm also being generic when I say "targets" because the _long_ long-term plan
is to automate other personal nonsense like apartment searching with this. The
whole process of scrolling through listings, filtering them down by overall
feasibility, and drafting a whole cover letter only to probably get ghosted is
_infuriatingly_ identical.)

Moreover, I'm using it as a testing ground for various tools I haven't used
before -- I'm still toying with some new options for data persistence, and as a
prerequisite to even getting that running I've also been taking a first crack at
TypeScript for modeling out its contents. (My use cases mostly prioritize
brevity, so using it for the whole codebase also explicitly isn't a goal here.)
So while I'm aiming to clean up the parts of this that I do make public, some
pieces of this I consider to be reasonably _good_, and other pieces of this are
experiments.

_But_, because the whole point here is to remove tedium, it _also_ isn't heavily
reliant on third-party libraries in order to run. The whole thing is built using
Deno, and aims at avoiding excessive use of outside dependences. So far, not
counting polyfills (`deno-dom`) and the Deno stdlib, it's been limited to:

- API routing (`oak`)
- Tooling for Deno KV (`kvdex`)
- Browser automation (`astral`)
- Markdown (`remark`/`rehype`)
- UI code written in React purely until I make real decisions about that
  - (...and even that leans heavily on hand-rolled CSS)

I don't expect it to _stay_ that way as I eventually flesh out the various
pieces of this -- it isn't an explicit goal, and I can already think of several
places where I'd hit walls if it were -- but my bias is to default to built-in
tooling wherever it makes sense to do so, and scale past that only as I _need_
outside libs. So what you _won't_ need is to run a heavy toolchain of
third-party dependencies in order to handle basic functionality.

I do see use cases for optionally linking an LLM up to it, but it's not an
immediate goal. Ideas I've toyed with on paper include parsing data from HN
posts and other unstructured text (like second passes on job descriptions),
tweaking cover letters, and extending the crawlers. But I haven't been able to
reliably get good enough outputs out of small enough models to justify this
(yet). One hard line -- while I'm occasionally consulting a small (~7B usually)
model with general reference questions, I'm _not_ using anything for code gen
here. Not necessarily a firm philosophical stance, necessarily, but it _would_
defeat the point of having something I built myself that I can show off a bit.

The crawling logic is generally prototyped in browsers, and _mostly_ designed to
work in them. I'm still not sure how much of this I want to break out into other
adventures yet, but until I get beyond occasional use of Violentmonkey, it's not
a hard constraint. (In fact, a few places are limited the other way around,
using to a more baseline set of HTML properties due to incomplete implemenations
in `deno-dom`.)
