# How to contribute

## Communication

- Bug Reports & Feature Requests: [GitHub Issues]
- Questions: [Discord]

All communication in these forums abides by our [Code of Conduct].

[GitHub Issues]: https://github.com/authzed/playground/issues
[Code of Conduct]: CODE-OF-CONDUCT.md
[Discord]: https://authzed.com/discord

## Creating issues

If any part of the project has a bug or documentation mistakes, please let us know by opening an issue.
All bugs and mistakes are considered very seriously, regardless of complexity.

Before creating an issue, please check that an issue reporting the same problem does not already exist.
To make the issue accurate and easy to understand, please try to create issues that are:

- Unique -- do not duplicate existing bug report.
  Duplicate bug reports will be closed.
- Specific -- include as much details as possible: which version, what environment, what configuration, etc.
- Reproducible -- include the steps to reproduce the problem.
  Some issues might be hard to reproduce, so please do your best to include the steps that might lead to the problem.
- Isolated -- try to isolate and reproduce the bug with minimum dependencies.
  It would significantly slow down the speed to fix a bug if too many dependencies are involved in a bug report.
  Debugging external systems that rely on this project is out of scope, but guidance or help using the project itself is fine.
- Scoped -- one bug per report.
  Do not follow up with another bug inside one report.

It may be worthwhile to read [Elika Etemad’s article on filing good bug reports][filing-good-bugs] before creating a bug report.

Maintainers might ask for further information to resolve an issue.

[filing-good-bugs]: http://fantasai.inkedblade.net/style/talks/filing-good-bugs/

## Finding issues

You can find issues by priority: [Urgent], [High], [Medium], [Low], [Maybe].
There are also [good first issues].

[Urgent]: https://github.com/authzed/playground/labels/priority%2F0%20urgent
[High]: https://github.com/authzed/playground/labels/priority%2F1%20high
[Medium]: https://github.com/authzed/playground/labels/priority%2F2%20medium
[Low]: https://github.com/authzed/playground/labels/priority%2F3%20low
[Maybe]: https://github.com/authzed/playground/labels/priority%2F4%20maybe
[good first issues]: https://github.com/authzed/playground/labels/hint%2Fgood%20first%20issue

## Contribution flow

This is a rough outline of what a contributor's workflow looks like:

- Create an issue
- Fork the project
- Create a [feature branch]
- Push changes to your branch
- Submit a pull request
- Respond to feedback from project maintainers
- Rebase to squash related and fixup commits
- Get LGTM from reviewer(s)
- Merge with a merge commit

Creating new issues is one of the best ways to contribute.
You have no obligation to offer a solution or code to fix an issue that you open.
If you do decide to try and contribute something, please submit an issue first so that a discussion can occur to avoid any wasted efforts.

[feature branch]: https://www.atlassian.com/git/tutorials/comparing-workflows/feature-branch-workflow

## Legal requirements

In order to protect the project, all contributors are required to sign our [Contributor License Agreement][cla] before their contribution is accepted.

The signing process has been automated by [CLA Assistant][cla-assistant] during the Pull Request review process and only requires responding with a comment acknowledging the agreement.

[cla]: https://github.com/authzed/cla/blob/main/v1/icla.md
[cla-assistant]: https://github.com/cla-assistant/cla-assistant

## Common tasks

We use [yarn](https://yarnpkg.com/) to run common tasks in the project.

### Testing

In order to build and test the project, a [modern version of node] and knowledge of  [React app architecture] are required.

[modern version of node]: https://nodejs.org/en/about/previous-releases
[React app architecture]: https://react.dev/

```sh
yarn run test
```

To run integration tests:

```sh
yarn run cy:run
```

### Linting

```sh
yarn run lint
```

### Adding dependencies

This project uses [yarn](https://yarnpkg.com/) for managing dependencies.

```sh
yarn add <package>
```
