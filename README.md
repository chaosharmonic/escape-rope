# Escape Rope

(For more detail on the below, see DESIGN.md)

## What? (Overview)

This is a loose collection of tooling I've been building as a side project to
automate my job search habits, built around data I've been gathering through
[an extended experiment in Web scraping](https://bhmt.dev/blog/scraping).

Now, it's an experiment in a _few_ different things. the database schema are a
first crack at using TypeScript. I'm taking Deno KV (and `kvdex`) for a spin for
data persistence. (And contributed `getOne` and `updateOne` to get this to
work!) I'm currently toying around with various options for a UI, and starting
to evaluate what other tools I might want to build around it, or how I might
integrate them.

There's a first draft of the UI
[here](https://github.com/chaosharmonic/escape-rope-ui). Note that I don't have
test data or other niceties that would actually make this demo-ready yet.

## Why? (Goals and non-goals)

Primarily, it's a tool I've been building for me -- as an experiment, a learning
exercise, and a tech demo to show off to anyone that it's aided me in connecting
with. Mostly, it's because I believe in building the thing you want to use.

In this case, the thing I want to use is an exit path -- something of a safety
mechanism, in the event that a workplace ever becomes detrimental to my
well-being. And also something of a way of pulling myself back up, in the event
that one ever throws me into a ditch. Or, say, threatens a "slow climb 🧗"
in public settings.

I _hope_ maybe someone else finds it helpful, but its core purpose is to make
my life easier. I'm not necessarily prioritizing things outside what I strictly
need for local use, so while I'm considering how I might eventually deploy this
for demo purposes, I'm not necessarily putting heavy priority on things like
user config or auth in the short term. I have a loose "roadmap" of other parts
of this process that I want to automate, but I'm working on it in stages and
trying not to put more effort into building it than I am into using it.

That said, part of removing tedium here is to keep the project as self-contained
as possible -- using what comes out of the box first, and then leaning on
third-party libraries only where I _need_ them. It's not _entirely_ free of them
-- and that's not an explicit goal -- but what _is_ an explicit goal is to keep
the toolchain lean enough that I don't have to have opinions about every
individual piece of it, and that's best served by using the batteries that are
included where that's reasonably an option.

## How? (Running this project)

(Note: this section should get more organized as I actually flesh out the
_application_ around the data)

### Prerequisites

- [Deno](https://deno.com/) 1.46 or above

For now, that's it. Dependencies are pulled in using import maps and HTTP, so
you don't need to install any of them up front.

### Usage

To run the API server: `deno run serve`

The core scraping workflow is, similiarly, built around Deno's standard task
runner -- currently I'm leveraging this for gathering new listings, but I'm
in the process of redesigning the crawlers into something I more extensible.

Tasks are defined in `deno.jsonc` and run using `deno run {name}`

I've left the one to get "who is hiring" threads from a Hacker News API intact,
for example's sake. But it's not going to give you structured responses, and is
really just there for the sake of having _a_ task to illustrate this with. (You
might find the raw data useful to mine in other ways, but while I periodically
toy with using a [Llamafile](https://github.com/mozilla-ocho/llamafile), to get
structure out of them, it's not an immediate priority.)
