# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## [0.2.0] - 2020-08-11

### Changes
- Dropped support for non-spec fragment names.

### Fixed
- Issues with IE11 with UTF-8 RegExp.

## [0.1.3] - 2020-03-18

### Changed
- Changed compile target from ES6 to ES5.

## [0.1.2] - 2020-03-17

### Fixed
- The unicode special characters are not supported on each engine.
The capability to support it will be checked and enabled if possible.

## [0.1.1] - 2020-03-17

### Fixed
- Resolving nested fragments resulted in duplication for each level
- Incorrect fragment-name resolving

## [0.1.0] - 2020-03-14

### Added
- First release with a basic implementation of the fragment loading

[Unreleased]: https://github.com/deckdom/dynql/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/deckdom/dynql/releases/tag/v0.2.0
[0.1.3]: https://github.com/deckdom/dynql/releases/tag/v0.1.3
[0.1.2]: https://github.com/deckdom/dynql/releases/tag/v0.1.2
[0.1.1]: https://github.com/deckdom/dynql/releases/tag/v0.1.1
[0.1.0]: https://github.com/deckdom/dynql/releases/tag/v0.1.0
