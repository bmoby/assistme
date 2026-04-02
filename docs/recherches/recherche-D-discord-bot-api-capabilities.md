# Discord Bot API Capabilities -- Exhaustive Reference (discord.js v14)

> Research document for the Vibe Coder project. Covers everything Discord's API exposes to bots, with discord.js v14 class/method names, constraints, and practical usage notes.
> Last updated: March 2026. Based on Discord API v10, discord.js 14.25.1.

---

## Table of Contents

1. [Message Components (Legacy v1)](#1-message-components-legacy-v1)
2. [Components V2 (New System -- April 2025)](#2-components-v2-new-system)
3. [Rich Embeds](#3-rich-embeds)
4. [Slash Commands & Context Menus](#4-slash-commands--context-menus)
5. [Threads & Forums](#5-threads--forums)
6. [Interactions & Responses](#6-interactions--responses)
7. [Reactions & Emojis](#7-reactions--emojis)
8. [Voice & Audio](#8-voice--audio)
9. [Scheduled Events](#9-scheduled-events)
10. [Permissions & Roles](#10-permissions--roles)
11. [Rich Presence & Activities](#11-rich-presence--activities)
12. [Webhooks](#12-webhooks)
13. [File & Media](#13-file--media)
14. [Channel Types & Features](#14-channel-types--features)
15. [Onboarding & Welcome](#15-onboarding--welcome)
16. [Polls](#16-polls)
17. [Premium / Monetization](#17-premium--monetization)
18. [Auto Moderation](#18-auto-moderation)
19. [Audit Log](#19-audit-log)
20. [Rate Limits & Constraints](#20-rate-limits--constraints)
21. [Markdown & Formatting](#21-markdown--formatting)
22. [Soundboard](#22-soundboard)
23. [Gateway Intents & Events](#23-gateway-intents--events)
24. [New & Recent Features (2024-2026)](#24-new--recent-features-2024-2026)

---

## 1. Message Components (Legacy v1)

Message components are interactive UI elements attached to messages. They live inside **Action Rows**.

### 1.1 Action Rows

An Action Row is a layout container (type `1`). It holds interactive components in a single horizontal row.

| Constraint                      | Value                   |
| ------------------------------- | ----------------------- |
| Max Action Rows per message     | 5                       |
| Max Buttons per Action Row      | 5                       |
| Max Select Menus per Action Row | 1                       |
| Mixing Buttons + Select Menu    | NOT allowed in same row |

**discord.js**: `ActionRowBuilder<ButtonBuilder>` or `ActionRowBuilder<StringSelectMenuBuilder>`.

```typescript
import { ActionRowBuilder, ButtonBuilder } from "discord.js";

const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
  button1,
  button2,
);
```

### 1.2 Buttons (type 2)

Clickable elements that send an interaction back to the bot (or navigate to a URL).

**All Button Styles:**

| Style     | Value | Enum                    | Color                | Requires    |
| --------- | ----- | ----------------------- | -------------------- | ----------- |
| Primary   | 1     | `ButtonStyle.Primary`   | Blurple              | `custom_id` |
| Secondary | 2     | `ButtonStyle.Secondary` | Grey                 | `custom_id` |
| Success   | 3     | `ButtonStyle.Success`   | Green                | `custom_id` |
| Danger    | 4     | `ButtonStyle.Danger`    | Red                  | `custom_id` |
| Link      | 5     | `ButtonStyle.Link`      | Grey + external icon | `url`       |
| Premium   | 6     | `ButtonStyle.Premium`   | Special              | `sku_id`    |

**Button Constraints:**

- `label`: max 80 characters (visually truncates around 34-38 chars)
- `custom_id`: 1-100 characters, must be unique within the message
- `url`: max 512 characters (Link buttons only)
- `emoji`: partial emoji object (name, id, animated)
- `disabled`: boolean, defaults false
- Premium buttons cannot have `custom_id` or `label` -- only `sku_id`

**discord.js:**

```typescript
import { ButtonBuilder, ButtonStyle } from "discord.js";

const button = new ButtonBuilder()
  .setCustomId("quiz_answer_1")
  .setLabel("Answer A")
  .setStyle(ButtonStyle.Primary)
  .setEmoji("1️⃣")
  .setDisabled(false);
```

### 1.3 Select Menus

Dropdown components that let users pick one or more options.

**Select Menu Types:**

| Type               | Value | Class (discord.js)             | Description                       |
| ------------------ | ----- | ------------------------------ | --------------------------------- |
| String Select      | 3     | `StringSelectMenuBuilder`      | Developer-defined text options    |
| User Select        | 5     | `UserSelectMenuBuilder`        | Auto-populated with server users  |
| Role Select        | 6     | `RoleSelectMenuBuilder`        | Auto-populated with server roles  |
| Mentionable Select | 7     | `MentionableSelectMenuBuilder` | Auto-populated with users + roles |
| Channel Select     | 8     | `ChannelSelectMenuBuilder`     | Auto-populated with channels      |

**Shared Select Menu Constraints:**

- `custom_id`: 1-100 characters
- `placeholder`: max 150 characters
- `min_values`: 0-25 (default 1)
- `max_values`: max 25 (default 1)
- `disabled`: boolean (message only)

**String Select Specifics:**

- `options` array: max 25 items
- Each option: `label` (max 100), `value` (max 100), `description` (max 100), optional `emoji`, optional `default` boolean

**Channel Select Specifics:**

- `channel_types` array to filter by channel type (e.g., only text channels)

**Auto-populated Selects:**

- `default_values` array with `{ id, type }` objects for pre-selection

**discord.js:**

```typescript
import {
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

const select = new StringSelectMenuBuilder()
  .setCustomId("quiz_session")
  .setPlaceholder("Choose a session")
  .setMinValues(1)
  .setMaxValues(1)
  .addOptions(
    new StringSelectMenuOptionBuilder()
      .setLabel("Session 1")
      .setValue("session_01")
      .setDescription("Introduction to programming")
      .setEmoji("📚"),
  );
```

### 1.4 Modals (type 9 response)

Modals are popup forms triggered as an interaction response. They cannot be sent proactively -- they must be a response to a button click, select menu change, or slash command.

**Modal Constraints:**

- `custom_id`: 1-100 characters
- `title`: max 45 characters
- Components: 1-5 components (Action Rows containing Text Inputs, or Labels in V2)
- Modal-only components: TextInput, Label, StringSelect, UserSelect, RoleSelect, MentionableSelect, ChannelSelect, TextDisplay, FileUpload, RadioGroup, CheckboxGroup, Checkbox (see Components V2 section for new modal components)

**Text Input (type 4):**

| Field         | Constraint                                                   |
| ------------- | ------------------------------------------------------------ |
| `custom_id`   | 1-100 chars                                                  |
| `style`       | `TextInputStyle.Short` (1) or `TextInputStyle.Paragraph` (2) |
| `label`       | max 45 characters                                            |
| `min_length`  | 0-4000                                                       |
| `max_length`  | 1-4000                                                       |
| `required`    | boolean, default true                                        |
| `value`       | pre-filled, max 4000 chars                                   |
| `placeholder` | max 100 chars                                                |

**discord.js:**

```typescript
import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";

const modal = new ModalBuilder()
  .setCustomId("feedback_modal")
  .setTitle("Submit Feedback");

const textInput = new TextInputBuilder()
  .setCustomId("feedback_text")
  .setLabel("Your feedback")
  .setStyle(TextInputStyle.Paragraph)
  .setMinLength(10)
  .setMaxLength(1000)
  .setRequired(true);

const row = new ActionRowBuilder<TextInputBuilder>().addComponents(textInput);
modal.addComponents(row);

// Show modal in response to interaction
await interaction.showModal(modal);
```

---

## 2. Components V2 (New System)

Launched April 2025. A fundamentally new layout system that replaces embeds with composable component trees. Requires the `IS_COMPONENTS_V2` message flag (`1 << 15` = 32768).

### 2.1 Activation & Breaking Behavior

When `IS_COMPONENTS_V2` flag is set on a message:

- `content` field is DISABLED -- use TextDisplay instead
- `embeds` are DISABLED -- use Container/Section/TextDisplay instead
- Polls and stickers are DISABLED
- Attachments must be explicitly exposed via File or MediaGallery
- Component limit increases to **40 total** (nested components count)
- The flag CANNOT be removed once set on a message

### 2.2 New Component Types

| Type          | Value | Category    | Where          |
| ------------- | ----- | ----------- | -------------- |
| Section       | 9     | Layout      | Message        |
| TextDisplay   | 10    | Content     | Message, Modal |
| Thumbnail     | 11    | Content     | Message        |
| MediaGallery  | 12    | Content     | Message        |
| File          | 13    | Content     | Message        |
| Separator     | 14    | Layout      | Message        |
| Container     | 17    | Layout      | Message        |
| Label         | 18    | Layout      | Modal          |
| FileUpload    | 19    | Interactive | Modal          |
| RadioGroup    | 21    | Interactive | Modal          |
| CheckboxGroup | 22    | Interactive | Modal          |
| Checkbox      | 23    | Interactive | Modal          |

### 2.3 Container (type 17)

Groups child components in a visually distinct rounded box with optional accent color (like an embed sidebar).

- Can hold ANY message-level components (recursive nesting allowed)
- Optional `accent_color` for left border
- Sits at message root level

**Practical use:** Replace embeds with Containers for richer, more flexible layouts.

### 2.4 Section (type 9)

Organizes text alongside an accessory component (button or thumbnail). Like a mini embed row.

- Contains 1-3 TextDisplay children in `components` array
- One `accessory`: Button OR Thumbnail
- Message only

### 2.5 TextDisplay (type 10)

Renders markdown-formatted text. Replaces `content` field and embed `description`.

- `content` field supports full markdown, mentions, custom emoji
- Mentions follow `allowed_mentions` configuration
- Available in messages AND modals

### 2.6 Thumbnail (type 11)

Small image component for accessories.

- `media`: URL or attachment reference
- `description`: alt text, max 1024 chars
- `spoiler`: boolean
- Images only (no video), animated GIF/WEBP supported

### 2.7 MediaGallery (type 12)

Grid display for images and videos.

- `items` array: 1-10 media items
- Each item: URL/attachment, optional description, optional spoiler flag
- Message only

### 2.8 File (type 13)

Displays non-image/non-video attachments.

- `file_id`: snowflake matching an attachment ID
- Message only

### 2.9 Separator (type 14)

Visual divider between components.

- Optional `spacing` control
- Optional `divider` boolean for visible line
- Message only

### 2.10 Label (type 18) -- Modal

Wraps interactive components with a label and description. Replaces Action Row + TextInput pattern in modals.

- `label`: required text
- `description`: optional text
- `component`: one interactive element (TextInput, Select, FileUpload)

### 2.11 New Modal Components (Aug-Oct 2025)

- **StringSelect in modals**: Full dropdown support
- **UserSelect, RoleSelect, MentionableSelect, ChannelSelect in modals**
- **FileUpload (type 19)**: Upload 0-10 files in a modal
- **RadioGroup (type 21)**: Single-choice option set
- **CheckboxGroup (type 22)**: Multi-select checkboxes
- **Checkbox (type 23)**: Single yes/no checkbox

### 2.12 Nesting Rules Summary

| Parent       | Allowed Children                                                                     |
| ------------ | ------------------------------------------------------------------------------------ |
| Message root | ActionRow, Section, TextDisplay, Thumbnail, MediaGallery, File, Separator, Container |
| ActionRow    | Up to 5 Buttons OR 1 Select Menu                                                     |
| Section      | TextDisplay (1-3) + accessory (Button or Thumbnail)                                  |
| Container    | Any message-level components (recursive)                                             |
| Modal root   | Label, TextDisplay                                                                   |
| Label        | One interactive component                                                            |

**discord.js:** As of v14.25.1, Components V2 builders are being added progressively. Check the latest discord.js docs for `ContainerBuilder`, `SectionBuilder`, `TextDisplayBuilder`, etc. You can also use raw component objects:

```typescript
await interaction.reply({
  flags: 1 << 15, // IS_COMPONENTS_V2
  components: [
    {
      type: 17, // Container
      accent_color: 0x5865f2,
      components: [
        { type: 10, content: "## Quiz Results\nHere are your scores:" },
        { type: 14, spacing: 1, divider: true },
        {
          type: 9, // Section
          components: [{ type: 10, content: "**Score:** 8/10" }],
          accessory: { type: 11, media: { url: "attachment://trophy.png" } },
        },
      ],
    },
  ],
});
```

---

## 3. Rich Embeds

The classic way to display structured, visually rich content in messages. Still fully supported even with Components V2 available (just not in the same message).

### 3.1 Embed Object Fields

| Field             | Type    | Limit      | Description                     |
| ----------------- | ------- | ---------- | ------------------------------- |
| `title`           | string  | 256 chars  | Clickable if URL set            |
| `description`     | string  | 4096 chars | Main content, supports markdown |
| `url`             | string  | --         | Makes title a hyperlink         |
| `color`           | integer | --         | Sidebar color (decimal or hex)  |
| `timestamp`       | ISO8601 | --         | Displayed in user's timezone    |
| `footer.text`     | string  | 2048 chars | Bottom text                     |
| `footer.icon_url` | string  | --         | Small icon next to footer       |
| `image.url`       | string  | --         | Large image at bottom           |
| `thumbnail.url`   | string  | --         | Small image top-right           |
| `author.name`     | string  | 256 chars  | Top text                        |
| `author.url`      | string  | --         | Clickable author name           |
| `author.icon_url` | string  | --         | Small icon next to author       |
| `fields`          | array   | max 25     | Inline-capable key-value pairs  |
| `fields[].name`   | string  | 256 chars  | Field title (required)          |
| `fields[].value`  | string  | 1024 chars | Field content (required)        |
| `fields[].inline` | boolean | --         | Display side-by-side (up to 3)  |

### 3.2 Aggregate Limits

| Constraint                                      | Limit                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Total characters per embed                      | 6000 (sum of title + description + field names + field values + footer text + author name) |
| Embeds per message                              | 10                                                                                         |
| Fields per embed                                | 25                                                                                         |
| Total characters across ALL embeds in a message | 6000                                                                                       |

### 3.3 Unmodifiable Fields

Bots cannot set: `type` (always `rich`), `provider`, `video`, image `height`/`width`/`proxy_url`.

### 3.4 discord.js EmbedBuilder

```typescript
import { EmbedBuilder } from "discord.js";

const embed = new EmbedBuilder()
  .setColor(0x00ff00) // Green sidebar
  .setTitle("Quiz Results")
  .setURL("https://example.com")
  .setAuthor({ name: "Quiz Bot", iconURL: "...", url: "..." })
  .setDescription("Here are the results for **Session 3**")
  .setThumbnail("https://...") // Small top-right image
  .addFields(
    { name: "Score", value: "8/10", inline: true },
    { name: "Rank", value: "#3", inline: true },
    { name: "Time", value: "4m 32s", inline: true },
    { name: "\u200B", value: "\u200B" }, // Blank spacer field
    { name: "Details", value: "Questions 2 and 7 were wrong." },
  )
  .setImage("https://...") // Large bottom image
  .setTimestamp() // Current time
  .setFooter({ text: "Quiz v1.0", iconURL: "..." });

await interaction.reply({ embeds: [embed] });
```

### 3.5 Attaching Local Images in Embeds

```typescript
import { AttachmentBuilder, EmbedBuilder } from "discord.js";

const file = new AttachmentBuilder("./chart.png");
const embed = new EmbedBuilder().setImage("attachment://chart.png"); // Reference by filename

await interaction.reply({ embeds: [embed], files: [file] });
```

### 3.6 Multiple Embeds

```typescript
await channel.send({ embeds: [embed1, embed2, embed3] }); // Up to 10
```

---

## 4. Slash Commands & Context Menus

### 4.1 Command Types

| Type                | Value | Description            | discord.js Builder          |
| ------------------- | ----- | ---------------------- | --------------------------- |
| CHAT_INPUT          | 1     | `/command` in chat     | `SlashCommandBuilder`       |
| USER                | 2     | Right-click on user    | `ContextMenuCommandBuilder` |
| MESSAGE             | 3     | Right-click on message | `ContextMenuCommandBuilder` |
| PRIMARY_ENTRY_POINT | 4     | Activity launcher      | --                          |

### 4.2 Command Limits

| Constraint                       | Limit                             |
| -------------------------------- | --------------------------------- |
| Global CHAT_INPUT commands       | 100                               |
| Global USER commands             | 15 (increased from 5, March 2026) |
| Global MESSAGE commands          | 15 (increased from 5, March 2026) |
| Guild CHAT_INPUT commands        | 100 per guild                     |
| Guild USER commands              | 15 per guild                      |
| Guild MESSAGE commands           | 15 per guild                      |
| Options per command              | 25                                |
| Choices per option               | 25                                |
| Command name length              | 1-32 chars                        |
| Command description length       | 1-100 chars                       |
| Combined name+description+values | 8000 chars per command            |
| Command creation rate limit      | 200 per day per guild             |

### 4.3 Option Types

| Type              | Value | Description        | Special Fields                                                          |
| ----------------- | ----- | ------------------ | ----------------------------------------------------------------------- |
| SUB_COMMAND       | 1     | Subcommand         | --                                                                      |
| SUB_COMMAND_GROUP | 2     | Groups subcommands | --                                                                      |
| STRING            | 3     | Text input         | `min_length` (0-6000), `max_length` (1-6000), `autocomplete`, `choices` |
| INTEGER           | 4     | Whole number       | `min_value`, `max_value`, `autocomplete`, `choices`                     |
| BOOLEAN           | 5     | True/false         | --                                                                      |
| USER              | 6     | User picker        | Resolves to user object                                                 |
| CHANNEL           | 7     | Channel picker     | `channel_types` filter array                                            |
| ROLE              | 8     | Role picker        | Resolves to role object                                                 |
| MENTIONABLE       | 9     | User or role       | --                                                                      |
| NUMBER            | 10    | Decimal number     | `min_value`, `max_value`, `autocomplete`, `choices`                     |
| ATTACHMENT        | 11    | File upload        | Resolves to attachment object                                           |

### 4.4 Subcommands & Subcommand Groups

Structure: `command` > `subcommand_group` (optional) > `subcommand`

- Only ONE level of nesting within a group
- Using subcommands makes the base command unusable
- Cannot mix subcommands and subcommand groups freely

```typescript
import { SlashCommandBuilder } from "discord.js";

const command = new SlashCommandBuilder()
  .setName("quiz")
  .setDescription("Quiz management")
  .addSubcommandGroup((group) =>
    group
      .setName("admin")
      .setDescription("Admin commands")
      .addSubcommand((sub) =>
        sub
          .setName("create")
          .setDescription("Create a quiz")
          .addStringOption((opt) =>
            opt
              .setName("session")
              .setDescription("Session number")
              .setRequired(true),
          ),
      ),
  )
  .addSubcommand((sub) => sub.setName("start").setDescription("Start a quiz"));
```

### 4.5 Autocomplete

Available for STRING, INTEGER, NUMBER option types. Sends partial user input to the bot for dynamic suggestions.

- Cannot coexist with static `choices` on the same option
- Suggestions are NOT enforced -- user can type anything
- Max 25 autocomplete choices returned
- Handle via `interaction.isAutocomplete()` check

```typescript
// Registration
.addStringOption(opt =>
  opt.setName('session')
    .setDescription('Session to quiz')
    .setAutocomplete(true)
)

// Handler
if (interaction.isAutocomplete()) {
  const focused = interaction.options.getFocused();
  const filtered = sessions.filter(s => s.name.startsWith(focused));
  await interaction.respond(
    filtered.slice(0, 25).map(s => ({ name: s.name, value: s.id }))
  );
}
```

### 4.6 Context Menu Commands

- No options/arguments allowed
- No description field (set empty string)
- USER: appears when right-clicking a user, returns target user
- MESSAGE: appears when right-clicking a message, returns target message
- Allow mixed case and spaces in names (unlike slash commands)

```typescript
import { ContextMenuCommandBuilder, ApplicationCommandType } from "discord.js";

const userCommand = new ContextMenuCommandBuilder()
  .setName("View Student Profile")
  .setType(ApplicationCommandType.User);

const messageCommand = new ContextMenuCommandBuilder()
  .setName("Report Message")
  .setType(ApplicationCommandType.Message);
```

### 4.7 Localization

Commands support multi-language names and descriptions:

```typescript
command.setNameLocalizations({
  ru: "квиз",
  fr: "quiz",
});
command.setDescriptionLocalizations({
  ru: "Управление квизами",
  fr: "Gestion des quiz",
});
```

Fallback chain: en-US <-> en-GB, es-419 -> es-ES.

### 4.8 Default Permissions

```typescript
command.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
// Set to '0' to restrict to admins only by default
command.setDefaultMemberPermissions(0n);
```

### 4.9 NSFW / Age-Restricted Commands

```typescript
command.setNSFW(true); // Only visible in age-restricted channels/DMs
```

### 4.10 Interaction Contexts

Control where commands appear:

```typescript
command.setContexts(
  InteractionContextType.Guild, // 0 - Server channels
  InteractionContextType.BotDM, // 1 - Bot DM
  InteractionContextType.PrivateChannel, // 2 - User-install private channels
);
```

---

## 5. Threads & Forums

### 5.1 Thread Types

| Type                | Value | Parent Channel                |
| ------------------- | ----- | ----------------------------- |
| ANNOUNCEMENT_THREAD | 10    | Announcement channel          |
| PUBLIC_THREAD       | 11    | Text channel or Forum channel |
| PRIVATE_THREAD      | 12    | Text channel only             |

### 5.2 Thread Creation

```typescript
// From a text channel
const thread = await channel.threads.create({
  name: "Discussion Topic",
  autoArchiveDuration: 1440, // minutes: 60, 1440, 4320, 10080
  reason: "New discussion",
});

// From a message
const thread = await message.startThread({
  name: "Thread on this message",
  autoArchiveDuration: 60,
});
```

### 5.3 Auto-Archive Durations

| Value (minutes) | Human-Readable |
| --------------- | -------------- |
| 60              | 1 hour         |
| 1440            | 24 hours       |
| 4320            | 3 days         |
| 10080           | 1 week         |

Threads auto-archive after this duration of inactivity (no messages sent).

### 5.4 Thread Metadata

- `archived`: boolean -- thread is archived
- `locked`: boolean -- only moderators can unarchive
- `pinned`: boolean -- pinned in forum channel (forum threads only)
- `autoArchiveDuration`: one of the four values above

```typescript
await thread.setArchived(true);
await thread.setLocked(true);
await thread.setName("New Thread Name");
```

### 5.5 Forum Channels

Forum channels (type 15) are thread-only: every post is a thread. No direct messages in the channel itself.

**Key Properties:**

- `availableTags`: up to **20** tags defined on the channel
- Applied tags per thread: max **5**
- `defaultAutoArchiveDuration`: for new threads
- `defaultReactionEmoji`: auto-added reaction on new posts
- `defaultSortOrder`: `LATEST_ACTIVITY` or `CREATION_DATE`
- `defaultForumLayout`: `NOT_SET`, `LIST_VIEW`, or `GRID_VIEW`
- `topic`: post guidelines, up to 4096 chars
- Flags: `REQUIRE_TAG` (threads must have at least 1 tag), `HIDE_MEDIA_DOWNLOAD_OPTIONS`

```typescript
// Create a forum post (thread)
const thread = await forumChannel.threads.create({
  name: "Quiz Results - Session 03",
  message: {
    content: "Here are the results...",
    embeds: [resultsEmbed],
  },
  appliedTags: [tagId1, tagId2], // max 5
});
```

### 5.6 Media Channels (type 16)

Similar to Forum channels but designed for media-heavy content. Thread-only, same tag system. Still relatively new.

### 5.7 Thread Member Management

```typescript
await thread.members.add(userId); // Add user to thread
await thread.members.remove(userId); // Remove user
const members = await thread.members.fetch(); // List members
```

Note: Thread member count is capped at 50 for display, but actual count can be higher.

---

## 6. Interactions & Responses

### 6.1 Interaction Callback Types

| Type                                    | Value | discord.js Method           | Description                          |
| --------------------------------------- | ----- | --------------------------- | ------------------------------------ |
| PONG                                    | 1     | (automatic)                 | ACK a ping                           |
| CHANNEL_MESSAGE_WITH_SOURCE             | 4     | `interaction.reply()`       | Send a message                       |
| DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE    | 5     | `interaction.deferReply()`  | Show "thinking..." then edit later   |
| DEFERRED_UPDATE_MESSAGE                 | 6     | `interaction.deferUpdate()` | ACK component, edit original later   |
| UPDATE_MESSAGE                          | 7     | `interaction.update()`      | Edit the message the component is on |
| APPLICATION_COMMAND_AUTOCOMPLETE_RESULT | 8     | `interaction.respond()`     | Return autocomplete choices          |
| MODAL                                   | 9     | `interaction.showModal()`   | Show a modal popup                   |
| PREMIUM_REQUIRED                        | 10    | --                          | Deprecated; use premium buttons      |
| LAUNCH_ACTIVITY                         | 12    | --                          | Launch an embedded Activity          |

### 6.2 Ephemeral Messages

Only visible to the user who triggered the interaction. Set via `flags`:

```typescript
await interaction.reply({
  content: "Only you can see this!",
  flags: MessageFlags.Ephemeral, // value: 64
});
```

- Cannot change ephemeral state after the first response
- Ephemeral messages cannot be reacted to or referenced
- Ephemeral messages auto-delete when the user's client restarts

### 6.3 Deferred Responses

When your bot needs more than 3 seconds to respond:

```typescript
// Shows "<Bot> is thinking..." to the user
await interaction.deferReply();
// ... do heavy work ...
await interaction.editReply({ content: "Done!" });

// Ephemeral deferred
await interaction.deferReply({ flags: MessageFlags.Ephemeral });
```

### 6.4 Follow-up Messages

After the initial response, send additional messages within 15 minutes:

```typescript
await interaction.followUp({ content: "Additional info!" });
await interaction.followUp({
  content: "Secret",
  flags: MessageFlags.Ephemeral,
});
```

- Interaction tokens valid for **15 minutes**
- User-installed apps limited to **5 follow-ups** per interaction

### 6.5 Component Interaction Responses

When a user clicks a button or changes a select menu:

```typescript
// Update the original message (removes "loading" state)
await interaction.update({ content: "Updated!", components: [] });

// Defer the update (no visible change yet)
await interaction.deferUpdate();
await interaction.editReply({ content: "Updated after processing!" });

// Reply with a new message instead
await interaction.reply({
  content: "New message!",
  flags: MessageFlags.Ephemeral,
});

// Show a modal
await interaction.showModal(modal);
```

### 6.6 Interaction Type Checking (discord.js)

```typescript
interaction.isChatInputCommand(); // Slash command
interaction.isAutocomplete(); // Autocomplete
interaction.isButton(); // Button click
interaction.isStringSelectMenu(); // String select change
interaction.isUserSelectMenu(); // User select
interaction.isRoleSelectMenu(); // Role select
interaction.isMentionableSelectMenu();
interaction.isChannelSelectMenu();
interaction.isModalSubmit(); // Modal submitted
interaction.isUserContextMenuCommand();
interaction.isMessageContextMenuCommand();
```

---

## 7. Reactions & Emojis

### 7.1 Adding Reactions

```typescript
// Unicode emoji
await message.react("👍");

// Custom emoji (by ID)
await message.react("123456789012345678");

// Custom emoji (by string)
await message.react("<:custom:123456789012345678>");
await message.react("<a:animated:123456789012345678>"); // animated
```

### 7.2 Removing Reactions

```typescript
// Remove bot's own reaction
const reaction = message.reactions.cache.get("👍");
await reaction.users.remove(client.user.id);

// Remove another user's reaction (requires MANAGE_MESSAGES)
await reaction.users.remove(userId);

// Remove all reactions
await message.reactions.removeAll();

// Remove all of a specific emoji
await message.reactions.cache.get("👍").remove();
```

### 7.3 Reaction Collectors

```typescript
const filter = (reaction, user) => reaction.emoji.name === "👍" && !user.bot;
const collector = message.createReactionCollector({
  filter,
  time: 60000,
  max: 10,
});

collector.on("collect", (reaction, user) => {
  /* handle */
});
collector.on("end", (collected) => {
  /* finalize */
});
```

### 7.4 Custom Emojis

- Guild emojis: managed via `guild.emojis`
- Application emojis: `ApplicationEmoji` class -- app-scoped, usable anywhere the bot is
- Animated emojis: `<a:name:id>` format
- Bots can use emojis from any server they are in

```typescript
// Create guild emoji
const emoji = await guild.emojis.create({
  attachment: "./emoji.png",
  name: "custom_emoji",
});

// Use in messages
await channel.send(`Check this out ${emoji}`);
```

### 7.5 Super Reactions

Discord's paid "burst" reactions (Nitro). The API exposes:

- `count_details`: separate `burst` and `normal` counts
- `me_burst`: whether current user super-reacted
- `burst_colors`: array of HEX colors for super reaction effects

Bots cannot send super reactions, but can read the data.

### 7.6 Default Reactions on Forum Posts

Forum channels support `defaultReactionEmoji` -- automatically added as a reaction to every new post:

```typescript
await forumChannel.setDefaultReactionEmoji({ id: emojiId }); // custom
await forumChannel.setDefaultReactionEmoji({ name: "👍" }); // unicode
```

---

## 8. Voice & Audio

Voice functionality requires the separate `@discordjs/voice` package (v0.19.x).

### 8.1 Connecting to Voice Channels

```typescript
import { joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice";

const connection = joinVoiceChannel({
  channelId: voiceChannel.id,
  guildId: guild.id,
  adapterCreator: guild.voiceAdapterCreator,
  selfDeaf: false, // Set false to receive audio
});
```

**Connection States:** Signalling -> Connecting -> Ready -> Disconnected -> Destroyed

### 8.2 Audio Streaming

```typescript
import {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} from "@discordjs/voice";

const player = createAudioPlayer();
const resource = createAudioResource("./audio.mp3");
player.play(resource);

connection.subscribe(player);

player.on(AudioPlayerStatus.Idle, () => {
  /* track ended */
});
```

- A single player can play to multiple connections simultaneously
- Supports: local files, streams, URLs

### 8.3 Audio Receiving

```typescript
const receiver = connection.receiver;
receiver.speaking.on("start", (userId) => {
  const audioStream = receiver.subscribe(userId);
  // Process PCM audio stream
});
```

Requires `selfDeaf: false` when joining.

### 8.4 Stage Channels

Stage channels (type 13) follow a speaker/audience model:

- Users join as audience by default
- Speakers are explicitly promoted
- Max **10,000** users (vs 99 for voice)
- Max bitrate: 64,000 bps
- Bots can manage stage instances:

```typescript
// Create a stage instance
const stageInstance = await stageChannel.createStageInstance({
  topic: "Live Quiz Session",
  privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
});

// Request to speak / invite to speak
await guild.members.cache.get(userId).voice.setSuppressed(false);
```

### 8.5 Voice Channel Status Text

Discord supports status text on voice channels, but discord.js v14 does not have native support yet. Workaround via direct API call:

```typescript
await client.rest.put(`/channels/${channelId}/voice-status`, {
  body: { status: "Quiz in progress!" },
});
```

### 8.6 Voice Channel Constraints

| Property          | Standard | Boost L1 | Boost L2 | Boost L3 |
| ----------------- | -------- | -------- | -------- | -------- |
| Max bitrate       | 96,000   | 128,000  | 256,000  | 384,000  |
| Max users         | 99       | 99       | 99       | 99       |
| Stage max users   | 10,000   | 10,000   | 10,000   | 10,000   |
| Stage max bitrate | 64,000   | 64,000   | 64,000   | 64,000   |

---

## 9. Scheduled Events

Guild-level events visible to all members, with RSVP tracking.

### 9.1 Entity Types

| Type           | Value | Description                     | Requirements                                               |
| -------------- | ----- | ------------------------------- | ---------------------------------------------------------- |
| STAGE_INSTANCE | 1     | Hosted in stage channel         | `channel_id` required                                      |
| VOICE          | 2     | Hosted in voice channel         | `channel_id` required                                      |
| EXTERNAL       | 3     | External location (URL/address) | `entity_metadata.location` + `scheduled_end_time` required |

### 9.2 Status Lifecycle

```
SCHEDULED (1) --> ACTIVE (2) --> COMPLETED (3)
SCHEDULED (1) --> CANCELED (4)
```

- Stage/Voice events auto-complete a few minutes after last user leaves
- External events auto-activate at start time, auto-complete at end time
- Unstarted events auto-cancel after a few hours past start time
- COMPLETED and CANCELED are immutable terminal states

### 9.3 Creating Events

```typescript
const event = await guild.scheduledEvents.create({
  name: "Quiz Session 04",
  description: "Weekly quiz covering IDE setup",
  scheduledStartTime: new Date("2026-04-07T18:00:00Z"),
  scheduledEndTime: new Date("2026-04-07T19:00:00Z"),
  privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
  entityType: GuildScheduledEventEntityType.Voice,
  channel: voiceChannelId,
  image: "./event-banner.png", // cover image
});
```

### 9.4 Recurrence Rules

Events can recur with iCalendar-like rules:

| Field                       | Description                                    |
| --------------------------- | ---------------------------------------------- |
| `frequency`                 | YEARLY (0), MONTHLY (1), WEEKLY (2), DAILY (3) |
| `interval`                  | Spacing between occurrences                    |
| `by_weekday`                | Valid for daily/weekly                         |
| `by_n_weekday`              | Valid for monthly (max 1 entry)                |
| `by_month` + `by_month_day` | Valid for yearly                               |

Limitation: Monthly events can only specify one day via `by_n_weekday`.

### 9.5 RSVP / Subscribers

```typescript
// Fetch users interested in the event
const subscribers = await event.fetchSubscribers({ limit: 100 });

// Events emit these gateway events:
client.on("guildScheduledEventUserAdd", (event, user) => {
  /* user RSVP'd */
});
client.on("guildScheduledEventUserRemove", (event, user) => {
  /* user un-RSVP'd */
});
```

### 9.6 Constraints

- Max 100 active/scheduled events per guild
- Event name: 1-100 characters
- Description: 0-1000 characters
- Cover image: standard image upload
- Privacy: only GUILD_ONLY (value 2) available
- Subscriber list: paginated, max 100 per request

---

## 10. Permissions & Roles

### 10.1 Role Properties

| Property       | Description                            |
| -------------- | -------------------------------------- |
| `name`         | Role name                              |
| `color`        | Role color (integer)                   |
| `hoist`        | Display separately in member list      |
| `position`     | Hierarchy position                     |
| `permissions`  | Bitfield of permissions                |
| `mentionable`  | Can be @mentioned                      |
| `icon`         | Role icon (Boost Level 2+)             |
| `unicodeEmoji` | Unicode emoji as icon (Boost Level 2+) |
| `managed`      | Managed by integration (read-only)     |

### 10.2 Role Management

```typescript
// Create role
const role = await guild.roles.create({
  name: "Student",
  color: 0x00ff00,
  hoist: true,
  permissions: [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
  ],
  mentionable: true,
  reason: "Student role for formation",
});

// Edit role
await role.edit({ name: "Active Student", color: 0xff0000 });

// Assign role to member
await member.roles.add(role);
await member.roles.remove(role);

// Set role icon (Boost Level 2+)
await role.setIcon("./role-icon.png");
await role.setUnicodeEmoji("🎓");

// Delete role
await role.delete("No longer needed");
```

### 10.3 Permission Overwrites per Channel

```typescript
// Set permission overwrite for a role on a channel
await channel.permissionOverwrites.edit(roleId, {
  ViewChannel: true,
  SendMessages: false,
});

// Set permission overwrite for a user
await channel.permissionOverwrites.edit(userId, {
  ViewChannel: true,
  SendMessages: true,
});

// Delete overwrite
await channel.permissionOverwrites.delete(roleId);
```

### 10.4 Key Permission Flags (relevant for bots)

| Permission               | Bit       | Description                                        |
| ------------------------ | --------- | -------------------------------------------------- |
| `ViewChannel`            | `1 << 10` | See channel                                        |
| `SendMessages`           | `1 << 11` | Send messages                                      |
| `ManageMessages`         | `1 << 13` | Delete/pin messages                                |
| `PinMessages`            | `1 << 46` | Pin messages (split from ManageMessages, Aug 2025) |
| `ManageRoles`            | `1 << 28` | Create/edit roles below bot's highest              |
| `ManageChannels`         | `1 << 4`  | Create/edit/delete channels                        |
| `ManageGuild`            | `1 << 5`  | Edit server settings                               |
| `BanMembers`             | `1 << 2`  | Ban users                                          |
| `KickMembers`            | `1 << 1`  | Kick users                                         |
| `ModerateMembers`        | `1 << 40` | Timeout users                                      |
| `ManageEvents`           | `1 << 33` | Manage events                                      |
| `CreateEvents`           | `1 << 44` | Create events (Nov 2025)                           |
| `CreateGuildExpressions` | `1 << 43` | Create emojis/stickers (Nov 2025)                  |
| `BypassSlowmode`         | `1 << 45` | Bypass channel slowmode (Nov 2025)                 |
| `UseExternalEmojis`      | `1 << 18` | Use emojis from other servers                      |
| `UseExternalStickers`    | `1 << 37` | Use stickers from other servers                    |
| `AddReactions`           | `1 << 6`  | Add reactions                                      |
| `AttachFiles`            | `1 << 15` | Upload files                                       |
| `MentionEveryone`        | `1 << 17` | @everyone and @here                                |
| `ManageWebhooks`         | `1 << 29` | Create/edit webhooks                               |
| `UseSoundboard`          | `1 << 42` | Use soundboard                                     |
| `Speak`                  | `1 << 21` | Speak in voice                                     |
| `Connect`                | `1 << 20` | Connect to voice                                   |
| `MuteMembers`            | `1 << 22` | Server mute                                        |
| `DeafenMembers`          | `1 << 23` | Server deafen                                      |
| `MoveMembers`            | `1 << 24` | Move between voice channels                        |
| `Administrator`          | `1 << 3`  | All permissions                                    |

### 10.5 Linked Roles / Role Connections

Apps can define metadata requirements that users must meet to get a linked role. This is used for verified/connected accounts (e.g., verify GitHub account, game rank).

**discord.js:** `ApplicationRoleConnectionMetadata` class

```typescript
// Register metadata (done once, like registering commands)
await client.application.editRoleConnectionMetadataRecords([
  {
    key: "quiz_score",
    name: "Quiz Score",
    description: "Minimum quiz score",
    type: ApplicationRoleConnectionMetadataType.IntegerGreaterThanOrEqual,
  },
]);
```

Metadata types: `IntegerLessThanOrEqual`, `IntegerGreaterThanOrEqual`, `IntegerEqual`, `IntegerNotEqual`, `DatetimeGreaterThanOrEqual`, `DatetimeLessThanOrEqual`, `BooleanEqual`, `BooleanNotEqual`.

---

## 11. Rich Presence & Activities

### 11.1 Bot Status

```typescript
client.user.setStatus("online"); // online, idle, dnd, invisible
```

### 11.2 Activities

```typescript
import { ActivityType } from 'discord.js';

// Set at client creation
const client = new Client({
  intents: [...],
  presence: {
    status: 'online',
    activities: [{
      name: 'Quiz Bot v2',
      type: ActivityType.Watching, // Displays "Watching Quiz Bot v2"
    }],
  },
});

// Update dynamically
client.user.setPresence({
  status: 'online',
  activities: [{
    name: 'students take quizzes',
    type: ActivityType.Watching,
  }],
});

// Shortcut
client.user.setActivity('quizzes', { type: ActivityType.Playing });
```

**Activity Types:**

| Type      | Value | Display                                          |
| --------- | ----- | ------------------------------------------------ |
| Playing   | 0     | "Playing {name}"                                 |
| Streaming | 1     | "Streaming {name}" (requires Twitch/YouTube URL) |
| Listening | 2     | "Listening to {name}"                            |
| Watching  | 3     | "Watching {name}"                                |
| Custom    | 4     | Custom status text (bots: v14.8.0+)              |
| Competing | 5     | "Competing in {name}"                            |

### 11.3 Embedded Activities

Full HTML5 apps/games that run inside Discord voice channels, text channels, or DMs.

- Built with the **Embedded App SDK** (`@discord/embedded-app-sdk`)
- Separate from discord.js -- they run as web apps inside an iframe in Discord
- Bots can launch activities via `LAUNCH_ACTIVITY` interaction response (type 12)
- `PRIMARY_ENTRY_POINT` command type (4) is the main way to invoke activities
- Monetization supported
- Must handle mobile (touch events required)

---

## 12. Webhooks

### 12.1 Webhook Types

| Type             | Value | Description                                  |
| ---------------- | ----- | -------------------------------------------- |
| Incoming         | 1     | Bot/user-created, posts messages with token  |
| Channel Follower | 2     | Internal, reposts from announcement channels |
| Application      | 3     | Used with Discord Interactions system        |

### 12.2 Creating Webhooks

```typescript
const webhook = await channel.createWebhook({
  name: "Quiz Results",
  avatar: "https://example.com/avatar.png",
  reason: "Posting quiz results",
});
```

- Name: 1-80 chars, cannot contain "clyde" or "discord" (case-insensitive)
- Requires `MANAGE_WEBHOOKS` permission

### 12.3 Sending Messages via Webhook

```typescript
await webhook.send({
  content: "Quiz results are in!",
  username: "Quiz Master", // Override name per-message
  avatarURL: "https://...", // Override avatar per-message
  embeds: [embed],
  components: [actionRow], // Only for app-owned webhooks
  files: [attachment],
  threadId: "123456", // Send to specific thread
  allowedMentions: { parse: [] }, // Control mentions
});
```

### 12.4 Forum Thread Creation via Webhook

```typescript
await webhook.send({
  content: "First message in the thread",
  threadName: "New Quiz Discussion", // Creates a new forum post
  appliedTags: [tagId1, tagId2], // Forum tags
});
```

### 12.5 Components in Webhooks

- **Application-owned webhooks**: can ALWAYS send interactive components (buttons, selects)
- **Non-application webhooks**: need `with_components=true` query param, and can only send NON-interactive components
- When `IS_COMPONENTS_V2` flag is set, only components allowed -- content/embeds must be null

### 12.6 Webhook with Polls

```typescript
await webhook.send({
  poll: {
    question: { text: "Best session so far?" },
    answers: [
      { poll_media: { text: "Session 1" } },
      { poll_media: { text: "Session 2" } },
      { poll_media: { text: "Session 3" } },
    ],
    duration: 24, // hours
    allow_multiselect: false,
  },
});
```

---

## 13. File & Media

### 13.1 Sending File Attachments

```typescript
import { AttachmentBuilder } from "discord.js";

// From file path
const file = new AttachmentBuilder("./results.pdf", { name: "results.pdf" });

// From buffer
const file = new AttachmentBuilder(Buffer.from(csvData), {
  name: "scores.csv",
});

// From URL
const file = new AttachmentBuilder("https://example.com/image.png");

await channel.send({ files: [file] });
await interaction.reply({ files: [file1, file2] });
```

### 13.2 File Size Limits

| Server Boost Level | Max per Attachment                         |
| ------------------ | ------------------------------------------ |
| No boost (default) | **10 MiB** (changed from 25 MiB, Jan 2025) |
| Boost Level 1      | 25 MiB                                     |
| Boost Level 2      | 50 MiB                                     |
| Boost Level 3      | 100 MiB                                    |

Note: Since April 2025, limits are checked per individual attachment (not per message total).

### 13.3 Attachment Object Properties

| Field              | Description               |
| ------------------ | ------------------------- |
| `id`               | Snowflake                 |
| `filename`         | Original filename         |
| `title`            | Display title             |
| `description`      | Alt text, max 1024 chars  |
| `content_type`     | MIME type                 |
| `size`             | Size in bytes             |
| `url`              | CDN URL                   |
| `proxy_url`        | Proxied URL               |
| `height` / `width` | For images/videos         |
| `duration_secs`    | For audio files           |
| `waveform`         | Base64 waveform for audio |
| `ephemeral`        | Auto-removed after period |
| `flags`            | IS_REMIX (1 << 2)         |

### 13.4 Stickers

- Max 3 sticker IDs per message
- Guild stickers: create/edit/delete via `guild.stickers`
- Supported formats: PNG, APNG, Lottie JSON, GIF
- Max size: 512 KB (Lottie: 500 KB)
- Dimensions: 320x320 pixels

```typescript
// Create guild sticker
const sticker = await guild.stickers.create({
  file: "./sticker.png",
  name: "quiz_pass",
  tags: "quiz,pass,success",
  description: "Quiz passed!",
});

// Send with sticker
await channel.send({ stickers: [sticker.id] });
```

### 13.5 Voice Messages

Messages with the `IS_VOICE_MESSAGE` flag (1 << 13). Contain an audio attachment with `duration_secs` and `waveform` fields. Bots can read voice message data but cannot send voice messages.

---

## 14. Channel Types & Features

### 14.1 All Channel Types

| Type                | Value | Description                                   |
| ------------------- | ----- | --------------------------------------------- |
| GUILD_TEXT          | 0     | Standard text channel                         |
| DM                  | 1     | Direct message (1-on-1)                       |
| GUILD_VOICE         | 2     | Voice channel                                 |
| GROUP_DM            | 3     | Group direct message                          |
| GUILD_CATEGORY      | 4     | Channel category (max 50 children)            |
| GUILD_ANNOUNCEMENT  | 5     | Announcement/news channel (crosspost-capable) |
| ANNOUNCEMENT_THREAD | 10    | Thread in announcement channel                |
| PUBLIC_THREAD       | 11    | Thread in text/forum channel                  |
| PRIVATE_THREAD      | 12    | Private thread in text channel                |
| GUILD_STAGE_VOICE   | 13    | Stage channel (speaker/audience)              |
| GUILD_DIRECTORY     | 14    | Hub/server listing                            |
| GUILD_FORUM         | 15    | Thread-only forum channel                     |
| GUILD_MEDIA         | 16    | Thread-only media channel                     |

### 14.2 Channel Properties

| Property           | Description                         | Limit                                     |
| ------------------ | ----------------------------------- | ----------------------------------------- |
| `name`             | Channel name                        | 1-100 chars                               |
| `topic`            | Channel description/guidelines      | 0-1024 chars (text), 0-4096 (forum/media) |
| `rateLimitPerUser` | Slowmode (seconds between messages) | 0-21600 (6 hours)                         |
| `nsfw`             | Age-restricted flag                 | boolean                                   |
| `parentId`         | Category ID                         | --                                        |
| `position`         | Sort order                          | integer                                   |
| `bitrate`          | Voice quality (voice/stage)         | 8000-384000                               |
| `userLimit`        | Max voice users                     | 0-99 (voice), 0-10000 (stage)             |

### 14.3 Creating Channels

```typescript
// Text channel
const textChannel = await guild.channels.create({
  name: "quiz-results",
  type: ChannelType.GuildText,
  parent: categoryId,
  topic: "Quiz results and leaderboards",
  rateLimitPerUser: 10, // 10s slowmode
});

// Voice channel
const voiceChannel = await guild.channels.create({
  name: "Quiz Room",
  type: ChannelType.GuildVoice,
  parent: categoryId,
  bitrate: 96000,
  userLimit: 50,
});

// Forum channel
const forum = await guild.channels.create({
  name: "quiz-discussions",
  type: ChannelType.GuildForum,
  topic: "Discuss quiz questions here",
  availableTags: [
    { name: "Session 01", moderated: false },
    { name: "Session 02", moderated: false },
    { name: "Resolved", moderated: true },
  ],
  defaultAutoArchiveDuration: 1440,
  defaultSortOrder: SortOrderType.CreationDate,
});

// Category
const category = await guild.channels.create({
  name: "FORMATION",
  type: ChannelType.GuildCategory,
});
```

### 14.4 Announcement Channels & Cross-posting

Announcement channels allow messages to be published to all servers following the channel:

```typescript
// Publish/crosspost a message
await message.crosspost();

// Follow an announcement channel (receive published messages in another channel)
await targetChannel.follow(announcementChannelId);
```

### 14.5 Slowmode

```typescript
await channel.setRateLimitPerUser(30); // 30 seconds between messages
await channel.setRateLimitPerUser(0); // Disable slowmode
```

Bots with `BYPASS_SLOWMODE` permission (added Nov 2025) are not affected.

---

## 15. Onboarding & Welcome

### 15.1 Guild Onboarding

The flow new members see when joining a Community server.

**Structure:**

- **Prompts**: Customizable questions with multiple-choice or dropdown
- **Default Channels**: Auto-subscribed channels for all new members
- **Mode**: `DEFAULT` (counts default channels) or `ADVANCED` (includes question responses)

Each prompt option can:

- Assign roles
- Add members to channels
- Display custom or unicode emojis

```typescript
// Read onboarding configuration
const onboarding = await guild.fetchOnboarding();
```

### 15.2 Welcome Screen

Displayed to new members in Community guilds.

- Optional server description
- Up to **5** welcome channels with descriptions and emoji
- Each channel entry has: channel ID, description, emoji

```typescript
// Edit welcome screen
await guild.editWelcomeScreen({
  enabled: true,
  description: "Welcome to the Formation Discord!",
  welcomeChannels: [
    { channelId: "...", description: "Start here", emojiName: "👋" },
    { channelId: "...", description: "Read the rules", emojiName: "📜" },
  ],
});
```

### 15.3 Member Verification / Rules Screening

When enabled, new members see a rules screen and must accept before chatting.

- `rules_channel_id`: channel containing the server rules
- Members show as `pending: true` until they complete screening
- Bot event: `guildMemberUpdate` fires when member completes screening

```typescript
client.on("guildMemberUpdate", (oldMember, newMember) => {
  if (oldMember.pending && !newMember.pending) {
    // Member just completed verification
  }
});
```

### 15.4 System Messages Channel

`system_channel_id`: where Discord posts join messages, boost events, etc.

System channel flags control what gets posted:

- Suppress member join notifications
- Suppress premium (boost) subscription notifications
- Suppress guild setup tips
- Suppress join notification replies (sticker prompts)

---

## 16. Polls

Native Discord polls, supported since discord.js v14.23.0.

### 16.1 Poll Structure

| Field                        | Type          | Constraint                           |
| ---------------------------- | ------------- | ------------------------------------ |
| `question.text`              | string        | Max 300 characters                   |
| `answers`                    | array         | Max 10 answers                       |
| `answers[].poll_media.text`  | string        | Max 55 characters                    |
| `answers[].poll_media.emoji` | partial emoji | Optional                             |
| `duration`                   | integer       | Hours, max 768 (32 days), default 24 |
| `allow_multiselect`          | boolean       | Default false                        |
| `layout_type`                | integer       | Only `1` (DEFAULT) currently         |

### 16.2 Creating Polls

```typescript
await channel.send({
  poll: {
    question: { text: "How well do you understand Session 3?" },
    answers: [
      { poll_media: { text: "Very well", emoji: { name: "🟢" } } },
      { poll_media: { text: "Somewhat", emoji: { name: "🟡" } } },
      { poll_media: { text: "Not at all", emoji: { name: "🔴" } } },
    ],
    duration: 24,
    allow_multiselect: false,
  },
});
```

### 16.3 Ending a Poll Early

```typescript
const message = await channel.messages.fetch(messageId);
await message.poll.end();
```

### 16.4 Getting Vote Results

```typescript
const poll = message.poll;
// poll.answers - Map of answer objects with vote counts
// Each answer has: voters, voteCount

// Fetch voters for a specific answer
const voters = await poll.answers.get(1).fetchVoters();
```

### 16.5 Poll Constraints

- Bots/apps CANNOT vote on polls
- All polls have expiration (no permanent polls)
- Max 10 answers
- Question: 300 chars, each answer: 55 chars
- Can be created via message send or webhook
- Can be created/edited in deferred interaction responses
- Events: `messagePollVoteAdd`, `messagePollVoteRemove`

---

## 17. Premium / Monetization

### 17.1 SKU Types

| Type                  | Description                                    |
| --------------------- | ---------------------------------------------- |
| Durable (one-time)    | Buy once, keep forever                         |
| Consumable (one-time) | Buy once, use up (can re-purchase)             |
| User Subscription     | Recurring, per-user                            |
| Guild Subscription    | Recurring, per-server (all members get access) |

Multiple subscription tiers supported since December 2024.

### 17.2 Entitlements

Entitlements track whether a user/guild has access to a SKU.

```typescript
// Check if user has premium
const entitlements = await client.application.entitlements.fetch({
  userId: interaction.user.id,
});
const hasPremium = entitlements.some(
  (e) => e.skuId === "YOUR_SKU_ID" && e.isActive(),
);

// Consume a consumable entitlement
await entitlement.consume();
```

### 17.3 Premium Buttons

Button style 6 (`ButtonStyle.Premium`) opens the purchase flow:

```typescript
const premiumButton = new ButtonBuilder()
  .setStyle(ButtonStyle.Premium)
  .setSKUId("YOUR_SKU_ID");
// Note: no custom_id or label -- just sku_id
```

### 17.4 Test Entitlements

For development/testing without real purchases:

```typescript
// Create test entitlement
const testEntitlement = await client.application.entitlements.createTest({
  skuId: "SKU_ID",
  ownerId: userId,
  ownerType: 2, // 1 = guild, 2 = user
});

// Delete test entitlement
await testEntitlement.deleteTest();
```

### 17.5 Gateway Events

- `entitlementCreate`: user purchases/gets access
- `entitlementUpdate`: subscription renewed or status changed
- `entitlementDelete`: test entitlement deleted

---

## 18. Auto Moderation

Bot-configurable content filtering that runs BEFORE messages are posted.

### 18.1 Trigger Types

| Type           | Value | Max per Guild | Description                   |
| -------------- | ----- | ------------- | ----------------------------- |
| KEYWORD        | 1     | 6             | Custom keyword/regex filter   |
| SPAM           | 3     | 1             | Generic spam detection        |
| KEYWORD_PRESET | 4     | 1             | Discord's built-in word lists |
| MENTION_SPAM   | 5     | 1             | Too many unique mentions      |
| MEMBER_PROFILE | 6     | 1             | Filter member profile text    |

### 18.2 Trigger Metadata

**KEYWORD (type 1) & MEMBER_PROFILE (type 6):**

- `keyword_filter`: max 1000 entries, 60 chars each
- `regex_patterns`: max 10 entries, 260 chars each (Rust regex flavor)
- `allow_list`: max 100 entries, 60 chars each

Keyword matching supports wildcards:

- `*keyword*` -- contains "keyword"
- `keyword*` -- starts with "keyword"
- `*keyword` -- ends with "keyword"
- `keyword` (no wildcards) -- whole word match

**KEYWORD_PRESET (type 4):**

- Presets: `PROFANITY` (1), `SEXUAL_CONTENT` (2), `SLURS` (3)
- `allow_list`: max 1000 entries

**MENTION_SPAM (type 5):**

- `mention_total_limit`: max 50 unique mentions
- `mention_raid_protection_enabled`: boolean

### 18.3 Action Types

| Action                   | Value | Description                  | Metadata                                     |
| ------------------------ | ----- | ---------------------------- | -------------------------------------------- |
| BLOCK_MESSAGE            | 1     | Block the message            | `custom_message` (max 150 chars, optional)   |
| SEND_ALERT_MESSAGE       | 2     | Log to alert channel         | `channel_id` (required)                      |
| TIMEOUT                  | 3     | Timeout the user             | `duration_seconds` (max 2,419,200 = 4 weeks) |
| BLOCK_MEMBER_INTERACTION | 4     | Block text/voice/interaction | None                                         |

TIMEOUT only works with KEYWORD and MENTION_SPAM triggers. Requires `MODERATE_MEMBERS` permission.

### 18.4 Event Types

| Event         | Value | Trigger                         |
| ------------- | ----- | ------------------------------- |
| MESSAGE_SEND  | 1     | Member sends or edits a message |
| MEMBER_UPDATE | 2     | Member edits their profile      |

### 18.5 Exemptions

- `exempt_roles`: up to 20 role IDs
- `exempt_channels`: up to 50 channel IDs

### 18.6 discord.js Implementation

```typescript
// Create an AutoMod rule
const rule = await guild.autoModerationRules.create({
  name: "No Profanity",
  eventType: AutoModerationRuleEventType.MessageSend,
  triggerType: AutoModerationRuleTriggerType.Keyword,
  triggerMetadata: {
    keywordFilter: ["badword1", "badword2*"],
    regexPatterns: ["^spam\\d+$"],
  },
  actions: [
    {
      type: AutoModerationActionType.BlockMessage,
      metadata: { customMessage: "This message was blocked by AutoMod." },
    },
    {
      type: AutoModerationActionType.SendAlertMessage,
      metadata: { channelId: alertChannelId },
    },
    {
      type: AutoModerationActionType.Timeout,
      metadata: { durationSeconds: 300 }, // 5 minutes
    },
  ],
  exemptRoles: [moderatorRoleId],
  exemptChannels: [botCommandsChannelId],
  enabled: true,
});

// Listen for AutoMod actions
client.on("autoModerationActionExecution", (execution) => {
  console.log(`Rule ${execution.ruleId} triggered for ${execution.userId}`);
});
```

---

## 19. Audit Log

### 19.1 Overview

All administrative actions are logged for **45 days**. Reading requires `VIEW_AUDIT_LOG` permission.

### 19.2 Fetching Audit Logs

```typescript
const logs = await guild.fetchAuditLogs({
  type: AuditLogEvent.MemberBanAdd,
  limit: 10,
});

const firstEntry = logs.entries.first();
console.log(`${firstEntry.executor.tag} banned ${firstEntry.target.tag}`);
console.log(`Reason: ${firstEntry.reason}`);
```

**Query Filters:**

- `user_id`: filter by who performed the action
- `action_type`: filter by event type
- `before` / `after`: pagination by entry ID
- `limit`: 1-100 (default 50)

### 19.3 Real-Time Audit Log Events

```typescript
// Requires GuildModeration intent
client.on("guildAuditLogEntryCreate", (entry) => {
  console.log(`Action: ${entry.action}, By: ${entry.executorId}`);
});
```

### 19.4 Audit Log Event Types (Complete List)

| Event                                   | Value | Description                             |
| --------------------------------------- | ----- | --------------------------------------- |
| GuildUpdate                             | 1     | Server settings changed                 |
| ChannelCreate                           | 10    | Channel created                         |
| ChannelUpdate                           | 11    | Channel edited                          |
| ChannelDelete                           | 12    | Channel deleted                         |
| ChannelOverwriteCreate                  | 13    | Permission overwrite added              |
| ChannelOverwriteUpdate                  | 14    | Permission overwrite edited             |
| ChannelOverwriteDelete                  | 15    | Permission overwrite removed            |
| MemberKick                              | 20    | Member kicked                           |
| MemberPrune                             | 21    | Inactive members pruned                 |
| MemberBanAdd                            | 22    | Member banned                           |
| MemberBanRemove                         | 23    | Member unbanned                         |
| MemberUpdate                            | 24    | Member edited (nickname, timeout, etc.) |
| MemberRoleUpdate                        | 25    | Member roles changed                    |
| MemberMove                              | 26    | Member moved to different voice channel |
| MemberDisconnect                        | 27    | Member disconnected from voice          |
| BotAdd                                  | 28    | Bot added to server                     |
| RoleCreate                              | 30    | Role created                            |
| RoleUpdate                              | 31    | Role edited                             |
| RoleDelete                              | 32    | Role deleted                            |
| InviteCreate                            | 40    | Invite created                          |
| InviteUpdate                            | 41    | Invite edited                           |
| InviteDelete                            | 42    | Invite deleted                          |
| WebhookCreate                           | 50    | Webhook created                         |
| WebhookUpdate                           | 51    | Webhook edited                          |
| WebhookDelete                           | 52    | Webhook deleted                         |
| EmojiCreate                             | 60    | Custom emoji created                    |
| EmojiUpdate                             | 61    | Custom emoji edited                     |
| EmojiDelete                             | 62    | Custom emoji deleted                    |
| MessageDelete                           | 72    | Message deleted                         |
| MessageBulkDelete                       | 73    | Messages bulk-deleted                   |
| MessagePin                              | 74    | Message pinned                          |
| MessageUnpin                            | 75    | Message unpinned                        |
| IntegrationCreate                       | 80    | Integration added                       |
| IntegrationUpdate                       | 81    | Integration edited                      |
| IntegrationDelete                       | 82    | Integration removed                     |
| StageInstanceCreate                     | 83    | Stage instance started                  |
| StageInstanceUpdate                     | 84    | Stage instance edited                   |
| StageInstanceDelete                     | 85    | Stage instance ended                    |
| StickerCreate                           | 90    | Sticker created                         |
| StickerUpdate                           | 91    | Sticker edited                          |
| StickerDelete                           | 92    | Sticker deleted                         |
| GuildScheduledEventCreate               | 100   | Event created                           |
| GuildScheduledEventUpdate               | 101   | Event edited                            |
| GuildScheduledEventDelete               | 102   | Event deleted                           |
| ThreadCreate                            | 110   | Thread created                          |
| ThreadUpdate                            | 111   | Thread edited                           |
| ThreadDelete                            | 112   | Thread deleted                          |
| ApplicationCommandPermissionUpdate      | 121   | Command permissions changed             |
| SoundboardSoundCreate                   | 130   | Soundboard sound added                  |
| SoundboardSoundUpdate                   | 131   | Soundboard sound edited                 |
| SoundboardSoundDelete                   | 132   | Soundboard sound removed                |
| AutoModerationRuleCreate                | 140   | AutoMod rule created                    |
| AutoModerationRuleUpdate                | 141   | AutoMod rule edited                     |
| AutoModerationRuleDelete                | 142   | AutoMod rule deleted                    |
| AutoModerationBlockMessage              | 143   | AutoMod blocked a message               |
| AutoModerationFlagToChannel             | 144   | AutoMod flagged to alert channel        |
| AutoModerationUserCommunicationDisabled | 145   | AutoMod timed out a user                |
| AutoModerationQuarantineUser            | 146   | AutoMod quarantined a user              |
| CreatorMonetizationRequestCreated       | 150   | Monetization request created            |
| CreatorMonetizationTermsAccepted        | 151   | Monetization terms accepted             |
| OnboardingPromptCreate                  | 163   | Onboarding prompt created               |
| OnboardingPromptUpdate                  | 164   | Onboarding prompt updated               |
| OnboardingPromptDelete                  | 165   | Onboarding prompt deleted               |
| OnboardingCreate                        | 166   | Onboarding created                      |
| OnboardingUpdate                        | 167   | Onboarding updated                      |
| HomeSettingsCreate                      | 190   | Server guide created                    |
| HomeSettingsUpdate                      | 191   | Server guide updated                    |

### 19.5 Audit Log Reason

Bots can attach a reason to moderation actions via the `X-Audit-Log-Reason` header (1-512 chars). In discord.js, this is the `reason` parameter on most moderation methods:

```typescript
await member.ban({ reason: "Violated server rules" });
await member.roles.add(roleId, "Completed onboarding quiz");
```

---

## 20. Rate Limits & Constraints

### 20.1 Per-Message Limits

| Constraint                   | Limit                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------- |
| Message content              | 2000 characters (bots always, Nitro users get 4000 in client but NOT via API) |
| Embeds per message           | 10                                                                            |
| Total embed characters       | 6000 across all embeds                                                        |
| Action Rows per message (v1) | 5                                                                             |
| Buttons per Action Row       | 5                                                                             |
| Select Menus per Action Row  | 1                                                                             |
| Components per message (v2)  | 40 (nested count toward total)                                                |
| Stickers per message         | 3                                                                             |
| Files per message            | 10                                                                            |
| File size (default)          | 10 MiB per attachment                                                         |
| Nonce length                 | 25 characters                                                                 |
| custom_id length             | 1-100 characters                                                              |

### 20.2 API Rate Limits

Discord uses both **global** and **per-route** rate limits.

- **Global**: 50 requests per second
- **Per-route**: varies (typically 5-10 per 5 seconds for most endpoints)
- discord.js handles rate limits automatically via its REST manager
- `429 Too Many Requests` returns a `retry_after` value

**Key Rate Limits:**

- Message send: ~5 per 5 seconds per channel
- Message edit: ~5 per 5 seconds per channel
- Message delete: varies (bulk delete is more efficient)
- Reaction add: ~1 per 0.25 seconds
- Guild member request: 1 per 30 seconds per guild (Aug 2025)
- Command creation: 200 per day per guild

### 20.3 Other Limits

| Resource                            | Limit                                       |
| ----------------------------------- | ------------------------------------------- |
| Guilds per bot                      | 100 (increase requires verification at 75+) |
| Channels per guild                  | 500                                         |
| Channels per category               | 50                                          |
| Roles per guild                     | 250                                         |
| Emojis per guild (no boost)         | 50 static, 50 animated                      |
| Emojis per guild (Boost L1)         | 100 each                                    |
| Emojis per guild (Boost L2)         | 150 each                                    |
| Emojis per guild (Boost L3)         | 250 each                                    |
| Stickers per guild (no boost)       | 5                                           |
| Stickers per guild (Boost L1)       | 15                                          |
| Stickers per guild (Boost L2)       | 30                                          |
| Stickers per guild (Boost L3)       | 60                                          |
| Webhook per channel                 | 15                                          |
| Pinned messages per channel         | 50                                          |
| Bans retrieved per request          | 1000                                        |
| Invites per guild                   | Unlimited (but rate limited)                |
| Active threads per guild            | ~1000                                       |
| Forum tags per channel              | 20                                          |
| Applied tags per thread             | 5                                           |
| Scheduled events per guild          | 100                                         |
| AutoMod keyword rules               | 6                                           |
| AutoMod keywords per rule           | 1000                                        |
| AutoMod regex patterns per rule     | 10                                          |
| Soundboard sounds (default)         | 8                                           |
| Soundboard sounds (MORE_SOUNDBOARD) | 96                                          |

---

## 21. Markdown & Formatting

### 21.1 Text Formatting

| Syntax                   | Result                        |
| ------------------------ | ----------------------------- | ------- | --- | --- | ------------------------- |
| `*italic*` or `_italic_` | _italic_                      |
| `**bold**`               | **bold**                      |
| `***bold italic***`      | **_bold italic_**             |
| `__underline__`          | underline                     |
| `~~strikethrough~~`      | ~~strikethrough~~             |
| `                        |                               | spoiler |     | `   | spoiler (click to reveal) |
| `` `inline code` ``      | `inline code`                 |
| ` ```code block``` `     | Code block                    |
| ` ```js\ncode``` `       | Syntax-highlighted code block |
| `> quote`                | Block quote (single line)     |
| `>>> quote`              | Block quote (multi-line)      |
| `# Heading`              | Large heading                 |
| `## Heading`             | Medium heading                |
| `### Heading`            | Small heading                 |
| `-# subtext`             | Small grey subtext            |
| `- item` or `* item`     | Unordered list                |
| `1. item`                | Ordered list                  |
| `[text](url)`            | Masked link / hyperlink       |
| `[text](url "title")`    | Masked link with hover title  |

### 21.2 Timestamp Formatting

Dynamic timestamps that adjust to each user's timezone:

| Syntax             | Style           | Example Output                  |
| ------------------ | --------------- | ------------------------------- |
| `<t:1680000000:t>` | Short Time      | 4:00 PM                         |
| `<t:1680000000:T>` | Long Time       | 4:00:00 PM                      |
| `<t:1680000000:d>` | Short Date      | 03/28/2023                      |
| `<t:1680000000:D>` | Long Date       | March 28, 2023                  |
| `<t:1680000000:f>` | Short Date/Time | March 28, 2023 4:00 PM          |
| `<t:1680000000:F>` | Long Date/Time  | Tuesday, March 28, 2023 4:00 PM |
| `<t:1680000000:R>` | Relative        | 3 years ago                     |

**discord.js helper:**

```typescript
import { time, TimestampStyles } from "discord.js";

const timestamp = time(new Date(), TimestampStyles.RelativeTime);
// Returns: <t:1234567890:R>
```

### 21.3 Mention Formatting

| Syntax                  | Mention Type            |
| ----------------------- | ----------------------- |
| `<@USER_ID>`            | User mention            |
| `<@!USER_ID>`           | User mention (nickname) |
| `<@&ROLE_ID>`           | Role mention            |
| `<#CHANNEL_ID>`         | Channel mention         |
| `@everyone`             | Everyone                |
| `@here`                 | Online members          |
| `</command:COMMAND_ID>` | Slash command mention   |

**discord.js helpers:**

```typescript
import { userMention, roleMention, channelMention } from "discord.js";

userMention(userId); // <@123456789>
roleMention(roleId); // <@&123456789>
channelMention(chanId); // <#123456789>
```

### 21.4 Custom Emoji in Text

| Syntax        | Type                  |
| ------------- | --------------------- |
| `<:name:ID>`  | Custom static emoji   |
| `<a:name:ID>` | Custom animated emoji |

### 21.5 discord.js Formatters Utility

````typescript
import {
  bold,
  italic,
  strikethrough,
  underline,
  spoiler,
  quote,
  blockQuote,
  inlineCode,
  codeBlock,
  hyperlink,
  time,
  heading,
  subtext,
  userMention,
  roleMention,
  channelMention,
} from "discord.js";

bold("text"); // **text**
italic("text"); // *text*
strikethrough("text"); // ~~text~~
underline("text"); // __text__
spoiler("text"); // ||text||
quote("text"); // > text
blockQuote("text"); // >>> text
inlineCode("text"); // `text`
codeBlock("js", "const x=1"); // ```js\nconst x=1\n```
hyperlink("Click", "url"); // [Click](url)
heading("Title", 1); // # Title
subtext("small text"); // -# small text
````

---

## 22. Soundboard

### 22.1 Overview

Guild soundboard lets users play short sound clips in voice channels.

### 22.2 Constraints

- Max file size: 512 KB
- Max duration: 5.2 seconds
- Default sounds per guild: 8
- With `MORE_SOUNDBOARD` feature: up to 96 sounds
- Supported formats: MP3, OGG, WAV

### 22.3 Permissions Required

- `SPEAK`: required to play sounds
- `USE_SOUNDBOARD`: required to use soundboard
- Must be connected to a voice channel

### 22.4 API Operations

```typescript
// discord.js has gateway handlers for soundboard events:
// GUILD_SOUNDBOARD_SOUNDS_UPDATE
// GUILD_SOUNDBOARD_SOUND_UPDATE
// SOUNDBOARD_SOUNDS

// Direct API for playing a sound in voice channel:
// POST /channels/{channel.id}/send-soundboard-sound
// Body: { sound_id: '...' }
```

### 22.5 Audit Log

Soundboard changes are tracked: `SoundboardSoundCreate` (130), `SoundboardSoundUpdate` (131), `SoundboardSoundDelete` (132).

---

## 23. Gateway Intents & Events

### 23.1 Intent Categories

**Standard Intents** (no special approval needed):

| Intent                      | Value     | Key Events                                       |
| --------------------------- | --------- | ------------------------------------------------ |
| Guilds                      | `1 << 0`  | Guild CRUD, channel CRUD, thread CRUD, role CRUD |
| GuildModeration             | `1 << 2`  | Bans, audit log entries                          |
| GuildEmojisAndStickers      | `1 << 3`  | Emoji/sticker CRUD                               |
| GuildIntegrations           | `1 << 4`  | Integration CRUD                                 |
| GuildWebhooks               | `1 << 5`  | Webhook updates                                  |
| GuildInvites                | `1 << 6`  | Invite create/delete                             |
| GuildVoiceStates            | `1 << 7`  | Voice state updates                              |
| GuildMessages               | `1 << 9`  | Message CRUD in guild channels                   |
| GuildMessageReactions       | `1 << 10` | Reaction add/remove                              |
| GuildMessageTyping          | `1 << 11` | Typing indicators                                |
| DirectMessages              | `1 << 12` | DM message CRUD                                  |
| DirectMessageReactions      | `1 << 13` | DM reaction add/remove                           |
| DirectMessageTyping         | `1 << 14` | DM typing indicators                             |
| GuildScheduledEvents        | `1 << 16` | Event CRUD, user add/remove                      |
| AutoModerationConfiguration | `1 << 20` | AutoMod rule CRUD                                |
| AutoModerationExecution     | `1 << 21` | AutoMod action triggered                         |
| GuildMessagePolls           | `1 << 24` | Poll vote add/remove in guilds                   |
| DirectMessagePolls          | `1 << 25` | Poll vote add/remove in DMs                      |

**Privileged Intents** (require Developer Portal toggle + verification at 100+ guilds):

| Intent         | Value     | What It Enables                                       |
| -------------- | --------- | ----------------------------------------------------- |
| GuildPresences | `1 << 8`  | User status/activity updates                          |
| GuildMembers   | `1 << 15` | Member join/leave/update, full member list            |
| MessageContent | `1 << 15` | Read message content, embeds, attachments, components |

### 23.2 discord.js Client Setup

```typescript
import { Client, GatewayIntentBits } from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers, // Privileged
    GatewayIntentBits.MessageContent, // Privileged
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.AutoModerationExecution,
    GatewayIntentBits.GuildMessagePolls,
  ],
});
```

### 23.3 Key Events (discord.js v14 names)

```typescript
client.on("ready", () => {});
client.on("interactionCreate", (interaction) => {});
client.on("messageCreate", (message) => {});
client.on("messageUpdate", (oldMsg, newMsg) => {});
client.on("messageDelete", (message) => {});
client.on("guildMemberAdd", (member) => {});
client.on("guildMemberRemove", (member) => {});
client.on("guildMemberUpdate", (oldMember, newMember) => {});
client.on("voiceStateUpdate", (oldState, newState) => {});
client.on("threadCreate", (thread) => {});
client.on("guildScheduledEventCreate", (event) => {});
client.on("guildScheduledEventUserAdd", (event, user) => {});
client.on("guildAuditLogEntryCreate", (entry) => {});
client.on("autoModerationActionExecution", (execution) => {});
client.on("messagePollVoteAdd", (answer, userId) => {});
client.on("messagePollVoteRemove", (answer, userId) => {});
client.on("entitlementCreate", (entitlement) => {});
```

---

## 24. New & Recent Features (2024-2026)

### 2024

| Date   | Feature                                                                          |
| ------ | -------------------------------------------------------------------------------- |
| Sep 26 | Activities (embedded apps) moved to GA with monetization                         |
| Oct 25 | Webhook Events: HTTP-based events for APPLICATION_AUTHORIZED, ENTITLEMENT_CREATE |
| Dec 12 | Multiple subscription tiers per app                                              |
| Dec 16 | Default file upload limit changed from 25 MiB to 10 MiB (effective Jan 2025)     |

### 2025

| Date      | Feature                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------ |
| Apr 3     | Per-attachment file upload limits (not per-message)                                                    |
| Apr 16-22 | **Components V2 launch**: Section, Container, Separator, TextDisplay, Thumbnail, MediaGallery, File    |
| Apr 29    | Component limit raised to 40 per message                                                               |
| Aug 13    | Social SDK GA: cross-platform messaging, voice, lobbies                                                |
| Aug 20    | `PIN_MESSAGES` permission split from `MANAGE_MESSAGES`                                                 |
| Aug 25    | New modal components: Label, StringSelect in modals                                                    |
| Sep 10    | UserSelect, RoleSelect, MentionableSelect, ChannelSelect, TextDisplay in modals; bot banner/avatar/bio |
| Oct 15    | FileUpload component in modals (0-10 files); Rich Presence name customization                          |
| Nov 20    | `CREATE_GUILD_EXPRESSIONS` and `CREATE_EVENTS` permissions for bots                                    |
| Nov 24    | `BYPASS_SLOWMODE` permission                                                                           |
| Dec 9     | Get Guild Role Member Counts endpoint                                                                  |

### 2026

| Date   | Feature                                                                 |
| ------ | ----------------------------------------------------------------------- |
| Jan 13 | Invites can grant roles and restrict to specific users                  |
| Feb 5  | Community invites standardized CSV format                               |
| Mar 1  | E2EE mandatory for all voice/video calls                                |
| Mar 3  | Context menu commands UI refresh; limit increased from 5 to 15 per type |
| Mar 9  | Developer Portal redesign and docs refresh                              |
| Mar 19 | Search Guild Messages endpoint (new)                                    |

### Key Takeaways for Bot Development

1. **Components V2** is the future -- learn Container/Section/TextDisplay for richer layouts than embeds
2. **New modal components** (RadioGroup, CheckboxGroup, FileUpload) dramatically expand what modals can collect
3. **Polls** are now native and first-class -- no more emoji-based polls
4. **File upload limits decreased** to 10 MiB by default -- plan accordingly
5. **New permissions** (PIN_MESSAGES, BYPASS_SLOWMODE, CREATE_EVENTS, CREATE_GUILD_EXPRESSIONS) offer finer-grained control
6. **15 context menu commands per type** (up from 5) as of March 2026
7. **Search Guild Messages** endpoint (March 2026) enables in-bot message search

---

## Quick Reference: discord.js v14 Key Classes

| Area           | Class/Builder                                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Embeds         | `EmbedBuilder`                                                                                                                          |
| Buttons        | `ButtonBuilder`, `ButtonStyle`                                                                                                          |
| Select Menus   | `StringSelectMenuBuilder`, `UserSelectMenuBuilder`, `RoleSelectMenuBuilder`, `MentionableSelectMenuBuilder`, `ChannelSelectMenuBuilder` |
| Action Rows    | `ActionRowBuilder`                                                                                                                      |
| Modals         | `ModalBuilder`, `TextInputBuilder`, `TextInputStyle`                                                                                    |
| Attachments    | `AttachmentBuilder`                                                                                                                     |
| Slash Commands | `SlashCommandBuilder`                                                                                                                   |
| Context Menus  | `ContextMenuCommandBuilder`                                                                                                             |
| Permissions    | `PermissionFlagsBits`, `PermissionsBitField`                                                                                            |
| Activity       | `ActivityType`                                                                                                                          |
| Formatters     | `bold()`, `italic()`, `time()`, `userMention()`, `codeBlock()`, etc.                                                                    |
| Voice          | `joinVoiceChannel()`, `createAudioPlayer()`, `createAudioResource()` (from `@discordjs/voice`)                                          |
| Collectors     | `message.createReactionCollector()`, `channel.createMessageComponentCollector()`                                                        |
| Intents        | `GatewayIntentBits`                                                                                                                     |
| Channel Types  | `ChannelType`                                                                                                                           |
| Audit Log      | `AuditLogEvent`                                                                                                                         |
| AutoMod        | `AutoModerationRuleTriggerType`, `AutoModerationActionType`                                                                             |
| Polls          | `Poll`, `PollAnswer`                                                                                                                    |
| Monetization   | `Entitlement`, `SKU`                                                                                                                    |

---

_Sources: Discord API Documentation (docs.discord.com), discord.js Guide (discordjs.guide), discord.js API Docs (discord.js.org), Discord Developer Changelog._
