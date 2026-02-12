# [1.3.0](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/compare/v1.2.0...v1.3.0) (2026-02-12)


### Features

* multi-theme system with 7 themes ([8a36cd6](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/8a36cd61622e7941bcfc9216aa8dd11ebe814031))

# [1.2.0](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/compare/v1.1.0...v1.2.0) (2026-02-04)


### Bug Fixes

* add missing testMetrics to SummarySection test helper ([7520ea9](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/7520ea977cf3f0413f5a9ed9664754372f6e6ec9))
* **beads:** update external_ref paths to docs/prds/ ([a964d0d](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/a964d0dd36ed2c23ac91f9b9f1d752e74012e6c0))
* **ci:** add MR pipeline rules ([c99f237](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/c99f2378d837eae5892de462bce6a450d7f0d4bb))
* **ci:** configure release job with PAT for tag pushing ([c1afa38](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/c1afa38549a64882ec916c77e79c7eaeb083dc40))
* **ci:** switch to GIT_ASKPASS for release auth ([0c7d457](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/0c7d45770eb3c113f01ce463aa3fd4da1f6a9cfd))
* **ci:** use credential store for git auth ([7fca566](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/7fca5665e2c5aa35885282542277fc6e1eb011de))
* **ci:** use SSH deploy key for semantic-release ([3ffe382](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/3ffe38248ea5151d3d59133aac9abba0db2a04f8))
* remove merge conflict markers from package.json ([990e87c](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/990e87cd79058314ff4710f4fb72cd1acc846523))
* remove unused variables causing lint failures ([4b891b2](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/4b891b28dd52927e19abf15443ea042fb230aab8))
* **types:** correct TypeScript mock types in CompactCardDesign.test.tsx ([7a8d953](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/7a8d953a58f3b6a5f3fc4f999300834b4af0e012))


### Features

