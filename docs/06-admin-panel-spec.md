---
title: Admin Panel Specification
status: specification
audience: [ai-agent, developer]
depends_on: [02-data-model, 07-auth-and-tenancy]
blocks: [admin-ui implementation]
compatibility: n/a
---

# Admin Panel Specification — Filament → shadcn-vue

Complete inventory of the legacy Filament v4 admin at `/admin`. Reimplement with **shadcn-vue** in Nuxt 4.

Source: `laracap-live-update/app/Filament/`

## Panel Configuration

| Setting | Legacy value | Nuxt target |
|---------|--------------|-------------|
| Path | `/admin` | `/admin` |
| Panel ID | `admin` | — |
| Primary color | Amber | shadcn theme primary |
| Login | Enabled | `/admin/login` |
| Registration | Enabled | `/admin/register` |
| Default redirect | `/` → admin login | same |

### Admin-only: Sync Update

Legacy menu item **Sync Update** → `GET /admin/sync-update`:

- Visible when `user.is_admin`
- Runs `git pull origin main` + `migrate --force`
- Shows loading overlay via Alpine `sync-started` event

**Nuxt replacement:** Cloudflare auto-deploy; optional admin "Redeploy" webhook button.

## Admin Routes

| Method | URI | Nuxt page |
|--------|-----|-----------|
| GET | `/admin` | `pages/admin/index.vue` (dashboard) |
| GET | `/admin/login` | `pages/admin/login.vue` |
| GET | `/admin/register` | `pages/admin/register.vue` |
| GET | `/admin/applications` | `pages/admin/applications/index.vue` |
| GET | `/admin/applications/{uuid}` | `pages/admin/applications/[uuid].vue` |
| GET | `/admin/bundles` | `pages/admin/bundles/index.vue` |
| GET | `/admin/bundles/create` | `pages/admin/bundles/create.vue` |
| GET | `/admin/bundles/{id}/edit` | `pages/admin/bundles/[id]/edit.vue` |
| GET | `/admin/channels` | `pages/admin/channels/index.vue` |
| GET | `/admin/devices` | `pages/admin/devices/index.vue` |
| GET | `/admin/users` | `pages/admin/users/index.vue` (admin only) |
| GET | `/admin/users/create` | `pages/admin/users/create.vue` |
| GET | `/admin/api-tokens` | `pages/admin/settings/tokens.vue` |

**Note:** Application create/edit uses **modals on list page** in Filament — orphan `CreateApplication`/`EditApplication` page classes exist but are not registered.

## Navigation

| Group | Resource | Icon (Heroicon) | Sort |
|-------|----------|-----------------|------|
| Main | Applications | squares-2x2 | default |
| Main | Bundles | cube | default |
| Main | Channels | signal | default |
| Main | Devices | device-phone-mobile | default |
| Settings | Users | user-circle | 10 |
| Settings | API Tokens | key | 10 |

## Authorization Scoping

No Laravel Policies. Replicate query scoping:

| Resource | Admin (`is_admin`) | Non-admin |
|----------|-------------------|-----------|
| Applications | All | `where user_id = auth.id` |
| Bundles | All | `whereHas application.user_id = auth.id`, order `created_at desc` |
| Channels | All | `whereHas application.user_id = auth.id` |
| Devices | All | `whereHas bundle.application.user_id = auth.id`, order `last_active_at desc` |
| API Tokens | All | `where tokenable_id = auth.id` |
| Users | Visible | **Hidden** (`canViewAny` false) |

**Quirk:** Relationship dropdowns on Bundle/Channel forms always filter applications to `auth.id` even for admins.

---

## ApplicationResource

**Model:** Application  
**Route key:** UUID on view page

### Form (modal create/edit)

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| name | TextInput | Yes | max 255 | |
| slug | TextInput | Yes | max 255, unique | |
| description | Textarea | No | max 255 | full width |
| bundle_limit | Number | No | min 1 | Label: "Bundle Retention Limit". Helper: "Number of bundles to keep. Oldest will be deleted when this limit is reached. Leave empty for no limit." |

Create mutation: set `user_id = auth.id`.

