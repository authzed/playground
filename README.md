<a href="https://authzed.com#gh-dark-mode-only" target="_blank">
    <img width="300" src="https://github.com/authzed/spicedb/assets/343539/82234426-468b-4297-8b5c-f06a44fe2278" alt="spicedb logo">
</a>
<a href="https://authzed.com#gh-light-mode-only" target="_blank">
    <img width="300" src="https://github.com/authzed/spicedb/assets/343539/312ff046-7076-4c30-afd4-2e3d86c06f51" alt="spicedb Logo">
</a>

# Playground

The SpiceDB Playground is an interactive app for building a [SpiceDB] schema, interacting with test relationships, and quickly iterating with test assertions.

Whether you're just getting started learning SpiceDB concepts or need to develop a new permissions system schema for your application, the SpiceDB playground has functionality to help.

SpiceDB Playground features include:

- Rich text editor with syntax highlighting and tooltips
- Visual relationship editor with support for defining caveat context data
- Developer system that detects and presents schema and data errors
- Real-time check requests against a full SpiceDB instance running client side via WASM
- Fully functional [zed](https://github.com/authzed/zed) CLI instance running client side via WASM
- Schema and relationship graph visualization
- Import and export schema and workspace data as a YAML file

## What is SpiceDB?

SpiceDB is a graph database purpose-built for storing and evaluating access control data.

As of 2021, broken access control became the #1 threat to the web. With SpiceDB, developers finally have the solution to stopping this threat the same way as the hyperscalers.

Learn more about [SpiceDB]

[SpiceDB]: https://authzed.com/spicedb

## Getting Started

## Deploying

### Docker

Run the latest Docker container

```command
docker run -it -p 3000:3000 ghcr.io/authzed/spicedb-playground:latest
```

Connect to the running container.

```command
http://<container>:3000
```

### Vercel

Deploy an instance hosted on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fauthzed%2Fplayground&project-name=spicedb-playground&repository-name=spicedb-playground)

or using the Vercel CLI

```command
vercel build
vercel deploy --prebuilt
```

> ℹ️ Git Large File Storage (LFS) must be enabled in your Vercel project settings.

### NodeJS

The `build` directory in the project root directory after running `yarn build` will contain an optimized production React application that can be served using your preferred NodeJS hosting method.

> ℹ️ Node v18.x is required.

For example:

```command
yarn global install serve
cd build
serve
```

## Installing dependencies

Setup git submodules: `git submodule update --init --recursive`

Run `yarn install` in the _root_ project directory.

## Running for development

```
yarn run dev
```

## Updating wasm dependencies

The project contains prebuilt WASM files for versions of both SpiceDB and zed. To update the versions, edit the [wasm-config.json] file with the desired tag/commit hash and then run from the project root:

`yarn run update:spicedb`

`yarn run update:zed`

> ℹ️ [jq] is required and must be installed.

[wasm-config.json]: https://github.com/authzed/playground/blob/main/spicedb-common/wasm-config.json
[jq]: https://jqlang.github.io/jq/

## Updating the generated protobuf code

This project uses generated gRPC code to talk to the download API. To regenerate:

1. Install [buf](https://buf.build/docs/installation/) if you haven't already
1. Run `buf generate`
1. Commit the changes

## Building the Docker Container

```
docker build . -t tag-for-playground-image
```

Build args can be specified for the build-time environment variables:

```
docker build --build-arg VITE_AUTHZED_DEVELOPER_GATEWAY_ENDPOINT=https://my.developer.endpoint . -t tag-for-playground-image
```

## Developing your own schema

You can try both [SpiceDB](https://github.com/authzed/spicedb) and [zed](https://github.com/authzed/zed) entirely in your browser on a SpiceDB Playground deployment thanks to the power of [WebAssembly](https://authzed.com/blog/some-assembly-required).

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
Join our [Community Discord](https://authzed.com/discord) to ask questions and meet other users.

[feel welcomed]: CODE-OF-CONDUCT.md