* add API request queuing and throttling utility ([d7e402f](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/d7e402ff04f2c6c1a6639f0d5e7c86f58757b389))
* add mock GitLab API server and populated UI showcase tests ([9f52b70](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/9f52b7076351c9185f90be57d65654c7a1a68b80))
* add React ErrorBoundary component wrapping App ([99f804f](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/99f804f74c907c9a46a60a1572df6c92a4229dcc))
* **auto-refresh:** add STORAGE_KEYS and constants for auto-refresh ([ab839ec](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/ab839ec2ce5c66fcfbc342720f3153785e2e2d79))
* **auto-refresh:** create dataAge utility with getDataAge, formatRelativeTime, formatAbsoluteTime ([b98af22](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/b98af221ca78fe27daff1923cb87d6dfca684118))
* **auto-refresh:** create RefreshStatusBar component with data age, loading indicator, interval selector ([fb74a33](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/fb74a3379855b6356be652a2e5cbab764b425283))
* **auto-refresh:** create StaleDataBanner component with refresh and enable auto-refresh actions ([591f1fb](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/591f1fbf85115318a414f0831e7a4096c9f0ca47))
* **auto-refresh:** create useAutoRefresh custom hook with interval, loading guard, pause/resume ([9533791](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/953379148232a0490ffacfbcf013fde437558487))
* **auto-refresh:** dark mode styling for RefreshStatusBar and StaleDataBanner ([f610b96](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/f610b960c6fae80a25fed37be53a2a7e8f32ba64))
* **auto-refresh:** integrate auto-refresh hook and components into App.tsx ([224f220](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/224f2209648d069df2730ce3c33b22ed66099099))
* **auto-refresh:** rate limit detection and backoff in loadDashboard error handling ([1a92841](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/1a9284101d106a348b7c6cde8c331f73d04633e0))
* **comparison:** add comparison action bar and selection props to Dashboard ([b9518c9](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/b9518c97f554ef558a6c6c996303a054bbdc331e))
* **comparison:** add comparison state and handlers to App.tsx ([ddd3717](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/ddd37176735f0c55f31237a1b76a488d5116459b))
* **comparison:** add COMPARISON_COLOURS palettes to constants.ts ([3648b52](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/3648b527aae10b883aba5e34bb43eb0b1047601a))
* **comparison:** add selection checkboxes to CardView ([3da67cd](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/3da67cd8aff2f0301ea439fe2f7eb53f05c9a0c0))
* **comparison:** add selection checkboxes to TableView ([8f136af](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/8f136afe57c06949c420eb018382a52bec1342cf))
* **comparison:** create ComparisonCharts component with 4 chart panels ([d6ad1ad](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/d6ad1add6f567b1d985c533ef4a44282feec09f6))
* **comparison:** create ComparisonDeployments component with env matrix ([fe6bc11](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/fe6bc1165a3a1b6133baa863d4113bcc1b6f2f2e))
* **comparison:** create ComparisonHeader component with colour swatches and back button ([2398956](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/239895686b2a782886cbb35d8b9fe68f6b23fa63))
* **comparison:** create ComparisonTable component with best/worst highlighting ([a4a70a6](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/a4a70a6d4f43f4711dd03651ac84dd0f68d5cdf3))
* **comparison:** create comparisonUtils.ts with date alignment and gap filling ([999470d](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/999470d1b41fbf01d32f3035bc925a335841cb76))
* **comparison:** create ComparisonView container with CSS styles ([f81195f](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/f81195f96fbd38cadcb676254029dfa2a1fb1fbe))
* **comparison:** dark mode styling and responsive layout for comparison components ([9220844](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/9220844e206b09086a9a299ffb65f6bb627891c5))
* **comparison:** wire ComparisonView into App.tsx with full routing ([5a9bbbe](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/5a9bbbe9b14f77f0a06cebdf45084907f9022c80))
* create reusable LoadingSkeleton component for consistent loading states ([36a1494](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/36a149469e7a5bee78d002c84930deca525919d4))
* **export:** add environment CSV export button to EnvironmentMatrixView ([f76314b](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/f76314bc24bc97dd3b8d0d79982a341ff6be01b3))
* **export:** add PdfExportOptions type, ChartRefMap, EXPORT_OPTIONS storage key, and jspdf dependencies ([be3b85d](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/be3b85d48cc66cbda0208e5afe2725353669c28a))
* **export:** create captureChartImages utility for Chart.js canvas export ([0fec5f0](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/0fec5f07f640c56cf954177d02482962181e8e7e))
* **export:** create ExportButton and ExportOptionsDialog components with dark mode CSS ([3b441fe](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/3b441fe5a7550a921f292ddc6edff5ad96031f22))
* **export:** create exportCsv utility with CSV generation and download ([b77b17e](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/b77b17ee94047923a9132efb62cafc6c7edbfbad))
* **export:** create exportPdf utility with lazy-loaded jspdf and full report generation ([b308832](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/b3088327ea38ac395b1294f1dffcf8fd3a08c351))
* **export:** dark mode styling already covered in component CSS, PDF always light mode ([8179120](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/8179120d06a7a2446b75dc9b33b18e0c3a7878c2))
* **export:** expose Chart.js canvas refs from TrendChart and MetricsPanel for PDF capture ([866ba4b](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/866ba4b6c6900c6e1b947b0f190d5d24f9b83ef5))
* **export:** integrate ExportButton into App.tsx header with chart ref plumbing ([2ec7eff](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/2ec7effd0af71f5ae1108eb144502cbac2b1c28f))
* **export:** verify lazy loading - jspdf chunks split correctly in build ([ef121f3](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/ef121f3e8e2c5bdd3b88b94a35dfafbf75fc623e))
* **failure-diagnosis:** add failure diagnosis types to types/index.ts ([671085e](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/671085e369f1ff969c873deb9c20d7c2a168ebf1))
* **failure-diagnosis:** add getJobTrace to GitLabApiService ([b10febe](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/b10febec5aa75a5ae7f360ff2b747c78454934be))
* **failure-diagnosis:** create FailureCategoryBadge component ([93e341c](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/93e341c8ad372e683af9431385b139825fed8deb))
* **failure-diagnosis:** create failureDiagnosis.ts with pattern matching and log highlighting ([85b85dd](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/85b85dde7cc67cf02451c007dd85e512282ea078))
* **failure-diagnosis:** create FailureFrequencyIndicator component ([a80723c](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/a80723cc9400f395ae713d21df557d419ae8c09f))
* **failure-diagnosis:** create FailureSummaryPanel component ([47c8d85](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/47c8d8543cc642a9b811eaf280e83693de2c60f4))
* **failure-diagnosis:** create JobLogViewer component with highlighting and search ([308ab1a](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/308ab1abf893a71de9726994fb3a134d86bd1742))
* **failure-diagnosis:** dark mode styling and log viewer enhancements ([1bc1396](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/1bc1396189dd0bfa835171d1ea445bf4ed5466ee))
* **failure-diagnosis:** enhance ProjectDetails with failure badges, frequency, and log viewer ([ee0d8bf](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/ee0d8bf25a5d6aba62299596d12078c3ae7b2194))
* **failure-diagnosis:** implement calculateFailureFrequency ([a5acb1c](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/a5acb1c11b803c2c0c1040ee88a274450f34f129))
* **failure-diagnosis:** integrate FailureSummaryPanel into SummarySection ([0109deb](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/0109deb926ac0a51acf19eef9d8630c3256088df))
* **health-score:** add HEALTH_SORT_ORDER to STORAGE_KEYS ([898b0bf](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/898b0bfa06683792972e77c257ec5f598ab986c6))
* **health-score:** create HealthBadge component with CSS styling ([2a720d6](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/2a720d60d4a6aad08d7cbda1e7a7c2d38e2faa82))
* **health-score:** create HealthBreakdown component with signal bars ([b39c50c](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/b39c50c7cbcdf31661e5d5c3c0af02bc24f8fe25))
* **health-score:** create healthScore.ts with types, constants, and all scoring functions ([cc96ce0](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/cc96ce035d9b73e2ccd4dfa8e271577e2428e3f1))
* **health-score:** create PortfolioHealthChart with doughnut distribution ([4eec48f](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/4eec48f2f92975ba7cbb0facd3dc36fd589ff89a))
* **health-score:** dark mode and responsive layout for health components ([bdd667f](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/bdd667f3e0a2700f26cb8e7839945ec7caed8efc))
* **health-score:** integrate HealthBadge into CardView with breakdown toggle ([085e58f](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/085e58f96a1d8ec30a242c84ed7d6cc94628b1a1))
* **health-score:** integrate HealthBadge into TableView with sort-by-health column ([4bdc180](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/4bdc180fbd61c1698a3ad8c077c77c0a2783b241))
* **health-score:** integrate PortfolioHealthChart into SummarySection ([0ca2bae](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/0ca2baeed62506d7ab3558488c3e27c7fcfb7a4f))
* **mr-board:** add getAllOpenMergeRequests to DashboardDataService ([b9df9c1](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/b9df9c1740d34b18629db706bb77d8743e593b18))
* **mr-board:** add MR board STORAGE_KEYS ([3f1ef02](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/3f1ef027d90b2970a8b4f23912556e0734fa377e))
* **mr-board:** add MR_BOARD to ViewType enum and MR board types ([3165231](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/31652311c6b053d5ff24d2d55f6e1b634b8a5d0a))
* **mr-board:** create MRBoardColumn component ([227d955](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/227d9552fe4dfbffbaf5765219da80e9e1daec3b))
* **mr-board:** create MRBoardFilters component ([1c70718](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/1c7071861fc51efdf65c020f2d347e43b66c9f86))
* **mr-board:** create mrBoardUtils with grouping, filtering, sorting ([616949a](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/616949a78815bf42a21a76a7c1fc45e3f7bb7313))
* **mr-board:** create MRBoardView container component ([2cdc63e](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/2cdc63e1e130222c617c485b3ad641194acb4762))
* **mr-board:** create MRCard component with pipeline status styling ([d65ffcb](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/d65ffcbd3edcd1180b3c695762aca0018f14b9c0))
* **mr-board:** create MRCardDetails component ([a4a923e](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/a4a923e04a87944def7f2868e3eed278aa8dfd2d))
* **mr-board:** dark mode styling and responsive layout polish ([b4cf055](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/b4cf0559d739f417c2220208437c66545250836e))
* **mr-board:** wire MRBoardView into App.tsx with view toggle ([f07a657](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/f07a657714aa4e0cd02066945d4c3576e9f159b6))
* **notifications:** add dark mode refinements and verify feature detection fallback ([e40b3dc](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/e40b3dcb71814c59af20d741496f65808ca7bd93))
* **notifications:** add notification types and STORAGE_KEYS to types/index.ts ([0a69218](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/0a69218ed9592ead086d5204ab911405e2fba3b9))
* **notifications:** create NotificationBell component with dropdown history ([ac28c7b](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/ac28c7b9ef8dbf7d0b6fb22a8b9de4826db7183a))
* **notifications:** create notificationEngine with rule evaluation and browser notifications ([6c21586](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/6c215867c5335c9c5d58f5364344ec272506c2ef))
* **notifications:** create NotificationRuleForm component with type/scope/threshold fields ([b72f969](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/b72f9699089f6d098640bee8a671f4dfc1f4fe7c))
* **notifications:** create NotificationSettings component with permission handling and rule CRUD ([4941417](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/49414173c139f48b251bdf3e1f6ece2c7a2182df))
* **notifications:** create notificationStorage with rules CRUD, history, enable/mute ([c62e265](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/c62e26507988959d8f0033c003524605649d365c))
* **notifications:** integrate notification state, evaluation, bell and settings into App.tsx ([8c7ecc4](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/8c7ecc4b1f9b8ca2d476a10082a63f4c42c76f25))
* **saved-configs:** add SavedConfigEntry/ExportedConfig types and STORAGE_KEYS ([76004f6](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/76004f6e8a0e5c1e27f95a0207537830f3307b9b))
* **saved-configs:** create ConfigManager component with rename, delete, export, import ([3ad7a87](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/3ad7a877d81d41dd73fd6d4782fdf9847fe94342))
* **saved-configs:** create ConfigSelector component with dropdown and action buttons ([1b40147](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/1b401472ef387632c060a8e6816b1de96dc8a642))
* **saved-configs:** create configStorage.ts with CRUD operations ([6c5fdb6](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/6c5fdb67ef4c8b628a9fa11cda701228ddd24a79))
* **saved-configs:** create SaveConfigDialog component with name input and validation ([8e32c02](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/8e32c02aae718eac77c5c062714624de39a26ba8))
* **saved-configs:** dark mode styling and confirmation dialogs polish ([4b83ae5](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/4b83ae5664ea94a84b7b2c586edf1f91382a151a))
* **saved-configs:** implement exportConfig and importConfig with validation ([77220cb](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/77220cbdf4a6513892c047f4d560ff40c1016b2b))
* **saved-configs:** implement hasUnsavedChanges deep comparison utility ([fc4d9f6](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/fc4d9f60dbf11d92228a2d195bb82b5acb6b6dc8))
* **saved-configs:** integrate ConfigSelector into ControlPanel and wire App.tsx handlers ([233fad7](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/233fad70a780773cb18f7c241baea7718489078a))
* **shortcuts:** add keyboard selection highlight to CardView and TableView with scroll-into-view ([b018e7d](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/b018e7dd7b0f3735d0766ecc22b4ad6472b7344a))
* **shortcuts:** add keyboard state, shortcut handlers, and overlay wiring to App.tsx ([1a7a5b8](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/1a7a5b808780a904ee5b80efce6c126ffb320974))
* **shortcuts:** add search input id, shortcuts hint button, and aria-keyshortcuts attributes ([ae07495](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/ae074957262292e3a466f8850190a4365912bd80))
* **shortcuts:** add ShortcutInfo interface and SHORTCUT_DEFINITIONS array ([be4843e](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/be4843e4c686cc425905422c36349bd2a340c624))
* **shortcuts:** create ShortcutsOverlay component with grouped shortcuts, kbd styling, and CSS ([1a89a3a](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/1a89a3a36300a4fb6d7502277ea61a18ae501221))
* **shortcuts:** create useKeyboardShortcuts custom hook with input guards and stable ref ([36f1b97](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/36f1b976fe66803f9251d4f42bf2a2cfe8345176))
* **shortcuts:** dark mode styling and accessibility improvements ([67da112](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/67da112a80db43781382aedb2b3a657a6fd11183))
* **shortcuts:** wire all shortcuts into App.tsx with aria-keyshortcuts on view buttons ([f159cd5](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/f159cd5d804384b19234ac4a7a5f646dcbdd462a))
* **timeline:** add DeploymentHistoryEntry, TimelineFilters types and TIMELINE_FILTERS storage key ([13512fb](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/13512fb43fb34936e015697371628d35ee7539a7))
* **timeline:** add getProjectDeploymentHistory and detectRollbacks to DashboardDataService ([518c3f8](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/518c3f84ac43c522c6ec731bfba88c9bee54c5b5))
* **timeline:** create DeploymentTimeline container with fetch, rollback detection, filters, pagination ([f36a5f2](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/f36a5f2490dcf6f1f04c4fc472758dbf4da39931))
* **timeline:** create TimelineDay component with date separator and entry list ([8030574](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/8030574ccfd86f7266b0e7d8939f0f55a11c6ce0))
* **timeline:** create TimelineEntry component with status dots, env badges, rollback styling ([dad9458](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/dad94581ee5ec169ce438562e21d1432c5443f2b))
* **timeline:** create TimelineFilters component with project, env, status, date range filters ([51251d7](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/51251d73bb89edc63cdfd109a042de12e58f3e0d))
* **timeline:** create timelineUtils.ts with groupByDate, getDateLabel, filterTimeline ([ba177d4](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/ba177d4601c9f86e385232d29ba6da77f3b25b9f))
* **timeline:** create versionCompare.ts with parseVersion and compareVersions ([a1296eb](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/a1296eb6125aa2846da761aa1326bbf6d4ec6ed1))
* **timeline:** dark mode styling, visual polish, focus styles, smooth animations ([3162f41](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/3162f411eed9dba0a9909ee005d09527b23cc641))
* **timeline:** integrate timeline as tab in EnvironmentMatrixView with Matrix|Timeline toggle ([312faf5](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/312faf51cdff6d95b8758e8a26e5af038e134f69))
* **ux:** add 'Needs Attention' quick filter (US-006) ([5a73724](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/5a73724ebbec96577af59f8e595bda5db18fcb27))
* **ux:** default sort by health score ascending (US-001) ([b780c38](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/b780c388793e45a0b9863d19eca38f6d98ac0137))
* **ux:** implement UX Improvements v1.0 (bd-3qm) ([abc9c3f](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/abc9c3f56aa03335ec9249e44c0c66a4318897a8))
* **ux:** larger health score badges for better visibility (US-002) ([8dee798](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/8dee798c03072686915c11c31bb1cf3a478085ff))
* **ux:** sort cards by health score within groups (US-007) ([d6bd146](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/d6bd146fbda2828c2541cd56282af034c972d380))