### View page (infolist)

| Field | Display |
|-------|---------|
| uuid | Label "Application ID", copyable, toast "Application ID copied" |
| name | "Application Name" |
| slug | "URL Slug" |
| user.name | "Created By" |
| description | Markdown, full width |
| bundles | Repeatable: download link (icon), name as "Version", created_at |

### Table columns

| Column | Searchable | Notes |
|--------|------------|-------|
| name | Yes | |
| slug | No | |
| user.name | No | |
| bundle_limit | No | Badge: red if set, gray "Unlimited" if null |
| bundles_count | No | Info badge |
| channels_count | No | Success badge |

### Actions

| Scope | Actions |
|-------|---------|
| Row | copy_id (clipboard uuid), View, Edit modal, Delete |
| Bulk | Delete selected |
| Header | Create |

---

## BundleResource

**Pages:** List, Create, Edit

### Form

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| application_id | Select | Yes | exists | Relationship; scoped to auth user's apps; live/reactive |
| channel_id | Select | No | — | Filtered by selected application_id |
| name | TextInput | Yes | max 255 | Placeholder `v1.0.0`, hint "This is the version of the bundle" |
| description | Textarea | No | max 255 | |
| file_path | FileUpload | Yes | max **10 MB** | Disk public, dir `bundles`, no MIME restriction |

**Fieldset: Android Version Code** (3 columns)

| Field | Label | Validation | Helper |
|-------|-------|------------|--------|
| android_min_version_code | Minimum | numeric min 0 | |
| android_max_version_code | Maximum | numeric min 0 | |
| android_eq_version_code | Exclude (equal) | numeric min 0 | "Devices with this exact versionCode will not receive this bundle." |

**Fieldset: iOS Build Number** (3 columns)

| Field | Label | Validation | Helper |
|-------|-------|------------|--------|
| ios_min_version_code | Minimum | numeric min 0 | |
| ios_max_version_code | Maximum | numeric min 0 | |
| ios_eq_version_code | Exclude (equal) | numeric min 0 | "Devices with this exact CFBundleVersion will not receive this bundle." |

**Create/Edit hook:** compute `size = filesize(storage_path('app/public/' + file_path))`

### Table columns

| Column | Sortable | Searchable | Notes |
|--------|----------|------------|-------|
| channel.name | Yes | Yes | Label "Channel" |
| created_at | No | No | dateTime |
| size | Yes | No | Formatted KB/MB |
| file_path | No | No | Download icon → `asset('storage/' + path)` |
| name | No | No | |
| version_constraints | No | No | Computed: "Android: X–Y" / "iOS: X–Y" / "Unconstrained" |

### Filters

| Filter | Type | Notes |
|--------|------|-------|
| application_id | Select | User's apps, searchable |
| channel_id | Select | Searchable |
| created_at | Select | today / week / month / year |

### Actions

| Scope | Actions |
|-------|---------|
| Row | Edit, Delete |
| Bulk | Delete selected |
| List header | Create |
| Edit header | Delete |

---

## ChannelResource

**Page:** ManageChannels (single list with inline CRUD)

### Form

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| application_id | Select | Yes | — | Scoped to auth user's apps, full width |
| name | TextInput | Yes | max 255 | Placeholder "e.g. Production, Beta, Internal" |

### Table

| Column | Notes |
|--------|-------|
| name | Searchable, bold |
| application.name | Searchable |
| bundles_count | Sortable |
| created_at | Hidden by default, sortable |

### Filters

