/**
 * responsivenessEmailService.ts
 * Pure-function generator for Outlook/Gmail-ready HTML + plain text email.
 *
 * Contains two generators:
 * 1. generateResponsivenessEmailHtml() — legacy mention-based email (kept for backward compat)
 * 2. generatePositionAttentionEmailHtml() — new attention-state-based email
 *
 * All CSS is inline (Outlook strips <style>); layout is table-based.
 */

import type {
  PositionAttentionReport,
  PositionAttentionItem,
  PositionAttentionState,
} from '../../../../shared/ipc-types'

// ── Logo base64 (usq-logo-white.svg) ──────────────────────

const USQ_LOGO_BASE64 = `PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDI0LjAuMSwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiCgkgdmlld0JveD0iMCAwIDQwNC4wNSAyNTIuOTUiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQwNC4wNSAyNTIuOTU7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KCS5zdDB7ZmlsbC1ydWxlOmV2ZW5vZGQ7Y2xpcC1ydWxlOmV2ZW5vZGQ7ZmlsbDojMTkxOTE5O30KCS5zdDF7ZmlsbC1ydWxlOmV2ZW5vZGQ7Y2xpcC1ydWxlOmV2ZW5vZGQ7ZmlsbDojMzA0RkYzO30KCS5zdDJ7ZmlsbC1ydWxlOmV2ZW5vZGQ7Y2xpcC1ydWxlOmV2ZW5vZGQ7ZmlsbDojNTA1MDUwO30KCS5zdDN7ZmlsbC1ydWxlOmV2ZW5vZGQ7Y2xpcC1ydWxlOmV2ZW5vZGQ7ZmlsbDojRkZGRkZGO30KPC9zdHlsZT4KPGcgaWQ9IkxheWVyXzIiPgoJPHJlY3QgY2xhc3M9InN0MCIgd2lkdGg9IjQwNC4wNSIgaGVpZ2h0PSIyNTIuOTUiLz4KPC9nPgo8ZyBpZD0iTGF5ZXJfMSI+Cgk8Zz4KCQk8Zz4KCQkJPHBhdGggY2xhc3M9InN0MyIgZD0iTTE4Ni4wMywxMDkuNTVjLTAuMzctMC43OS0wLjg3LTEuNDYtMS41LTIuMDRjLTAuNjItMC41Ni0xLjMzLTEuMDQtMi4xMi0xLjQ0CgkJCQljLTAuODEtMC40LTEuNjItMC43NS0yLjQ1LTEuMDhjLTAuODMtMC4zMS0xLjY0LTAuNjMtMi40My0wLjk0Yy0wLjc5LTAuMjktMS41LTAuNjUtMi4xMi0xLjAyYy0wLjYyLTAuMzgtMS4xNC0wLjgxLTEuNTItMS4zMQoJCQkJYy0wLjM5LTAuNS0wLjU4LTEuMS0wLjU4LTEuODVjMC0wLjQ2LDAuMDgtMC45LDAuMjktMS4zMWMwLjIxLTAuNDIsMC41LTAuNzcsMC45MS0xLjA2YzAuMzktMC4yOSwwLjkxLTAuNTIsMS41NC0wLjY5CgkJCQljMC42Mi0wLjE3LDEuMzMtMC4yNSwyLjE0LTAuMjVjMC45MSwwLDEuNzMsMC4wOCwyLjQzLDAuMjFjMC43MSwwLjE1LDEuMzMsMC4yOSwxLjg1LDAuNDZjMC41MiwwLjE3LDAuOTYsMC4zMywxLjI5LDAuNDYKCQkJCWMwLjMzLDAuMTUsMC41OCwwLjIxLDAuNzcsMC4yMWMwLjEsMCwwLjIxLTAuMDIsMC4zMS0wLjFjMC4wOC0wLjA2LDAuMTctMC4xOSwwLjI1LTAuMzVjMC4wNi0wLjE3LDAuMS0wLjM3LDAuMTUtMC42MwoJCQkJYzAuMDItMC4yNSwwLjA0LTAuNTYsMC4wNC0wLjkyYzAtMC4zMy0wLjAyLTAuNi0wLjA0LTAuODNjLTAuMDQtMC4yMS0wLjA2LTAuNC0wLjEtMC41NmMtMC4wNC0wLjE1LTAuMDgtMC4yOS0wLjE1LTAuNDIKCQkJCWMtMC4wOC0wLjEyLTAuMjMtMC4yMy0wLjQ0LTAuMzNjLTAuMjEtMC4xLTAuNTItMC4yMy0wLjkzLTAuMzdjLTAuNDItMC4xMi0wLjkxLTAuMjctMS41LTAuNGMtMC41OC0wLjEyLTEuMjUtMC4yMS0xLjk4LTAuMjkKCQkJCWMtMC43NS0wLjA4LTEuNDctMC4xMi0yLjE4LTAuMTJjLTEuNjYsMC0zLjEyLDAuMjEtNC4zNywwLjYzYy0xLjI1LDAuNDItMi4yOSwwLjk4LTMuMTIsMS42N2MtMC44MywwLjY5LTEuNDYsMS40OC0xLjg3LDIuNAoJCQkJYy0wLjQyLDAuOTItMC42MiwxLjg4LTAuNjIsMi44N2MwLDEuMTMsMC4xOSwyLjEsMC41NiwyLjkyYzAuMzcsMC44MSwwLjksMS41MiwxLjUyLDIuMWMwLjYyLDAuNTgsMS4zNSwxLjA4LDIuMTQsMS40OAoJCQkJYzAuNzksMC40MiwxLjYyLDAuNzcsMi40NiwxLjA4YzAuODMsMC4zMywxLjYyLDAuNjMsMi40MSwwLjkyYzAuNzksMC4yOSwxLjUsMC42NSwyLjEyLDEuMDJjMC42MiwwLjM3LDEuMTQsMC44MSwxLjUyLDEuMjkKCQkJCWMwLjM3LDAuNSwwLjU4LDEuMSwwLjU4LDEuODFjMCwwLjY3LTAuMTIsMS4yMy0wLjM3LDEuNzFjLTAuMjUsMC40OC0wLjYyLDAuODctMS4wOCwxLjE3Yy0wLjQ4LDAuMzEtMS4wNCwwLjU0LTEuNjYsMC43MQoJCQkJYy0wLjY0LDAuMTctMS4zNSwwLjIzLTIuMTIsMC4yM2MtMS4wNiwwLTItMC4xMy0yLjc5LTAuNDJjLTAuODEtMC4yNy0xLjUyLTAuNTgtMi4xLTAuOTJjLTAuNTgtMC4zMy0xLjA4LTAuNjMtMS40Ny0wLjkyCgkJCQljLTAuNDItMC4yNy0wLjcxLTAuNDItMC45Mi0wLjQyYy0wLjE1LDAtMC4yNywwLjA0LTAuMzUsMC4xYy0wLjEsMC4wOC0wLjE5LDAuMTktMC4yNSwwLjM1Yy0wLjA2LDAuMTctMC4xLDAuMzgtMC4xNSwwLjYzCgkJCQljLTAuMDQsMC4yNS0wLjA0LDAuNTYtMC4wNCwwLjk0YzAsMC42MiwwLjA0LDEuMSwwLjE1LDEuNDZjMC4wOCwwLjM1LDAuMjUsMC42NSwwLjQ2LDAuODVjMC4yMSwwLjIxLDAuNTYsMC40NiwxLjA0LDAuNzEKCQkJCWMwLjQ2LDAuMjcsMS4wNCwwLjUyLDEuNzEsMC43N2MwLjY2LDAuMjUsMS40MywwLjQ2LDIuMjksMC42MmMwLjgzLDAuMTcsMS43MiwwLjIzLDIuNjYsMC4yM2MxLjUyLDAsMi45MS0wLjE3LDQuMTgtMC41NAoJCQkJYzEuMjctMC4zNSwyLjM3LTAuODcsMy4yOS0xLjU4YzAuOTEtMC42OSwxLjYyLTEuNTQsMi4xMi0yLjU2YzAuNS0xLjAyLDAuNzUtMi4xOSwwLjc1LTMuNQoJCQkJQzE4Ni42MiwxMTEuMjgsMTg2LjQxLDExMC4zNCwxODYuMDMsMTA5LjU1eiIvPgoJCQk8cGF0aCBjbGFzcz0ic3QzIiBkPSJNMjEwLjUsMTExLjU3Yy0wLjcxLDAuOTQtMS4zOSwxLjczLTIuMDIsMi4zNmMtMC42MiwwLjYyLTEuMjMsMS4xNS0xLjgxLDEuNTQKCQkJCWMtMC41OCwwLjQtMS4xNCwwLjY3LTEuNjgsMC44M2MtMC41NiwwLjE3LTEuMTQsMC4yNS0xLjczLDAuMjVjLTEuMTgsMC0yLjE2LTAuMjctMi45My0wLjg1Yy0wLjc5LTAuNTgtMS40MS0xLjMzLTEuODctMi4yOQoJCQkJYy0wLjQ4LTAuOTQtMC44MS0yLjAyLTEtMy4yNWMtMC4xOS0xLjIzLTAuMjctMi41LTAuMjctMy44MWMwLTEuMjEsMC4xLTIuNCwwLjMzLTMuNTZjMC4yMy0xLjE3LDAuNTgtMi4yMSwxLjA4LTMuMTIKCQkJCWMwLjUtMC45MiwxLjE0LTEuNjcsMS45NC0yLjI1YzAuNzktMC41NiwxLjc3LTAuODUsMi45MS0wLjg1YzEuMjMsMCwyLjQxLDAuNDIsMy41NCwxLjI1YzEuMTIsMC44MywyLjMxLDIuMDIsMy41MiwzLjU4VjExMS41N3oKCQkJCSBNMjE1LjgyLDkzLjQ2YzAtMC4xNy0wLjA0LTAuMzEtMC4xMi0wLjQ0Yy0wLjA4LTAuMS0wLjIxLTAuMTktMC4zNy0wLjI3Yy0wLjE5LTAuMDgtMC40NC0wLjEyLTAuNzMtMC4xNwoJCQkJYy0wLjI5LTAuMDItMC42Ni0wLjA0LTEuMDgtMC4wNGMtMC40NiwwLTAuODUsMC4wMi0xLjE0LDAuMDRjLTAuMjksMC4wNC0wLjU0LDAuMDgtMC43MywwLjE3Yy0wLjIxLDAuMDgtMC4zMywwLjE5LTAuNDIsMC4zMQoJCQkJYy0wLjA4LDAuMTItMC4xMiwwLjI3LTAuMTIsMC40NHYzLjRjLTAuNzktMC43Ny0xLjUyLTEuNDQtMi4xOC0yYy0wLjY2LTAuNTQtMS4zMy0xLTEuOTgtMS4zNWMtMC42Ny0wLjMzLTEuMzEtMC41OC0xLjk3LTAuNzUKCQkJCWMtMC42Ny0wLjE3LTEuMzctMC4yNS0yLjEyLTAuMjVjLTEuNzksMC0zLjM3LDAuMzMtNC43NCwxYy0xLjM3LDAuNjctMi41MiwxLjYyLTMuNDMsMi44OGMtMC45MywxLjI1LTEuNjQsMi43Ny0yLjEsNC41MgoJCQkJYy0wLjQ4LDEuNzctMC43MSwzLjc1LTAuNzEsNS45NGMwLDEuODUsMC4xOSwzLjYxLDAuNTYsNS4yN2MwLjM3LDEuNjcsMC45NiwzLjEzLDEuNzksNC4zNWMwLjgxLDEuMjUsMS44NywyLjIzLDMuMTYsMi45NgoJCQkJYzEuMjksMC43MywyLjg3LDEuMDgsNC43LDEuMDhjMC43MywwLDEuNDMtMC4wNiwyLjEyLTAuMjFjMC42OC0wLjEzLDEuMzctMC4zNywyLjA0LTAuNzFjMC42Ni0wLjMzLDEuMzUtMC43NSwyLjA2LTEuMjkKCQkJCWMwLjcxLTAuNTQsMS40My0xLjE5LDIuMjEtMS45OHYxMy45YzAsMC4xNSwwLjAyLDAuMjksMC4xLDAuNDJjMC4wOCwwLjEyLDAuMjMsMC4yMSwwLjQ0LDAuMzFjMC4yMSwwLjA2LDAuNDgsMC4xMywwLjgxLDAuMTcKCQkJCWMwLjMzLDAuMDQsMC43NywwLjA2LDEuMzEsMC4wNmMwLjUsMCwwLjkzLTAuMDIsMS4yNy0wLjA2YzAuMzMtMC4wNCwwLjYtMC4xLDAuODEtMC4xN2MwLjE5LTAuMSwwLjMzLTAuMTksMC40NC0wLjI5CgkJCQljMC4wOC0wLjE1LDAuMTUtMC4yNywwLjE1LTAuNDJWOTMuNDZ6Ii8+CgkJCTxwYXRoIGNsYXNzPSJzdDMiIGQ9Ik0yNDcuODQsOTMuNDRjMC0wLjE1LTAuMDYtMC4yNy0wLjE1LTAuMzdjLTAuMS0wLjEtMC4yNS0wLjIxLTAuNDQtMC4yOWMtMC4yMS0wLjA4LTAuNDgtMC4xNS0wLjgxLTAuMTkKCQkJCWMtMC4zMy0wLjAyLTAuNzctMC4wNC0xLjI3LTAuMDRjLTAuNTQsMC0wLjk4LDAuMDItMS4zMSwwLjA0Yy0wLjMzLDAuMDQtMC42LDAuMS0wLjgxLDAuMTljLTAuMjEsMC4wOC0wLjM1LDAuMTktMC40NCwwLjI5CgkJCQljLTAuMDgsMC4xLTAuMSwwLjIzLTAuMSwwLjM3djE4LjMyYy0xLjI1LDEuNTgtMi40NCwyLjc3LTMuNTQsMy41OGMtMS4xLDAuODEtMi4yMSwxLjIxLTMuMzMsMS4yMWMtMC44NywwLTEuNjItMC4xNy0yLjI3LTAuNTIKCQkJCWMtMC42NC0wLjM1LTEuMTgtMC44NS0xLjYtMS41Yy0wLjQyLTAuNjUtMC43My0xLjQyLTAuOTQtMi4zM2MtMC4yMS0wLjkyLTAuMzEtMi4xMy0wLjMxLTMuNjVWOTMuNDRjMC0wLjE1LTAuMDQtMC4yNy0wLjEyLTAuMzcKCQkJCWMtMC4wOC0wLjEtMC4yMy0wLjIxLTAuNDQtMC4yOWMtMC4yMS0wLjA4LTAuNS0wLjE1LTAuODMtMC4xOWMtMC4zMy0wLjAyLTAuNzctMC4wNC0xLjI3LTAuMDRjLTAuNTIsMC0wLjk2LDAuMDItMS4yOSwwLjA0CgkJCQljLTAuMzMsMC4wNC0wLjYyLDAuMS0wLjgzLDAuMTljLTAuMjEsMC4wOC0wLjM1LDAuMTktMC40NCwwLjI5Yy0wLjA4LDAuMS0wLjEsMC4yMy0wLjEsMC4zN3YxNS42N2MwLDEuODgsMC4xNSwzLjQ4LDAuNDYsNC43OQoJCQkJYzAuMzEsMS4zMSwwLjgzLDIuNDYsMS41NiwzLjQ0YzAuNzEsMSwxLjY2LDEuNzcsMi44MywyLjM2YzEuMTYsMC41OCwyLjYyLDAuODUsNC4zMywwLjg1YzEuNDYsMCwyLjg5LTAuMzMsNC4zMy0xLjA0CgkJCQljMS40MS0wLjY5LDIuODctMS43OSw0LjMzLTMuMzN2My40OGMwLDAuMTcsMC4wMiwwLjI5LDAuMDgsMC40YzAuMDYsMC4xLDAuMTksMC4xOSwwLjM3LDAuMjdjMC4xNywwLjA4LDAuNDIsMC4xMiwwLjczLDAuMTcKCQkJCWMwLjMxLDAuMDQsMC43MywwLjA2LDEuMjMsMC4wNmMwLjQ0LDAsMC44MS0wLjAyLDEuMTItMC4wNmMwLjMxLTAuMDQsMC41Ni0wLjA4LDAuNzUtMC4xN2MwLjE5LTAuMDgsMC4zMS0wLjE3LDAuMzktMC4yNwoJCQkJYzAuMDgtMC4xLDAuMTItMC4yMywwLjEyLTAuNFY5My40NHoiLz4KCQkJPHBhdGggY2xhc3M9InN0MyIgZD0iTTI3MS41NiwxMTMuMjZjLTEuMDgsMS4xMi0yLjEsMS45NC0zLjA2LDIuNDhjLTAuOTgsMC41NC0yLjA0LDAuODEtMy4xNiwwLjgxYy0xLjQyLDAtMi41LTAuMzMtMy4yNy0xLjAyCgkJCQljLTAuNzktMC42Ny0xLjE3LTEuNTgtMS4xNy0yLjc1YzAtMC42NywwLjEyLTEuMjUsMC40LTEuNzdjMC4yNy0wLjUyLDAuNjktMC45NiwxLjI3LTEuMzNjMC41OC0wLjM3LDEuMzEtMC42NSwyLjE4LTAuODMKCQkJCWMwLjg3LTAuMTksMS44OS0wLjI5LDMuMS0wLjI5aDMuN1YxMTMuMjZ6IE0yNzYuODgsMTAyLjI3YzAtMS42LTAuMTktMy0wLjU0LTQuMjFjLTAuMzctMS4yMS0wLjk2LTIuMjEtMS43Ny0zLjAyCgkJCQljLTAuODEtMC44MS0xLjg3LTEuNDQtMy4xNi0xLjg1Yy0xLjI5LTAuNDItMi44Ny0wLjY1LTQuNzItMC42NWMtMSwwLTIsMC4xLTIuOTcsMC4zMWMtMC45OCwwLjIxLTEuODcsMC40Ni0yLjcxLDAuNzcKCQkJCWMtMC44MywwLjMxLTEuNTYsMC42NS0yLjE4LDEuMDJjLTAuNjIsMC4zNy0xLjA4LDAuNjktMS4zMywwLjk0Yy0wLjI1LDAuMjUtMC40MiwwLjUtMC40OCwwLjc1Yy0wLjA4LDAuMjctMC4xLDAuNjUtMC4xLDEuMQoJCQkJYzAsMC4yOSwwLDAuNTQsMC4wNCwwLjc3YzAuMDQsMC4yMywwLjEsMC40MiwwLjE5LDAuNTZjMC4wOCwwLjE1LDAuMTcsMC4yNSwwLjI5LDAuMzNjMC4xLDAuMDgsMC4yMywwLjEsMC40LDAuMQoJCQkJYzAuMjEsMCwwLjU0LTAuMTMsMS0wLjQyYzAuNDYtMC4yNywxLjAyLTAuNTgsMS42OC0wLjkyYzAuNjctMC4zMywxLjQ0LTAuNjIsMi4zMy0wLjkyYzAuODktMC4yNywxLjkxLTAuNDIsMy4wNC0wLjQyCgkJCQljMS4wNCwwLDEuOTEsMC4xNSwyLjY0LDAuNGMwLjcxLDAuMjUsMS4yOSwwLjYyLDEuNzUsMS4xMmMwLjQ2LDAuNSwwLjc3LDEuMTUsMC45OCwxLjljMC4yMSwwLjc1LDAuMzEsMS42MiwwLjMxLDIuNnYxLjk4aC0zLjQ1CgkJCQljLTEuOTUsMC0zLjcsMC4xOS01LjI0LDAuNTJjLTEuNTYsMC4zNS0yLjg3LDAuODgtMy45NSwxLjU2Yy0xLjA4LDAuNjktMS44OSwxLjU0LTIuNDgsMi41OGMtMC41OCwxLjA0LTAuODUsMi4yNy0wLjg1LDMuNjkKCQkJCWMwLDEuMjEsMC4yMSwyLjI5LDAuNjIsMy4yNWMwLjQyLDAuOTYsMSwxLjc1LDEuNzUsMi40YzAuNzUsMC42NSwxLjY2LDEuMTUsMi43NSwxLjQ4YzEuMDgsMC4zNSwyLjI3LDAuNTIsMy42LDAuNTIKCQkJCWMxLjUsMCwyLjk0LTAuMjcsNC4yOS0wLjgzYzEuMzUtMC41NCwyLjU4LTEuNDQsMy42OC0yLjY3djIuNjNjMCwwLjI1LDAuMDYsMC40MiwwLjIzLDAuNTRjMC4xNSwwLjEzLDAuMzksMC4yMSwwLjczLDAuMjUKCQkJCWMwLjMzLDAuMDYsMC43NywwLjA4LDEuMzUsMC4wOGMwLjU4LDAsMS4wMi0wLjAyLDEuMzMtMC4wOGMwLjI5LTAuMDQsMC41NC0wLjEyLDAuNzEtMC4yNWMwLjE3LTAuMTIsMC4yNy0wLjI5LDAuMjctMC41MlYxMDIuMjcKCQkJCXoiLz4KCQkJPHBhdGggY2xhc3M9InN0MyIgZD0iTTMwMi4zMSw5NC4yN2MwLTAuMjMtMC4wMi0wLjQtMC4wNi0wLjUyYy0wLjA0LTAuMTItMC4wNi0wLjIxLTAuMS0wLjI5Yy0wLjA0LTAuMDgtMC4xLTAuMTctMC4yMy0wLjI1CgkJCQljLTAuMTItMC4wOC0wLjMxLTAuMTctMC42LTAuMjVjLTAuMjktMC4wOC0wLjYyLTAuMTUtMC45OC0wLjIzYy0wLjM1LTAuMDYtMC42OS0wLjEtMS4wMi0wLjE1Yy0wLjMzLTAuMDItMC42Mi0wLjA0LTAuODctMC4wNAoJCQkJYy0wLjU4LDAtMS4xNCwwLjA4LTEuNzEsMC4yMWMtMC41NiwwLjEyLTEuMTIsMC4zNy0xLjcsMC43MWMtMC41OCwwLjM1LTEuMTksMC44My0xLjgxLDEuNDRjLTAuNjQsMC42My0xLjMzLDEuNC0yLjA2LDIuMzUKCQkJCXYtMy44MWMwLTAuMTUtMC4wNC0wLjI3LTAuMTItMC4zN2MtMC4wOC0wLjEtMC4yMS0wLjIxLTAuMzctMC4yOWMtMC4xNy0wLjA4LTAuNDItMC4xNS0wLjczLTAuMTkKCQkJCWMtMC4zMS0wLjAyLTAuNzEtMC4wNC0xLjE2LTAuMDRjLTAuNSwwLTAuODksMC4wMi0xLjE4LDAuMDRjLTAuMzEsMC4wNC0wLjU2LDAuMS0wLjc1LDAuMTljLTAuMjEsMC4wOC0wLjMzLDAuMTktMC4zOSwwLjI5CgkJCQljLTAuMDYsMC4xLTAuMDgsMC4yMy0wLjA4LDAuMzd2MjYuMjJjMCwwLjE3LDAuMDIsMC4yOSwwLjEsMC40YzAuMDgsMC4xLDAuMjEsMC4xOSwwLjQyLDAuMjdjMC4yMSwwLjA4LDAuNDgsMC4xMiwwLjgzLDAuMTcKCQkJCWMwLjMzLDAuMDQsMC43NywwLjA2LDEuMjksMC4wNmMwLjU0LDAsMC45OC0wLjAyLDEuMzMtMC4wNmMwLjMzLTAuMDQsMC42LTAuMDgsMC44MS0wLjE3YzAuMTktMC4wOCwwLjMzLTAuMTcsMC40MS0wLjI3CgkJCQljMC4wOC0wLjEsMC4xMi0wLjIzLDAuMTItMC40di0xNy4yNGMwLjY5LTEuMDgsMS4zMS0yLjAyLDEuODktMi43N2MwLjU2LTAuNzUsMS4xLTEuMzUsMS42Mi0xLjgxczEuMDItMC43NywxLjUtMC45OAoJCQkJYzAuNDYtMC4yMSwwLjk1LTAuMzEsMS40NS0wLjMxYzAuMzksMCwwLjc3LDAuMDQsMS4xMiwwLjEyYzAuMzUsMC4wOCwwLjY5LDAuMTcsMC45OCwwLjI1YzAuMjksMC4wOCwwLjU0LDAuMTksMC43NywwLjI3CgkJCQljMC4yMSwwLjA4LDAuNDIsMC4xMiwwLjU4LDAuMTJjMC4xNSwwLDAuMjctMC4wNCwwLjM1LTAuMTJjMC4wOC0wLjA4LDAuMTctMC4yMywwLjIzLTAuNGMwLjA0LTAuMTcsMC4wOC0wLjM3LDAuMS0wLjYzCgkJCQljMC4wMi0wLjI1LDAuMDQtMC41OCwwLjA0LTAuOTZDMzAyLjMzLDk0LjgzLDMwMi4zMSw5NC41MiwzMDIuMzEsOTQuMjd6Ii8+CgkJCTxwYXRoIGNsYXNzPSJzdDMiIGQ9Ik0zMTAuOTUsMTAzLjIxYzAuMDQtMC44OCwwLjIxLTEuNzEsMC41Mi0yLjUyYzAuMjktMC44MSwwLjczLTEuNTIsMS4zMS0yLjEyYzAuNTYtMC42LDEuMjctMS4wOCwyLjEtMS40NgoJCQkJYzAuODMtMC4zNywxLjc5LTAuNTYsMi45MS0wLjU2YzIuMTYsMCwzLjc5LDAuNiw0Ljg5LDEuNzdjMS4xLDEuMTksMS42MiwyLjgxLDEuNTgsNC45SDMxMC45NXogTTMyOS41OSwxMDQuMzgKCQkJCWMwLTEuNjMtMC4yMy0zLjE1LTAuNjYtNC41OGMtMC40NC0xLjQ0LTEuMTItMi42OS0yLjA0LTMuNzVjLTAuOTItMS4wNi0yLjEtMS45Mi0zLjU0LTIuNTRjLTEuNDQtMC42Mi0zLjE4LTAuOTYtNS4yMi0wLjk2CgkJCQljLTEuOTEsMC0zLjY0LDAuMzMtNS4xOCwwLjk4Yy0xLjU0LDAuNjctMi44NywxLjYtMy45NSwyLjgxYy0xLjEsMS4yMS0xLjk0LDIuNjktMi41Miw0LjQ0Yy0wLjU4LDEuNzUtMC44NSwzLjcxLTAuODUsNS45CgkJCQljMCwyLjMxLDAuMjcsNC4zMywwLjgzLDYuMDZjMC41NCwxLjc1LDEuMzcsMy4xOSwyLjQ1LDQuMzRjMS4wOCwxLjE3LDIuNDMsMi4wMiw0LjA0LDIuNmMxLjU4LDAuNTgsMy40NSwwLjg4LDUuNTcsMC44OAoJCQkJYzEuMjEsMCwyLjM3LTAuMTIsMy40NS0wLjM4YzEuMDgtMC4yNSwyLjAyLTAuNTIsMi44NS0wLjgzYzAuODEtMC4zMSwxLjQ4LTAuNjIsMi0wLjk2YzAuNS0wLjMzLDAuODEtMC41NCwwLjkxLTAuNjcKCQkJCWMwLjEtMC4xLDAuMTktMC4yMSwwLjI3LTAuMzNjMC4wNi0wLjEyLDAuMS0wLjI1LDAuMTUtMC40YzAuMDItMC4xNSwwLjA0LTAuMzEsMC4wNi0wLjUyYzAuMDItMC4xOSwwLjA0LTAuNDIsMC4wNC0wLjY3CgkJCQljMC0wLjM1LTAuMDItMC42Ny0wLjA0LTAuOTJjLTAuMDQtMC4yNS0wLjA4LTAuNDQtMC4xMi0wLjU4Yy0wLjA2LTAuMTItMC4xNS0wLjIzLTAuMjUtMC4zMWMtMC4xLTAuMDYtMC4yMS0wLjEtMC4zMy0wLjEKCQkJCWMtMC4yNSwwLTAuNTgsMC4xNS0xLjAyLDAuNDJjLTAuNDQsMC4yOS0xLDAuNTgtMS42OCwwLjkyYy0wLjY5LDAuMzMtMS41LDAuNjUtMi40MywwLjkyYy0wLjk0LDAuMjktMiwwLjQyLTMuMTgsMC40MgoJCQkJYy0xLjU0LDAtMi44My0wLjIxLTMuODctMC42NWMtMS4wNC0wLjQ0LTEuODktMS4wNi0yLjU0LTEuOWMtMC42Ni0wLjgxLTEuMTItMS43OS0xLjQxLTIuOTRjLTAuMjktMS4xMy0wLjQyLTIuNDItMC40Mi0zLjg1CgkJCQloMTYuODFjMC40OCwwLDAuOS0wLjE1LDEuMjctMC40NmMwLjM3LTAuMjksMC41Ni0wLjgxLDAuNTYtMS41NFYxMDQuMzh6Ii8+CgkJCTxwYXRoIGNsYXNzPSJzdDMiIGQ9Ik05Ny4xLDkzLjQ0YzAtMC4xNS0wLjA2LTAuMjctMC4xNS0wLjM3Yy0wLjEtMC4xLTAuMjUtMC4yMS0wLjQ0LTAuMjljLTAuMjEtMC4wOC0wLjQ4LTAuMTUtMC44MS0wLjE5CgkJCQljLTAuMzMtMC4wMi0wLjc3LTAuMDQtMS4yNy0wLjA0Yy0wLjU0LDAtMC45OCwwLjAyLTEuMzEsMC4wNGMtMC4zMywwLjA0LTAuNiwwLjEtMC44MSwwLjE5Yy0wLjIxLDAuMDgtMC4zNSwwLjE5LTAuNDQsMC4yOQoJCQkJYy0wLjA4LDAuMS0wLjEsMC4yMy0wLjEsMC4zN3YxOC4zMmMtMS4yNSwxLjU4LTIuNDMsMi43Ny0zLjU0LDMuNThjLTEuMSwwLjgxLTIuMiwxLjIxLTMuMzMsMS4yMWMtMC44NywwLTEuNjItMC4xNy0yLjI3LTAuNTIKCQkJCWMtMC42NC0wLjM1LTEuMTktMC44NS0xLjYtMS41Yy0wLjQyLTAuNjUtMC43My0xLjQyLTAuOTMtMi4zM2MtMC4yMS0wLjkyLTAuMzEtMi4xMy0wLjMxLTMuNjVWOTMuNDRjMC0wLjE1LTAuMDQtMC4yNy0wLjEyLTAuMzcKCQkJCWMtMC4wOC0wLjEtMC4yMy0wLjIxLTAuNDQtMC4yOWMtMC4yMS0wLjA4LTAuNS0wLjE1LTAuODMtMC4xOWMtMC4zMy0wLjAyLTAuNzctMC4wNC0xLjI3LTAuMDRjLTAuNTIsMC0wLjk2LDAuMDItMS4yOSwwLjA0CgkJCQljLTAuMzMsMC4wNC0wLjYyLDAuMS0wLjgzLDAuMTljLTAuMjEsMC4wOC0wLjM1LDAuMTktMC40NCwwLjI5Yy0wLjA4LDAuMS0wLjEsMC4yMy0wLjEsMC4zN3YxNS42N2MwLDEuODgsMC4xNSwzLjQ4LDAuNDYsNC43OQoJCQkJYzAuMzEsMS4zMSwwLjgzLDIuNDYsMS41NiwzLjQ0YzAuNzEsMSwxLjY2LDEuNzcsMi44MywyLjM2YzEuMTcsMC41OCwyLjYyLDAuODUsNC4zMywwLjg1YzEuNDUsMCwyLjg5LTAuMzMsNC4zMy0xLjA0CgkJCQljMS40MS0wLjY5LDIuODctMS43OSw0LjMzLTMuMzN2My40OGMwLDAuMTcsMC4wMiwwLjI5LDAuMDgsMC40YzAuMDYsMC4xLDAuMTksMC4xOSwwLjM3LDAuMjdjMC4xNywwLjA4LDAuNDIsMC4xMiwwLjczLDAuMTcKCQkJCWMwLjMxLDAuMDQsMC43MywwLjA2LDEuMjMsMC4wNmMwLjQ0LDAsMC44MS0wLjAyLDEuMTItMC4wNmMwLjMxLTAuMDQsMC41Ni0wLjA4LDAuNzUtMC4xN2MwLjE5LTAuMDgsMC4zMS0wLjE3LDAuMzktMC4yNwoJCQkJYzAuMDgtMC4xLDAuMTItMC4yMywwLjEyLTAuNFY5My40NHoiLz4KCQkJPHBhdGggY2xhc3M9InN0MyIgZD0iTTEyOC40NSwxMDMuOWMwLTEuODMtMC4xNy0zLjQtMC40OC00LjcxYy0wLjMxLTEuMzEtMC44My0yLjQ2LTEuNTQtMy40NGMtMC43My0wLjk2LTEuNjktMS43NS0yLjg1LTIuMzMKCQkJCWMtMS4xNi0wLjU4LTIuNi0wLjg4LTQuMzEtMC44OGMtMS40NiwwLTIuOTEsMC4zNS00LjM1LDEuMDZjLTEuNDMsMC43MS0yLjg3LDEuODEtNC4zMSwzLjMxdi0zLjQ4YzAtMC4xNS0wLjA0LTAuMjctMC4xMi0wLjM3CgkJCQljLTAuMDgtMC4xLTAuMjEtMC4yMS0wLjM3LTAuMjljLTAuMTctMC4wOC0wLjQyLTAuMTUtMC43My0wLjE5Yy0wLjMxLTAuMDItMC43MS0wLjA0LTEuMTctMC4wNGMtMC41LDAtMC44OSwwLjAyLTEuMTgsMC4wNAoJCQkJYy0wLjMxLDAuMDQtMC41NiwwLjEtMC43NSwwLjE5Yy0wLjIxLDAuMDgtMC4zMywwLjE5LTAuMzksMC4yOWMtMC4wNiwwLjEtMC4wOCwwLjIzLTAuMDgsMC4zN3YyNi4yMmMwLDAuMTcsMC4wMiwwLjI5LDAuMSwwLjQKCQkJCWMwLjA4LDAuMSwwLjIxLDAuMTksMC40MSwwLjI3YzAuMjEsMC4wOCwwLjQ4LDAuMTIsMC44MywwLjE3YzAuMzMsMC4wNCwwLjc3LDAuMDYsMS4yOSwwLjA2YzAuNTQsMCwwLjk4LTAuMDIsMS4zMy0wLjA2CgkJCQljMC4zMy0wLjA0LDAuNi0wLjA4LDAuODEtMC4xN2MwLjE5LTAuMDgsMC4zMy0wLjE3LDAuNDItMC4yN2MwLjA4LTAuMSwwLjEyLTAuMjMsMC4xMi0wLjR2LTE4LjEzYzEuMjEtMS42MywyLjM3LTIuODUsMy41LTMuNzEKCQkJCWMxLjEyLTAuODMsMi4yMy0xLjI3LDMuMzUtMS4yN2MwLjg1LDAsMS42LDAuMTksMi4yNywwLjUyYzAuNjQsMC4zNSwxLjE4LDAuODUsMS42LDEuNWMwLjQyLDAuNjcsMC43MywxLjQ0LDAuOTQsMi4zMwoJCQkJYzAuMjEsMC45MiwwLjMzLDIuMSwwLjMzLDMuNTZ2MTUuMTljMCwwLjE3LDAuMDQsMC4yOSwwLjEzLDAuNGMwLjA4LDAuMSwwLjIxLDAuMTksMC40MiwwLjI3YzAuMTksMC4wOCwwLjQ2LDAuMTIsMC44MSwwLjE3CgkJCQljMC4zMywwLjA0LDAuNzksMC4wNiwxLjMzLDAuMDZjMC41LDAsMC45My0wLjAyLDEuMjktMC4wNmMwLjMzLTAuMDQsMC42LTAuMDgsMC44MS0wLjE3YzAuMTktMC4wOCwwLjMzLTAuMTcsMC40Mi0wLjI3CgkJCQljMC4wOC0wLjEsMC4xMy0wLjIzLDAuMTMtMC40VjEwMy45eiIvPgoJCQk8cGF0aCBjbGFzcz0ic3QzIiBkPSJNMTU2Ljc5LDExMC42M2MtMC4zMSwxLjIxLTAuNzksMi4yNy0xLjQ2LDMuMTVjLTAuNjYsMC44Ny0xLjUsMS41Ni0yLjUyLDIuMDRjLTEuMDIsMC41LTIuMjIsMC43My0zLjYsMC43MwoJCQkJYy0xLjU0LDAtMi44MS0wLjI1LTMuODMtMC43OWMtMS4wMi0wLjU0LTEuODMtMS4yNS0yLjQ0LTIuMTdjLTAuNjItMC45Mi0xLjA2LTEuOTgtMS4zMS0zLjE5Yy0wLjI1LTEuMjEtMC4zNy0yLjUyLTAuMzctMy45MgoJCQkJYzAtMS40NCwwLjE1LTIuNzcsMC40OC0zLjk4YzAuMzEtMS4yMSwwLjc5LTIuMjcsMS40NS0zLjE3YzAuNjQtMC44OCwxLjQ4LTEuNTYsMi41LTIuMDZjMS0wLjQ4LDIuMjEtMC43MywzLjYyLTAuNzMKCQkJCWMxLjUyLDAsMi43OSwwLjI3LDMuODEsMC44MWMxLjAyLDAuNTQsMS44MywxLjI1LDIuNDMsMi4xN2MwLjYsMC45MiwxLjA0LDIsMS4yOSwzLjIxYzAuMjUsMS4yMSwwLjQsMi41LDAuNCwzLjg4CgkJCQlDMTU3LjI1LDEwOC4wNywxNTcuMDgsMTA5LjQyLDE1Ni43OSwxMTAuNjN6IE0xNjEuNzYsMTAwLjU0Yy0wLjU0LTEuNzEtMS4zNy0zLjE1LTIuNDUtNC4zM2MtMS4wOC0xLjE5LTIuNDMtMi4xLTQuMDYtMi43MwoJCQkJYy0xLjYyLTAuNjItMy41NC0wLjk0LTUuNzItMC45NGMtMi4yOSwwLTQuMjYsMC4zNS01Ljk1LDEuMDZjLTEuNywwLjcxLTMuMTIsMS42OS00LjI0LDIuOTRjLTEuMTQsMS4yNy0yLDIuNzctMi41Niw0LjUyCgkJCQljLTAuNTYsMS43NS0wLjgzLDMuNjUtMC44Myw1LjczYzAsMi4xNSwwLjI1LDQuMDYsMC43OSw1Ljc3YzAuNTQsMS43MSwxLjM1LDMuMTUsMi40Myw0LjMzYzEuMDgsMS4xOSwyLjQ0LDIuMDgsNC4wNiwyLjcxCgkJCQljMS42MiwwLjYzLDMuNTQsMC45NCw1Ljc0LDAuOTRjMi4yNSwwLDQuMjItMC4zNSw1LjkzLTEuMDZjMS43LTAuNzEsMy4xMi0xLjY5LDQuMjYtMi45NmMxLjEyLTEuMjUsMS45Ny0yLjc1LDIuNTYtNC41CgkJCQljMC41Ni0xLjc1LDAuODUtMy42NywwLjg1LTUuNzVDMTYyLjU3LDEwNC4xNSwxNjIuMywxMDIuMjUsMTYxLjc2LDEwMC41NHoiLz4KCQk8L2c+CgkJPGc+CgkJCTxyZWN0IHg9Ijc4LjQ2IiB5PSIxMjguNTYiIGNsYXNzPSJzdDMiIHdpZHRoPSI1LjMyIiBoZWlnaHQ9IjUuMzQiLz4KCQkJPHJlY3QgeD0iOTAuNDQiIHk9IjEyOC41NiIgY2xhc3M9InN0MyIgd2lkdGg9IjUuMzIiIGhlaWdodD0iNS4zNCIvPgoJCQk8cmVjdCB4PSIxMDIuNzIiIHk9IjEzNy44OSIgY2xhc3M9InN0MyIgd2lkdGg9IjUuMzIiIGhlaWdodD0iNS4zMyIvPgoJCQk8cmVjdCB4PSIxMTQuOTgiIHk9IjEyOC41NiIgY2xhc3M9InN0MyIgd2lkdGg9IjUuMzMiIGhlaWdodD0iNS4zNCIvPgoJCQk8cmVjdCB4PSIxMzguMzciIHk9IjEyOC41NiIgY2xhc3M9InN0MyIgd2lkdGg9IjUuMzMiIGhlaWdodD0iNS4zNCIvPgoJCQk8cmVjdCB4PSIxNTAuNjQiIHk9IjEzNy44OSIgY2xhc3M9InN0MyIgd2lkdGg9IjUuMzMiIGhlaWdodD0iNS4zMyIvPgoJCQk8cmVjdCB4PSIxNjIuOTEiIHk9IjE0NS45IiBjbGFzcz0ic3QzIiB3aWR0aD0iNS4zMiIgaGVpZ2h0PSI1LjMzIi8+CgkJCTxyZWN0IHg9IjE3NS4zNSIgeT0iMTM3Ljg5IiBjbGFzcz0ic3QzIiB3aWR0aD0iNS4zMiIgaGVpZ2h0PSI1LjMzIi8+CgkJCTxyZWN0IHg9IjE4Ny42MiIgeT0iMTM3Ljg5IiBjbGFzcz0ic3QzIiB3aWR0aD0iNS4zMiIgaGVpZ2h0PSI1LjMzIi8+CgkJCTxyZWN0IHg9IjE5OS45IiB5PSIxNDUuOSIgY2xhc3M9InN0MyIgd2lkdGg9IjUuMzIiIGhlaWdodD0iNS4zMyIvPgoJCQk8cmVjdCB4PSIyMTIuNDYiIHk9IjE1NS4yNCIgY2xhc3M9InN0MyIgd2lkdGg9IjUuMzIiIGhlaWdodD0iNS4zMyIvPgoJCQk8cmVjdCB4PSI3OC40NiIgeT0iMTM3Ljg5IiBjbGFzcz0ic3QzIiB3aWR0aD0iNS4zMiIgaGVpZ2h0PSI1LjMzIi8+CgkJCTxyZWN0IHg9IjkwLjQ0IiB5PSIxMzcuODkiIGNsYXNzPSJzdDMiIHdpZHRoPSI1LjMyIiBoZWlnaHQ9IjUuMzMiLz4KCQkJPHJlY3QgeD0iMTAyLjcyIiB5PSIxNDUuOSIgY2xhc3M9InN0MyIgd2lkdGg9IjUuMzIiIGhlaWdodD0iNS4zMyIvPgoJCQk8cmVjdCB4PSIxMTQuOTgiIHk9IjEzNy44OSIgY2xhc3M9InN0MyIgd2lkdGg9IjUuMzMiIGhlaWdodD0iNS4zMyIvPgoJCQk8cmVjdCB4PSIxMzguMzciIHk9IjEzNy44OSIgY2xhc3M9InN0MyIgd2lkdGg9IjUuMzMiIGhlaWdodD0iNS4zMyIvPgoJCQk8cmVjdCB4PSIxNTAuNjQiIHk9IjE0NS45IiBjbGFzcz0ic3QzIiB3aWR0aD0iNS4zMyIgaGVpZ2h0PSI1LjMzIi8+CgkJCTxyZWN0IHg9IjE2Mi45MSIgeT0iMTU1LjI0IiBjbGFzcz0ic3QzIiB3aWR0aD0iNS4zMiIgaGVpZ2h0PSI1LjMzIi8+CgkJCTxyZWN0IHg9IjE3NS4zNSIgeT0iMTQ1LjkiIGNsYXNzPSJzdDMiIHdpZHRoPSI1LjMyIiBoZWlnaHQ9IjUuMzMiLz4KCQkJPHJlY3QgeD0iMTg3LjYyIiB5PSIxNDUuOSIgY2xhc3M9InN0MyIgd2lkdGg9IjUuMzIiIGhlaWdodD0iNS4zMyIvPgoJCQk8cmVjdCB4PSIxOTkuOSIgeT0iMTU1LjI0IiBjbGFzcz0ic3QzIiB3aWR0aD0iNS4zMiIgaGVpZ2h0PSI1LjMzIi8+CgkJPC9nPgoJPC9nPgo8L2c+Cjwvc3ZnPgo=`