### Performance Improvements

* **ci:** remove e2e from regular pipeline, add as nightly ([9d218dd](https://gitlab.com/cube-craw/gitlab-cicd-dashboard/commit/9d218ddd1d7dae677c3ced7d6f2edf34d5b9167f))

# [1.1.0](https://gitlab.com/richard2/gitlab-cicd-dashboard/compare/v1.0.0...v1.1.0) (2026-01-26)


### Bug Fixes

* **ci:** use node:22 for semantic-release (v25 requires Node 22.14+) ([20d3286](https://gitlab.com/richard2/gitlab-cicd-dashboard/commit/20d3286a650b2d10c4a632d7b8f8604d3f01a158))


### Features

* **release:** add automatic versioning with semantic-release ([439d6e7](https://gitlab.com/richard2/gitlab-cicd-dashboard/commit/439d6e74c9c7ce5a49b4441995259c55ea31f66a))

# Changelog for GitLab CI/CD Dashboard

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Note:** Starting from v1.1.0, this changelog is automatically generated by [semantic-release](https://github.com/semantic-release/semantic-release).

## [Unreleased]

### Added
- Automatic versioning and changelog generation with semantic-release
- GitLab release creation on merge to main

## [1.0.0] - 2025-03-23

### Added
- Initial release of the GitLab CI/CD Dashboard
- Project pipeline status visualization
- Pipeline success rate metrics calculation
- Pipeline duration tracking
- Code coverage display
- Open merge request tracking
- Failed job analysis
- Recent commit history display
- Table view component for displaying project data
- Card view component for grid-based visualization
- Environment Matrix view for deployment tracking
- Readiness view for promotion status
- Jest testing framework integration
- Proxy server for handling API requests
- GitHub Actions workflow for automatic deployment to GitHub Pages
- GitLab CI/CD pipeline for testing and deployment
- Cloudflare Pages deployment
- Post-deployment verification tests
- E2E tests with Playwright