- application_id Select (user's apps)

### Actions

Create header; row Edit/Delete; bulk Delete.

---

## DeviceResource

**Read-only fleet view.** `canCreate: false`.

### Table columns

| Column | Label | Searchable | Toggleable | Notes |
|--------|-------|------------|------------|-------|
| device_identifier | Device UUID | Yes | default | Copyable, limit 12 chars display |
| platform | — | Yes | default | Badge: ios=gray, android=success, web=info |
| bundle.application.name | Application | Yes | default | |
| latestLog.ip_address | IP | Yes | yes | |
| location | Location | No | yes | Computed city/country or "Unknown" |
| os_version | OS / Model | No | yes | From UA or log fields |
| last_active_at | — | No | default | dateTime + relative |
| bundle.name | Current Bundle | Yes | default | |
| created_at | — | No | hidden default | |

### Filters

application, channel, platform (ios/android/web), bundle_id

### Actions

Row Delete only; bulk Delete; no header actions.

---

## ApiTokenResource

**Model label:** "API Token"

### Form

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | TextInput | Yes | max 255 |
| never_expires | Toggle | No | Default true, reactive, **not saved to DB** |
| expires_at | DateTimePicker | Conditional | Hidden when never_expires; min = now + 1 minute |

### Create logic

```php
$token = Auth::user()->createToken($name, ['*'], $expiresAt);
$token->accessToken->plain_text_token = $token->plainTextToken;
$token->accessToken->save();
```

### Table

| Column | Admin only | Notes |
|--------|--------------|-------|
| name | No | Searchable, bold |
| tokenable.name | **Yes** | Label "User" |
| plain_text_token | No | Copyable, mono font, truncated |
| created_at | No | Relative description |
| last_used_at | No | Placeholder "Never" |
| expires_at | No | Placeholder "Never"; danger if past |

### Filters

- tokenable_id (admin only) — User select
- expired — Ternary: expired / active / all

### Actions

Copy (Alpine), Revoke (Delete modal "Revoke Token"), bulk "Revoke Selected"

**Nuxt fix:** Show plain token once on create; store hash only in DB.

---

## UserResource

**Admin only:** `canViewAny()` returns `is_admin`.

### Form

| Field | Required | max 255 |
|-------|----------|---------|
| name | Yes | |
| email | Yes | email type |
| password | Yes | revealable |
| password_confirmation | Yes | revealable |

**Do not replicate** broken `afterCreate()` tenant attach.

### Table

name, email, created_at (format `d-m-Y H:i`)

### Actions

Create header; row Edit modal, Delete; bulk Delete.

---

## Dashboard Widgets

Auto-discovered on Filament dashboard. Reimplement as Vue components on `/admin`.

### StatsOverview

| Stat | Query | Admin scope | Icon/color |
|------|-------|-------------|------------|
| Applications | count | admin: all; user: own | success, squares |
| Channels | count | admin: all; user: via application | signal |
| Active Devices | count | admin: all; user: via bundle.application | info, phone |
| Bundle Sizes | sum size | **Always own user only** (even admin) | info, cpu |
| Total Users | count | **Admin only** | primary, user |

### ActiveUsersChart (sort 2)

- Type: filled line chart
- Heading: "Daily Active Users (Daily Unique)"
- Data: last 30 days, `DeviceLog` distinct `device_id` per day
- Scope: non-admin via `application.user_id`

### PlatformDistributionChart (sort 3)

- Type: doughnut
- Heading: "Platform Distribution"
- Data: `Device` group by platform → iOS/Android/Web
- Colors: iOS `#94a3b8`, Android `#22c55e`, Web `#3b82f6`

### DeviceLocationChart (sort 3)

- Type: horizontal bar
- Heading: "Top 10 Device Locations (Logs)"
- Data: `DeviceLog` group by city/country, distinct devices, top 10

### BundlesChart (sort 4)

- Type: filled line
- Heading: "Recent Bundle Uploads"
- Data: last 12 months upload counts by month

---

## Filament v4 API Notes

Resources use `Filament\Schemas\Schema` (not legacy `Form` namespace). Table actions from `Filament\Actions\*`. Match UX patterns, not PHP APIs, in Nuxt.

## shadcn Component Mapping (Suggested)

| Filament pattern | shadcn-vue |
|------------------|------------|
| TextInput | Input |
| Textarea | Textarea |
| Select | Select / Combobox |
| FileUpload | custom dropzone + R2 upload |
| Toggle | Switch |
| DateTimePicker | Calendar + time picker |
| Table | DataTable |
| Badge | Badge |
| ActionGroup | DropdownMenu |
| Modal forms | Dialog |
| Infolist | DescriptionList / Card |
| Charts | Chart.js or similar via shadcn chart wrapper |
