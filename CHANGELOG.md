# v1.2.0 (Fri Mar 17 2023)

#### 🚀 Enhancement

- setup auto-release + fix types [#7](https://github.com/jota-one/http-client/pull/7) (joel@jota.one [@jorinho](https://github.com/jorinho))

#### 🐛 Bug Fix

- feature/axios-config [#6](https://github.com/jota-one/http-client/pull/6) ([@jorinho](https://github.com/jorinho))
- remove lodash [#5](https://github.com/jota-one/http-client/pull/5) ([@jorinho](https://github.com/jorinho))
- Merge pull request #4 [#4](https://github.com/jota-one/http-client/pull/4) ([@jorinho](https://github.com/jorinho))
- added some more unit tests + small fixes [#4](https://github.com/jota-one/http-client/pull/4) ([@jorinho](https://github.com/jorinho))
- unit tests with vitest [#3](https://github.com/jota-one/http-client/pull/3) ([@jorinho](https://github.com/jorinho))
- pass endpoint as object instad of laoding an ESmodule [#2](https://github.com/jota-one/http-client/pull/2) ([@FlorinSenoner](https://github.com/FlorinSenoner))
- improved caching strategy [#1](https://github.com/jota-one/http-client/pull/1) ([@jorinho](https://github.com/jorinho))

#### ⚠️ Pushed to `main`

- updated version in package.json (joel@jota.one)
- fix delete function signature type (joel@jota.one)
- feat(ts): export all types + add missin property in hateoasExtendedConfig ([@tadaii](https://github.com/tadaii))
- added a new download method in extended object ([@jorinho](https://github.com/jorinho))
- use resource (a resource is an object containing a links or index or _links property) instead of index in openBinary and downloadBinary for the hateoas client ([@jorinho](https://github.com/jorinho))
- update type def ([@jorinho](https://github.com/jorinho))
- make axiosConfigCb async ([@jorinho](https://github.com/jorinho))
- add missing fix to get function ([@jorinho](https://github.com/jorinho))
- update set and get functions: fix some edge cases issues ([@jorinho](https://github.com/jorinho))
- version bump ([@jorinho](https://github.com/jorinho))
- Merge branch 'develop' into main ([@jorinho](https://github.com/jorinho))
- Add axiosConfig to loadIndex ([@tadaii](https://github.com/tadaii))
- unify hateoas links format for chained requests ([@jorinho](https://github.com/jorinho))
- updated dependencies ([@jorinho](https://github.com/jorinho))
- updated dependencies + allow several and custom hateoas links container properties ([@jorinho](https://github.com/jorinho))
- fix types definition + version bump ([@jorinho](https://github.com/jorinho))
- bump version ([@jorinho](https://github.com/jorinho))
- added a 'resolveUri' function to just resolve an hateoas link without calling it ([@jorinho](https://github.com/jorinho))
- added a 'rootIndexLinksPath' configuration to find links in an index that doesn't expose them directly in the response root (joel@oepa.ch)
- improved typescript definition + upgrade axios to latest version (joel@oepa.ch)
- - securized a bit more the error handling (joel@oepa.ch)
- - small fix for isCancel method (joel@oepa.ch)
- ensure lodash-es better treeshaking (joel@oepa.ch)
- version bump (joel@oepa.ch)
- fix wrong variable names (joel@oepa.ch)
- removed promise finally shim (joel@oepa.ch)
- rework lib extension system (joel@oepa.ch)
- refactoring + remove unused features (joel@oepa.ch)
- bugfix and stabilization (joel@oepa.ch)
- bump version (joel@oepa.ch)
- fix small problems (joel@oepa.ch)
- Deep refactoring + promise caching, request cancelling, mixins and deeper hateoas integration (joel@oepa.ch)
- fix stupid issue (joel@oepa.ch)
- initial commit (joel@oepa.ch)

#### Authors: 6

- Florin Senoner ([@FlorinSenoner](https://github.com/FlorinSenoner))
- Joel Poulin (joel@jota.one)
- Joël Poulin (joel@oepa.ch)
- Joël Poulin (joel@oepa.ch)
- Jorinho ([@jorinho](https://github.com/jorinho))
- Tadai ([@tadaii](https://github.com/tadaii))