// ── Data types ─────────────────────────────────────────────

export interface ResponsivenessEmailPosition {
  positionUpstreamId: number
  account: string
  coe: string
  mainSkill: string
  aging: number
  unansweredCount: number
  taggedLeads: string[]
  aiSummary: string
}

export interface ResponsivenessEmailData {
  reportDate: Date
  totalMentions: number
  unansweredMentions: number
  responseRate: number
  aiResolvedCount: number
  adjustedUnanswered: number
  adjustedRate: number
  leadSummaries: Array<{
    name: string
    email: string
    totalMentions: number
    unanswered: number
    responseRate: number
  }>
  positions: ResponsivenessEmailPosition[]
}

// ── Helpers ────────────────────────────────────────────────

function formatEmailDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatEmailTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function getWeekOfDate(date: Date): string {
  // Get Monday of the current week
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function rateColor(rate: number): string {
  if (rate >= 80) return '#10B981'
  if (rate >= 50) return '#F59E0B'
  return '#EF4444'
}

function rateBgColor(rate: number): string {
  if (rate >= 80) return '#ECFDF5'
  if (rate >= 50) return '#FFFBEB'
  return '#FEF2F2'
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Build an inline progress bar using table cells */
function buildProgressBar(rate: number): string {
  const filled = Math.round(rate / 10)
  const empty = 10 - filled
  const color = rateColor(rate)
  const cells = []
  for (let i = 0; i < filled; i++) {
    cells.push(`<td style="width:16px;height:10px;background-color:${color};border-radius:2px;"></td>`)
  }
  for (let i = 0; i < empty; i++) {
    cells.push(`<td style="width:16px;height:10px;background-color:#E2E8F0;border-radius:2px;"></td>`)
  }
  return `<table cellpadding="0" cellspacing="1" border="0" style="display:inline-table;vertical-align:middle;"><tr>${cells.join('')}</tr></table>`
}

// ── Practice lead → technology mapping ─────────────────────

/** Maps lead email → list of technology/COE keywords they own.
 *  Matching is case-insensitive against position.coe and position.mainSkill.
 *  Any position not matching a lead falls to the FALLBACK lead (Eduardo Torres / Niche). */
const PRACTICE_LEAD_TECHNOLOGIES: Record<string, string[]> = {
  'luis.naranjo@unosquare.com':       ['angular', 'node.js', 'node', 'react', 'go', 'javascript', 'vue.js', 'vue', 'typescript', 'js'],
  'emmanuel.huitrado@unosquare.com':  ['java', 'python'],
  'jd.warren@unosquare.com':          ['ruby'],
  'braulio.hernandez@unosquare.com':  ['c#', '.net', 'dotnet'],
}
const FALLBACK_LEAD_EMAIL = 'eduardo.torres@unosquare.com'

function findOwnerEmail(position: ResponsivenessEmailPosition): string {
  const coe = position.coe.toLowerCase()
  const skill = position.mainSkill.toLowerCase()

  for (const [email, techs] of Object.entries(PRACTICE_LEAD_TECHNOLOGIES)) {
    if (techs.some(t => coe.includes(t) || skill.includes(t))) {
      return email
    }
  }
  return FALLBACK_LEAD_EMAIL
}

// ── Group positions by lead ────────────────────────────────

interface LeadGroup {
  leadName: string
  unansweredCount: number
  positions: ResponsivenessEmailPosition[]
}

function groupPositionsByLead(
  positions: ResponsivenessEmailPosition[],
  leadSummaries: ResponsivenessEmailData['leadSummaries'],
): LeadGroup[] {
  // Assign each position to its COE owner (not who was @-tagged)
  const map = new Map<string, ResponsivenessEmailPosition[]>()
  for (const pos of positions) {
    const ownerEmail = findOwnerEmail(pos)
    const arr = map.get(ownerEmail) || []
    arr.push(pos)
    map.set(ownerEmail, arr)
  }

  // Build groups using lead summaries for display info
  const groups: LeadGroup[] = []
  for (const lead of leadSummaries) {
    const owned = map.get(lead.email)
    if (!owned || owned.length === 0) continue
    const totalUnanswered = owned.reduce((sum, p) => sum + p.unansweredCount, 0)
    groups.push({
      leadName: lead.name,
      unansweredCount: totalUnanswered,
      positions: owned.sort((a, b) => b.unansweredCount - a.unansweredCount),
    })
  }

  return groups.sort((a, b) => b.unansweredCount - a.unansweredCount)
}

// ── HTML Generator ─────────────────────────────────────────

export function generateResponsivenessEmailHtml(data: ResponsivenessEmailData): { html: string; plainText: string } {
  const weekOf = getWeekOfDate(data.reportDate)
  const timestamp = formatEmailTimestamp(data.reportDate)
  const year = data.reportDate.getFullYear()
  const leadGroups = groupPositionsByLead(data.positions, data.leadSummaries)

  // ── Build lead scorecard rows ──
  const leadScoreRows = data.leadSummaries
    .sort((a, b) => a.responseRate - b.responseRate)
    .map(lead => {
      const color = rateColor(lead.responseRate)
      const bg = rateBgColor(lead.responseRate)
      return `
        <tr>
          <td style="padding:8px 12px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1E293B;">
            &#128100; ${escapeHtml(lead.name)}
          </td>
          <td style="padding:8px 12px;text-align:center;">
            ${buildProgressBar(lead.responseRate)}
          </td>
          <td style="padding:8px 12px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:${color};text-align:center;">
            ${lead.responseRate}%
          </td>
          <td style="padding:8px 12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#64748B;text-align:center;">
            <span style="background-color:${bg};color:${color};padding:2px 8px;border-radius:10px;font-weight:600;font-size:12px;">
              ${lead.unanswered}/${lead.totalMentions}
            </span>
          </td>
        </tr>`
    }).join('')

  // ── Build position card blocks grouped by lead ──
  const leadSections = leadGroups.map(group => {
    const positionCards = group.positions.map(pos => {
      const taggedStr = pos.taggedLeads.map(t => escapeHtml(t)).join(', ')
      const aiSection = pos.aiSummary ? `
        <tr>
          <td style="padding:12px 16px;background-color:#F5F3FF;border-left:3px solid #8B5CF6;border-radius:0 0 8px 8px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#7C3AED;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:4px;">
                  &#10024; AI Summary
                </td>
              </tr>
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#4C1D95;line-height:1.5;">
                  ${escapeHtml(pos.aiSummary)}
                </td>
              </tr>
            </table>
          </td>
        </tr>` : ''

      return `
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:12px;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="padding:14px 16px;background-color:#FFFFFF;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1E293B;font-weight:600;padding-bottom:6px;">
                    <span style="color:#304FF3;font-weight:700;">#${pos.positionUpstreamId}</span>
                    &middot; ${escapeHtml(pos.account)}
                    &middot; ${escapeHtml(pos.coe)}
                    &middot; ${escapeHtml(pos.mainSkill)}
                    &middot; <span style="color:#64748B;font-weight:400;">${pos.aging} days open</span>
                  </td>
                </tr>
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#64748B;padding-bottom:4px;">
                    Tagged: ${taggedStr}
                  </td>
                </tr>
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;">
                    <span style="background-color:#FEF2F2;color:#EF4444;padding:2px 8px;border-radius:10px;font-weight:600;">
                      ${pos.unansweredCount} unanswered mention${pos.unansweredCount !== 1 ? 's' : ''}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${aiSection}
        </table>`
    }).join('')

    return `
      <!-- Lead Section Divider -->
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0 12px 0;">
        <tr>
          <td style="border-bottom:2px solid #E2E8F0;padding-bottom:8px;">
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#1E293B;">
              ${escapeHtml(group.leadName)}
            </span>
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#EF4444;font-weight:600;margin-left:8px;">
              (${group.unansweredCount} unanswered)
            </span>
          </td>
        </tr>
      </table>
      ${positionCards}`
  }).join('')

  // ── Assemble full HTML ──
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>COE Responsiveness Report</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <!-- Wrapper -->
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <!-- Main container -->
        <table cellpadding="0" cellspacing="0" border="0" width="680" style="max-width:680px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background-color:#191919;padding:32px 30px 28px 30px;border-radius:12px 12px 0 0;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <img src="data:image/svg+xml;base64,${USQ_LOGO_BASE64}" alt="Unosquare" width="160" height="100" style="display:block;margin-bottom:16px;" />
                  </td>
                </tr>
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#FFFFFF;padding-bottom:4px;">
                    COE Responsiveness Report
                  </td>
                </tr>
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#94A3B8;">
                    Week of ${escapeHtml(weekOf)}
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:12px;">
                    <div style="height:3px;width:60px;background-color:#304FF3;border-radius:2px;"></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background-color:#F8FAFC;padding:24px 30px 32px 30px;">

              <!-- Summary Stats -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px;background-color:#FFFFFF;" width="33%" align="center">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748B;margin-bottom:4px;">Total Mentions</div>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:700;color:#1E293B;">${data.totalMentions}</div>
                  </td>
                  <td style="padding:16px 20px;background-color:#FFFFFF;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;" width="34%" align="center">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748B;margin-bottom:4px;">Unanswered</div>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:700;color:#EF4444;">${data.unansweredMentions}</div>
                    ${data.aiResolvedCount > 0 ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#7C3AED;margin-top:2px;">AI adjusted: ${data.adjustedUnanswered} (${data.aiResolvedCount} resolved)</div>` : ''}
                  </td>
                  <td style="padding:16px 20px;background-color:#FFFFFF;" width="33%" align="center">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748B;margin-bottom:4px;">Response Rate</div>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:700;color:${rateColor(data.responseRate)};">${data.responseRate}%</div>
                    ${data.aiResolvedCount > 0 ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#7C3AED;margin-top:2px;">AI adjusted: ${data.adjustedRate}%</div>` : ''}
                  </td>
                </tr>
              </table>

              <!-- Lead Scorecard -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:8px;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
                <tr>
                  <td colspan="4" style="padding:12px 16px;background-color:#F8FAFC;border-bottom:1px solid #E2E8F0;">
                    <span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#475569;">Lead Scorecard</span>
                  </td>
                </tr>
                ${leadScoreRows}
              </table>

              <!-- Position sections grouped by lead -->
              ${leadSections}

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#E2E8F0;padding:24px 30px;border-radius:0 0 12px 12px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#475569;padding-bottom:4px;">
                    &copy; ${year} Unosquare, Inc.
                  </td>
                </tr>
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#64748B;padding-bottom:2px;">
                    Generated by COE Nexus &middot; AI analysis as of ${escapeHtml(timestamp)}
                  </td>
                </tr>
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#94A3B8;">
                    Data reflects open positions at time of generation.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  // ── Plain text fallback ──
  const divider = '═'.repeat(50)
  const leadScoreText = data.leadSummaries
    .sort((a, b) => a.responseRate - b.responseRate)
    .map(l => `  • ${l.name}: ${l.responseRate}% (${l.unanswered}/${l.totalMentions} unanswered)`)
    .join('\n')

  const leadSectionsText = leadGroups.map(group => {
    const posText = group.positions.map(pos => {
      const lines = [
        `  #${pos.positionUpstreamId} · ${pos.account} · ${pos.coe} · ${pos.mainSkill} · ${pos.aging} days open`,
        `  Tagged: ${pos.taggedLeads.join(', ')}`,
        `  ${pos.unansweredCount} unanswered mention${pos.unansweredCount !== 1 ? 's' : ''}`,
      ]
      if (pos.aiSummary) lines.push(`  ✨ AI Summary: ${pos.aiSummary}`)
      return lines.join('\n')
    }).join('\n\n')

    return `\n--- ${group.leadName} (${group.unansweredCount} unanswered) ---\n\n${posText}`
  }).join('\n')

  const aiLine = data.aiResolvedCount > 0
    ? `\nAI adjusted: ${data.adjustedUnanswered} unanswered · ${data.adjustedRate}% rate (${data.aiResolvedCount} resolved)\n`
    : ''

  const plainText = `COE Responsiveness Report — Week of ${weekOf}
${divider}

Summary: ${data.totalMentions} mentions · ${data.unansweredMentions} unanswered · ${data.responseRate}% response rate${aiLine}

Lead Scorecard:
${leadScoreText}
${leadSectionsText}

${divider}
Generated by COE Nexus · ${timestamp}
Data reflects open positions at time of generation.`

  return { html, plainText }
}

// ── Position Attention Email Generator ─────────────────────

const STATE_EMOJI: Record<PositionAttentionState, string> = {
  'needs-coe-action': '&#128308;',   // 🔴
  'waiting-on-client': '&#128993;',  // 🟡
  'on-track': '&#128994;',          // 🟢
  'no-activity': '&#9898;',          // ⚪
  'escalated': '&#128992;',          // 🟠
}

const STATE_LABEL: Record<PositionAttentionState, string> = {
  'needs-coe-action': 'Needs COE Action',
  'waiting-on-client': 'Waiting on Client',
  'on-track': 'On Track',
  'no-activity': 'No Activity',
  'escalated': 'Escalated',
}

const STATE_COLOR: Record<PositionAttentionState, string> = {
  'needs-coe-action': '#EF4444',
  'waiting-on-client': '#F59E0B',
  'on-track': '#10B981',
  'no-activity': '#6B7280',
  'escalated': '#F59E0B',
}

const STATE_BG: Record<PositionAttentionState, string> = {
  'needs-coe-action': '#FEF2F2',
  'waiting-on-client': '#FFFBEB',
  'on-track': '#ECFDF5',
  'no-activity': '#F3F4F6',
  'escalated': '#FFFBEB',
}

function buildStatBadge(state: PositionAttentionState, count: number): string {
  return `<span style="background-color:${STATE_BG[state]};color:${STATE_COLOR[state]};padding:2px 8px;border-radius:10px;font-weight:600;font-size:12px;">${STATE_EMOJI[state]} ${count}</span>`
}

export function generatePositionAttentionEmailHtml(report: PositionAttentionReport): { html: string; plainText: string } {
  const reportDate = new Date(report.generatedAt)
  const weekOf = getWeekOfDate(reportDate)
  const timestamp = formatEmailTimestamp(reportDate)
  const year = reportDate.getFullYear()

  // Build lead sections
  const leadSections = report.leadGroups.map(group => {
    // Only show positions that need action or are waiting
    const actionPositions = group.positions.filter(p =>
      p.attentionState === 'needs-coe-action' || p.attentionState === 'waiting-on-client' || p.attentionState === 'escalated'
    )
    if (actionPositions.length === 0 && group.needsAction === 0) return ''

    const positionCards = (actionPositions.length > 0 ? actionPositions : group.positions.slice(0, 5)).map(pos => {
      const stateColor = STATE_COLOR[pos.attentionState]
      const stateBg = STATE_BG[pos.attentionState]
      const stateLabel = STATE_LABEL[pos.attentionState]
      const stateEmoji = STATE_EMOJI[pos.attentionState]

      const summarySection = pos.summary ? `
        <tr>
          <td style="padding:10px 16px;background-color:#F5F3FF;border-left:3px solid #8B5CF6;border-radius:0 0 8px 8px;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#7C3AED;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:4px;">Position Assessment</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#4C1D95;line-height:1.5;">${escapeHtml(pos.summary)}</div>
          </td>
        </tr>` : ''

      return `
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:10px;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="padding:12px 16px;background-color:#FFFFFF;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1E293B;font-weight:600;padding-bottom:6px;">
                    <span style="color:#304FF3;font-weight:700;">#${pos.positionUpstreamId}</span>
                    &middot; ${escapeHtml(pos.account)}
                    &middot; ${escapeHtml(pos.mainSkill)}
                    &middot; <span style="color:#64748B;font-weight:400;">${pos.aging}d</span>
                    &middot; <span style="color:#64748B;font-weight:400;">${pos.candidatesPresented} cand.</span>
                  </td>
                </tr>
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;padding-bottom:4px;">
                    <span style="background-color:${stateBg};color:${stateColor};padding:2px 8px;border-radius:10px;font-weight:600;font-size:12px;">${stateEmoji} ${stateLabel}${pos.escalated ? ' (escalated)' : ''}</span>
                    ${pos.ballWith && pos.ballWith !== 'N/A' ? `<span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#3B82F6;margin-left:8px;">Ball with: ${escapeHtml(pos.ballWith)}</span>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${summarySection}
        </table>`
    }).join('')

    return `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0 10px 0;">
        <tr>
          <td style="border-bottom:2px solid #E2E8F0;padding-bottom:8px;">
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#1E293B;">${escapeHtml(group.leadName)}</span>
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#64748B;margin-left:8px;">${escapeHtml(group.coePractice)}</span>
            <span style="margin-left:12px;">
              ${group.needsAction > 0 ? buildStatBadge('needs-coe-action', group.needsAction) : ''}
              ${group.waitingOnClient > 0 ? `<span style="margin-left:4px;">${buildStatBadge('waiting-on-client', group.waitingOnClient)}</span>` : ''}
              ${group.onTrack > 0 ? `<span style="margin-left:4px;">${buildStatBadge('on-track', group.onTrack)}</span>` : ''}
            </span>
          </td>
        </tr>
      </table>
      ${positionCards}`
  }).filter(Boolean).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>COE Position Attention Report</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table cellpadding="0" cellspacing="0" border="0" width="680" style="max-width:680px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background-color:#191919;padding:32px 30px 28px 30px;border-radius:12px 12px 0 0;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <img src="data:image/svg+xml;base64,${USQ_LOGO_BASE64}" alt="Unosquare" width="160" height="100" style="display:block;margin-bottom:16px;" />
                  </td>
                </tr>
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#FFFFFF;padding-bottom:4px;">
                    &#127919; COE Position Attention Report
                  </td>
                </tr>
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#94A3B8;">
                    Week of ${escapeHtml(weekOf)}
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:12px;">
                    <div style="height:3px;width:60px;background-color:#10B981;border-radius:2px;"></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background-color:#F8FAFC;padding:24px 30px 32px 30px;">

              <!-- Summary Stats -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:14px 12px;background-color:#FFFFFF;" width="20%" align="center">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#64748B;margin-bottom:4px;">Total</div>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#1E293B;">${report.totalPositions}</div>
                  </td>
                  <td style="padding:14px 12px;background-color:#FFFFFF;border-left:1px solid #E2E8F0;" width="20%" align="center">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#EF4444;margin-bottom:4px;">&#128308; Action</div>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#EF4444;">${report.needsAction}</div>
                  </td>
                  <td style="padding:14px 12px;background-color:#FFFFFF;border-left:1px solid #E2E8F0;" width="20%" align="center">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#F59E0B;margin-bottom:4px;">&#128993; Waiting</div>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#F59E0B;">${report.waitingOnClient}</div>
                  </td>
                  <td style="padding:14px 12px;background-color:#FFFFFF;border-left:1px solid #E2E8F0;" width="20%" align="center">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#10B981;margin-bottom:4px;">&#128994; On Track</div>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#10B981;">${report.onTrack}</div>
                  </td>
                  <td style="padding:14px 12px;background-color:#FFFFFF;border-left:1px solid #E2E8F0;" width="20%" align="center">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#6B7280;margin-bottom:4px;">&#9898; Inactive</div>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#6B7280;">${report.noActivity}</div>
                  </td>
                </tr>
              </table>

              <!-- Lead Breakdown -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:8px;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
                <tr>
                  <td colspan="5" style="padding:12px 16px;background-color:#F8FAFC;border-bottom:1px solid #E2E8F0;">
                    <span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#475569;">Lead Breakdown</span>
                  </td>
                </tr>
                <tr style="background-color:#F1F5F9;">
                  <td style="padding:6px 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;color:#475569;">Lead</td>
                  <td style="padding:6px 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;color:#475569;text-align:center;">Total</td>
                  <td style="padding:6px 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;color:#EF4444;text-align:center;">Action</td>
                  <td style="padding:6px 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;color:#F59E0B;text-align:center;">Waiting</td>
                  <td style="padding:6px 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;color:#10B981;text-align:center;">On Track</td>
                </tr>
                ${report.leadGroups.map(g => `
                <tr>
                  <td style="padding:8px 12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1E293B;border-top:1px solid #E2E8F0;">&#128100; ${escapeHtml(g.leadName)}</td>
                  <td style="padding:8px 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1E293B;text-align:center;border-top:1px solid #E2E8F0;font-weight:600;">${g.totalPositions}</td>
                  <td style="padding:8px 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#EF4444;text-align:center;border-top:1px solid #E2E8F0;font-weight:600;">${g.needsAction || '-'}</td>
                  <td style="padding:8px 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#F59E0B;text-align:center;border-top:1px solid #E2E8F0;font-weight:600;">${g.waitingOnClient || '-'}</td>
                  <td style="padding:8px 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#10B981;text-align:center;border-top:1px solid #E2E8F0;font-weight:600;">${g.onTrack || '-'}</td>
                </tr>`).join('')}
              </table>

              <!-- Position details by lead -->
              ${leadSections}

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#E2E8F0;padding:24px 30px;border-radius:0 0 12px 12px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#475569;padding-bottom:4px;">
                    &copy; ${year} Unosquare, Inc.
                  </td>
                </tr>
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#64748B;padding-bottom:2px;">
                    Generated by COE Nexus &middot; ${escapeHtml(timestamp)}
                  </td>
                </tr>
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#94A3B8;">
                    AI-classified attention states. Data reflects active positions at time of generation.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  // ── Plain text fallback ──
  const divider = '═'.repeat(50)
  const leadBreakdownText = report.leadGroups.map(g =>
    `  • ${g.leadName}: ${g.totalPositions} total (🔴${g.needsAction} 🟡${g.waitingOnClient} 🟢${g.onTrack} ⚪${g.noActivity})`
  ).join('\n')

  const leadSectionsText = report.leadGroups.map(group => {
    const actionPositions = group.positions.filter(p =>
      p.attentionState === 'needs-coe-action' || p.attentionState === 'waiting-on-client' || p.attentionState === 'escalated'
    )
    if (actionPositions.length === 0 && group.needsAction === 0) return ''
    const posText = (actionPositions.length > 0 ? actionPositions : group.positions.slice(0, 5)).map(pos => {
      const lines = [
        `  #${pos.positionUpstreamId} · ${pos.account} · ${pos.mainSkill} · ${pos.aging}d · ${pos.candidatesPresented} cand.`,
        `  ${STATE_LABEL[pos.attentionState]}${pos.escalated ? ' (escalated)' : ''} · Ball with: ${pos.ballWith}`,
      ]
      if (pos.summary) lines.push(`  Position Assessment: ${pos.summary}`)
      return lines.join('\n')
    }).join('\n\n')
    return `\n--- ${group.leadName} (${group.coePractice}) ---\n    🔴${group.needsAction} 🟡${group.waitingOnClient} 🟢${group.onTrack} ⚪${group.noActivity}\n\n${posText}`
  }).filter(Boolean).join('\n')

  const plainText = `🎯 COE Position Attention Report — Week of ${weekOf}
${divider}

Summary: ${report.totalPositions} positions · 🔴${report.needsAction} need action · 🟡${report.waitingOnClient} waiting · 🟢${report.onTrack} on track · ⚪${report.noActivity} no activity

Lead Breakdown:
${leadBreakdownText}
${leadSectionsText}

${divider}
Generated by COE Nexus · ${timestamp}
AI-classified attention states. Data reflects active positions at time of generation.`

  return { html, plainText }
}
