# SpiceDB Playground

The SpiceDB Playground is an interactive app for building a SpiceDB schema, interacting with test relationships, and quickly iterating with test assertions.

Whether you're just getting started learning SpiceDB concepts or need to develop a new permissions system schema for your application, the SpiceDB playground has functionality to help.

SpiceDB Playground features include:

- Rich text editor with syntax highlighting and tooltips
- Visual relationship editor with support for defining caveat context data
- Developer system that detects and presents schema and data errors
- Real-time check requests against a full SpiceDB instance running client side via WASM
- Fully functional zed CLI instance running client side via WASM
- Schema and relationship graph visualization
- Import and export schema and workspace data as a YAML file

## What is SpiceDB?

SpiceDB is a graph database purpose-built for storing and evaluating access control data.

As of 2021, broken access control became the #1 threat to the web. With SpiceDB, developers finally have the solution to stopping this threat the same way as the hyperscalers.

Learn more about [SpiceDB &#8599;](https://authzed.com/spicedb)

## Getting Started

## Deploying

### Docker

Run the latest Docker container

```command
docker run -it authzed/spicedb-playground:latest
```

### Vercel

Deploy an instance hosted on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fauthzed%2Fplayground&project-name=spicedb-playground&repository-name=spicedb-playground)

or using the Vercel CLI

```command
vercel build
vercel deploy --prebuilt
```

### NodeJS

The `build` directory in the project root directory after running `yarn build` will contain an optimized production React application that can be served using your preferred NodeJS hosting method.

For example:

```command
yarn global install serve
cd build
serve
```

## Installing dependencies

Setup git submodules: `git submodule update --init --recursive`

Run `yarn install` in the _root_ project directory.

## Updating wasm dependencies

The project contains prebuilt WASM files for versions of both SpiceDB and zed. To update the versions, edit the following files with the appropriate tag/commit hash.

From the project root, run:

`./scripts/update-spicedb.sh`

`./scripts/update-zed.sh`

## Developing your own schema

You can try both SpiceDB and zed entirely in your browser on a SpiceDB Playground deployment thanks to the power of WebAssembly.

If you don't want to start with the examples loadable from a Playground, you can follow a guide for [developing a schema] or review the the schema language [design documentation].

Watch the SpiceDB primer video to get started with schema development:

<a href="https://www.youtube.com/watch?v=AoK0LrkGFDY" target="_blank"><img width="600" alt="SpiceDB Primer YouTube Thumbnail" src="https://github.com/authzed/spicedb/assets/343539/7784dfa2-b330-4c5e-b32a-090759e48392"></a>

[developing a schema]: https://authzed.com/docs/spicedb/modeling/developing-a-schema
[design documentation]: https://authzed.com/docs/spicedb/concepts/schema

## Contribute

[CONTRIBUTING.md] documents communication, contribution flow, legal requirements, and common tasks when contributing to the project.

You can find issues by priority: [Urgent], [High], [Medium], [Low], [Maybe].
There are also [good first issues].

Our [documentation website] is also open source if you'd like to clarify anything you find confusing.

[CONTRIBUTING.md]: CONTRIBUTING.md
[Urgent]: https://github.com/authzed/playground/labels/priority%2F0%20urgent
[High]: https://github.com/authzed/playground/labels/priority%2F1%20high
[Medium]: https://github.com/authzed/playground/labels/priority%2F2%20medium
[Low]: https://github.com/authzed/playground/labels/priority%2F3%20low
[Maybe]: https://github.com/authzed/playground/labels/priority%2F4%20maybe
[good first issues]: https://github.com/authzed/playground/labels/hint%2Fgood%20first%20issue
[documentation website]: https://github.com/authzed/docs

## Joining the SpiceDB Community

SpiceDB is a community project where everyone is invited to participate and [feel welcomed].
While the project has a technical goal, participation is not restricted to those with code contributions.

[feel welcomed]: CODE-OF-CONDUCT.md
