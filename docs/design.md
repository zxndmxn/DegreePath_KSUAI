# Interface direction

Current design follows the owner's supplied billing-app screenshot: dark sidebar, compact program header, flat summary metrics, fine dividing lines, and dense clickable course rows.

Primary KSU colors: gold #FFC629, black #000000, gray #B0B3B2, white #FFFFFF. Verified against the [official KSU brand guide](https://campus.kennesaw.edu/offices-services/stratcomm/branding/docs/visiual-identity-march.pdf) on November 16, 2026. Supporting warm neutrals are interface choices; this independent student prototype does not imply institutional endorsement.

Use a 56px desktop header, approximately 66px course rows, and restrained headings rather than enlarging every surface. Preserve native button targets and keyboard focus. Full course rows open a labeled dialog with persistent footer actions. Do not scale the document with CSS zoom or transforms.

November 18 revision: My Plan is a viewport-sized canvas with explicit semester/course paging. The centered editor uses visible semester chips, four courses per list page, Result/Connections views and persistent footer actions. Longer edit lists have their own pages; critical content must not be clipped to fake a no-scroll layout. Coverage strips use restrained intermediate sizing (17–19px percentages, 6–7px bars). The finish transition is a circular hover/focus animation with a reduced-motion fallback. Partial schedules are labeled explicitly; exclusions do not imply earlier graduation.

The three primary destinations are My plan, Compare paths, and Saved plans. Sidebar navigation becomes a compact top bar on mobile. Appearance follows a persistent user-controlled light/dark switch; dark surfaces are neutral gray.

Fictional data status and detailed planning assumptions remain accessible. Theme and saved plans stay browser-local.
