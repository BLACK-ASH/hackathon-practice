# P2P LAN Messenger

> A cross-platform, serverless, peer-to-peer messaging application for communication over a local network without requiring internet access.

## 1. Project Overview

Build a modern, lightweight, peer-to-peer messaging application that allows users connected to the same local network to discover one another, communicate privately, create group conversations, and share files directly between their devices.

The application should provide an experience similar to modern messaging platforms while eliminating the need for centralized messaging servers, internet connectivity, account registration, or complicated configuration.

The application must be accessible across different device types, including desktops, laptops, tablets, and mobile devices, wherever the platform is supported.

The goal is to make local peer-to-peer communication simple enough for anyone to use.

### Core Concept

Devices running the application on the same Wi-Fi network or hotspot automatically discover one another and communicate directly.

The local network provides connectivity only. It must not host or process the application's messaging service.

---

## 2. Project Goals

- Direct peer-to-peer communication.
- No centralized messaging server.
- No internet dependency.
- Cross-device support.
- Automatic local peer discovery.
- Private messaging.
- Group messaging.
- Direct file sharing.
- Local conversation history.
- Automatic connection management.
- Simple user experience.
- Modular and independent implementation.
- Graceful degradation when features fail.

The application must not require users to understand networking, configure IP addresses, enter ports, or manually establish connections.

---

## 3. Supported Devices

The application must be designed for use across different device categories.

Target platforms:

- Linux.
- Windows.
- macOS.
- Android.
- iOS.
- Tablets and other supported mobile devices.

The architecture must not unnecessarily tie core functionality to a desktop-only environment.

Device-specific capabilities, permissions, networking restrictions, storage access, and UI adaptations must be handled through platform-appropriate implementations.

The application should provide a consistent experience across supported platforms while respecting their native limitations.

---

## 4. Technology and Architecture

The project must use a cross-platform architecture capable of supporting the same core messaging functionality across desktop and mobile.

### Architectural Requirements

- Cross-platform UI.
- Shared application logic wherever possible.
- Platform-specific networking and storage implementations where necessary.
- Direct peer-to-peer communication.
- Local persistent storage.
- Modular feature architecture.
- No central application server.
- No cloud dependencies for core features.

Technology choices must prioritize:

1. Cross-platform support.
2. Reliable local-network communication.
3. Offline functionality.
4. Simple installation and usage.
5. Maintainability.
6. Hackathon implementation feasibility.

Do not lock the architecture into a desktop-only framework if doing so prevents the application from running on mobile devices.

Use a unified codebase wherever practical instead of building separate applications for each platform.

Avoid unnecessary dependencies, services, frameworks, or infrastructure.

---

## 5. Application Features

### 5.1 Automatic Peer Discovery

The application must discover other users running the application on the same local network.

Requirements:

- Automatically discover nearby peers.
- No manual IP address entry.
- Identify peers using unique device identities.
- Display discovered peers.
- Detect peers joining or leaving the network.
- Update availability status.
- Avoid duplicate peer entries.
- Allow users to initiate conversations with discovered peers.

Discovery must work without internet access.

Discovery mechanisms must be abstracted to allow platform-specific implementations when required.

---

### 5.2 Local User Identity

Each application installation must have a persistent local identity.

Requirements:

- Unique peer ID.
- Display name.
- Optional avatar.
- Identity persistence across restarts.
- No centralized registration.
- No phone number requirement.
- No OTP requirement.

Users should be able to set up the application within seconds.

---

### 5.3 Private Messaging

Users must be able to communicate directly with discovered peers.

Requirements:

- Real-time messaging.
- Message timestamps.
- Persistent local history.
- Message ordering.
- Duplicate detection.
- Delivery states where supported.
- Failed message handling.
- Retry mechanism.
- Conversation persistence.
- Access to previous messages when offline.

Messaging must not depend on group messaging or file transfer.

---

### 5.4 Group Messaging

Users must be able to create and participate in group conversations.

Requirements:

- Create groups.
- Set group names.
- Add participants.
- Invite nearby peers.
- Remove members where permitted.
- Leave groups.
- Display group members.
- Send and receive group messages.
- Persist group information.
- Handle unavailable participants.
- Prevent duplicate message processing.
- Handle individual peer failures without interrupting delivery to other reachable peers.

Group communication must operate through direct peer connections.

Avoid unnecessarily complex distributed coordination protocols.

---

### 5.5 File Sharing

Users must be able to send files directly to other peers.

Requirements:

- Send files.
- Receive files.
- Support common file formats.
- Support documents, images, videos, archives, and ordinary files.
- Display filename and file size.
- Display transfer progress.
- Support cancellation where possible.
- Validate incoming file metadata.
- Handle transfer failures.
- Save received files locally.
- Provide access to received files.
- Handle platform-specific file permissions.

File transfer must be independent of the messaging UI and must not block normal communication.

---

### 5.6 Local Conversation History

Conversation history must be stored locally.

Requirements:

- Private messages.
- Group messages.
- Conversation metadata.
- Timestamps.
- Message status where supported.
- Group information.
- Persistence across application restarts.
- Offline access.

Users must be able to access previously stored conversations even when no other peers are available.

---

### 5.7 Peer Status

The application should provide understandable peer states.

Examples:

- Nearby.
- Available.
- Connecting.
- Connected.
- Offline.
- Reconnecting.

The interface must not expose technical connection details to ordinary users.

---

### 5.8 Offline Operation

The application must not require internet access for its core features.

Without internet connectivity, users must still be able to:

- Open the application.
- Discover peers on the local network.
- Connect directly to peers.
- Send private messages.
- Send group messages.
- Share files.
- Access local conversation history.

Internet connectivity must not be used as a hidden prerequisite for messaging.

---

## 6. How the Application Works

### Application Startup

When the application starts:

1. Load local identity.
2. Load settings.
3. Initialize local storage.
4. Initialize available modules.
5. Start peer discovery.
6. Restore local conversations.
7. Display the main interface.

Module failures must not prevent the application from starting.

### Peer Discovery

Devices discover one another using local-network discovery mechanisms.

The application maintains a peer registry containing relevant information such as:

- Peer ID.
- Display name.
- Device information where appropriate.
- Availability.
- Connection state.

Discovery must be automatic and platform-compatible.

### Direct Connection

When communication is initiated, devices establish a direct connection.

The connection layer manages:

- Establishing connections.
- Sending and receiving data.
- Connection state.
- Disconnection.
- Reconnection.
- Heartbeats where appropriate.
- Peer failures.

### Private Messaging

When a message is sent:

1. Create a unique message ID.
2. Construct the message payload.
3. Store the message locally.
4. Send it through the peer communication layer.
5. Process the received payload on the recipient.
6. Validate the incoming message.
7. Store it locally.
8. Update the recipient's conversation.
9. Return delivery information where supported.
10. Update the sender's message status.

Messages must be handled safely if duplicated, delayed, or received out of order.

### Group Messaging

Group messaging uses direct peer connections to distribute messages to group participants.

Each participant maintains local group metadata.

Group messages must:

- Contain group identity.
- Contain sender identity.
- Contain unique message IDs.
- Be validated.
- Avoid duplicate processing.
- Be distributed to available participants.
- Handle unavailable participants individually.

A failed connection to one participant must not block communication with other participants.

### File Transfer

Files are transferred directly between peers.

The sender:

1. Selects a file.
2. Initiates the transfer.
3. Sends transfer metadata.
4. Sends the file data.
5. Reports transfer progress.

The receiver:

1. Receives the transfer request.
2. Validates metadata.
3. Accepts or rejects the transfer according to the application's behavior.
4. Receives file data.
5. Validates completion.
6. Saves the file locally.
7. Reports completion or failure.

Transfers must not interfere with messaging.

---

## 7. Module Architecture

The application must be divided into independent modules with clear responsibilities.

### Module 1 — Core & Foundation

Responsibilities:

- Application lifecycle.
- Shared contracts.
- Common types.
- Local identity.
- Configuration.
- Module lifecycle.
- Module registration.
- Health/status reporting.
- Common errors.
- Event definitions.
- Application coordination.

### Module 2 — Peer Discovery & Network Core

Responsibilities:

- Local peer discovery.
- Peer registry.
- Peer identity exchange.
- Connection establishment.
- Direct peer connections.
- Connection lifecycle.
- Heartbeats.
- Availability.
- Reconnection.
- Network events.
- Platform-specific networking adapters.

### Module 3 — Messaging Engine

Responsibilities:

- Private messages.
- Message IDs.
- Sending and receiving.
- Ordering.
- Duplicate detection.
- Delivery states.
- Retry logic.
- Conversation history.
- Messaging persistence.

### Module 4 — Group System

Responsibilities:

- Group creation.
- Group identity.
- Group metadata.
- Invitations.
- Membership management.
- Join and leave operations.
- Group message distribution.
- Duplicate handling.
- Group persistence.

### Module 5 — File Transfer

Responsibilities:

- Transfer initiation.
- Metadata.
- Direct transfer.
- File validation.
- Progress.
- Cancellation.
- Received-file management.
- Storage.
- Transfer status.
- Error handling.

### Module 6 — Local Storage

Responsibilities:

- Local database.
- Conversation persistence.
- Message persistence.
- Group persistence.
- Identity persistence.
- Settings persistence.
- File metadata.
- Data access interfaces.
- Database error handling.

Local storage must not require cloud infrastructure.

---

## 8. Dependency Hierarchy

### Level 0 — Foundation

Establish:

- Application structure.
- Shared contracts.
- Types.
- Interfaces.
- Identity.
- Configuration.
- Module lifecycle.
- Events.
- Error handling.
- Storage interfaces.
- Mock dependencies.

This level must remain small and must be completed early enough to allow parallel development.

### Level 1 — Independent Infrastructure

Develop independently:

- Application shell.
- Peer discovery and Network Core.
- Local Storage.
- UI navigation.
- Mock transport.
- Module availability handling.

Modules must be independently buildable and testable.

### Level 2 — Core Messaging

Implement:

- Peer discovery.
- Direct connections.
- Private messaging.
- Local persistence.
- Conversation history.
- Basic connection status.

This level produces the first working application.

### Level 3 — Core Features

Implement:

- Group chats.
- File transfer.
- Multiple peers.
- Connection recovery.
- Message delivery states.
- Transfer progress.

### Level 4 — Enhancements

Implement optional features:

- Reactions.
- Read receipts.
- Typing indicators.
- Message editing.
- Message deletion.
- Transfer resumption.
- Rich previews.
- UI polish.

Enhancements must not block the core application.

---

## 9. Dependency Rules

Dependencies must be minimal and one-directional.

- Application Shell → module interfaces.
- Messaging → Network Core interface + Storage interface.
- Groups → Network Core interface + Storage interface.
- File Transfer → Network Core interface + Storage interface.
- Network Core → Foundation.
- Storage → Foundation.
- All modules → shared contracts where necessary.

### Prohibited Dependencies

- Messaging → Group System internals.
- Group System → Messaging internals.
- File Transfer → Messaging internals.
- Network Core → UI.
- Network Core → chat business logic.
- Feature modules → unrelated feature internals.
- Circular dependencies.

Modules must communicate through stable interfaces, events, or contracts.

---

## 10. Cross-Platform Requirements

The application must be designed for multiple operating systems and device types.

### Platform Independence

Core business logic should not depend on a specific operating system.

Platform-specific behavior must be isolated behind interfaces or adapters.

Examples include:

- Network discovery.
- Socket configuration.
- Permissions.
- File system access.
- Notifications.
- Background execution.
- Local storage.
- Device-specific UI behavior.

### Platform Adaptation

Where platform capabilities differ:

- Use a shared interface.
- Implement platform-specific adapters.
- Keep the difference isolated.
- Avoid duplicating the entire feature.
- Provide a graceful fallback when a platform cannot support a capability.

### UI Adaptation

The interface must adapt to screen size and interaction type.

- Desktop: sidebar and expanded chat layout.
- Tablet: adaptive split-pane layout.
- Mobile: compact navigation and full-screen conversation layout.

Do not simply shrink the desktop interface to fit mobile.

Mobile must be designed for touch interaction.

---

## 11. Mocking and Independent Development

Modules must be implementable without waiting for their dependencies.

### Network Core

Provide testing mechanisms for:

- Peer discovery.
- Connection establishment.
- Connection failure.
- Disconnection.
- Reconnection.
- Peer availability.

### Messaging

Provide mock transport for:

- Successful messages.
- Delayed messages.
- Failed messages.
- Duplicate messages.
- Offline peers.

### Groups

Provide mock peers for:

- Group creation.
- Invitations.
- Member changes.
- Group message distribution.
- Disconnections.

### File Transfer

Provide mock transfer mechanisms for:

- Successful transfers.
- Interrupted transfers.
- Invalid files.
- Transfer cancellation.
- Progress reporting.
- Transfer failures.

### Application Shell

Allow modules to be mocked, disabled, or simulated as unavailable.

Mock implementations must be replaceable with real implementations through stable interfaces.

---

## 12. Fault Isolation

The application must remain usable when individual modules fail.

| Failure | Expected behavior |
|---|---|
| Peer discovery failure | Application opens; discovery unavailable |
| Network disconnection | Local history remains available |
| Messaging failure | Other modules remain operational |
| Group failure | Private messaging continues |
| File transfer failure | Messaging continues |
| Storage failure | Report error; recover where possible |
| Platform capability unavailable | Feature disabled or fallback used |
| One peer fails | Other peers remain operational |
| Enhancement failure | Only the enhancement is disabled |

### Required Practices

- Independent module initialization.
- Error boundaries.
- Safe error propagation.
- Timeouts.
- Module health/status.
- Optional feature registration.
- Fallback implementations.
- No cascading failures.
- No application-wide crashes caused by recoverable module failures.

Do not silently ignore errors.

---

## 13. Development Priorities

### P0 — Minimum Viable Application

- Application startup.
- Cross-platform UI foundation.
- Local identity.
- Peer discovery.
- Direct connections.
- Private messaging.
- Local message history.
- Basic peer status.
- Offline access to history.

**Success criteria:** Two supported devices on the same local network can discover one another and exchange messages without internet.

### P1 — Core Hackathon Features

- Group chat.
- Multiple peers.
- File sharing.
- Transfer progress.
- Peer status.
- Basic reconnect.
- Persistent conversations.

**Success criteria:** Multiple devices can communicate in groups and share files directly over a local network.

### P2 — Enhancements

- Reactions.
- Read receipts.
- Typing indicators.
- Message editing.
- Message deletion.
- Transfer resumption.
- Rich media previews.
- UI refinements.

Only implement P2 features after P0 and P1 are stable.

---

## 14. Cumulative Milestones

### Milestone 1 — Foundation

- Application launches.
- UI works.
- Identity is created.
- Navigation works.
- Modules initialize independently.
- Mock data works.

### Milestone 2 — Peer Connectivity

- Devices discover each other.
- Peers appear in the UI.
- Direct connections are established.
- Connection status is visible.

### Milestone 3 — Private Messaging

- Messages send and receive.
- History persists.
- Conversations restore.
- Disconnects are handled.

### Milestone 4 — Group Messaging

- Groups can be created.
- Participants can be added.
- Group messages are distributed.
- Individual peer failures are handled.

### Milestone 5 — File Sharing

- Files can be sent and received.
- Transfer progress works.
- Validation works.
- Transfer errors are handled.

### Milestone 6 — Cross-Platform Stabilization

- Test supported devices.
- Test desktop and mobile layouts.
- Test network loss.
- Test module failures.
- Test different local network environments.
- Fix integration issues.
- Polish the UI.

Every milestone must leave the project in a runnable, demonstrable state.

---

## 15. UI/UX Guidelines

The application must feel like a modern messaging platform.

### Design Principles

- Simple.
- Minimal.
- Modern.
- Responsive.
- Consistent.
- Touch-friendly.
- Accessible.
- Easy to understand.

### Interface Requirements

- Conversation list.
- Nearby peers.
- Private chat screen.
- Group chat screen.
- Group member view.
- File transfer interface.
- Connection indicators.
- Settings.
- Empty states.
- Loading states.
- Error states.
- Appropriate navigation for desktop and mobile.

Avoid exposing:

- IP addresses.
- Ports.
- Raw network errors.
- Socket information.
- Protocol details.

Users should interact with people and conversations, not network infrastructure.

---

## 16. Networking Constraints

The application operates primarily within the same local network.

Preferred communication approach:

- Local peer discovery.
- Direct peer connections.
- Reliable communication transport.
- Independent connection management.
- Platform-specific networking adapters when required.

The network must not be used as a central messaging server.

The application must account for local network restrictions, including:

- Client isolation.
- Firewall restrictions.
- Blocked broadcasts.
- Network permission restrictions.
- Mobile operating system limitations.
- Background execution restrictions.
- Devices on incompatible network segments.

Do not assume every hotspot or Wi-Fi network permits direct peer-to-peer communication.

When direct communication is unavailable, show an understandable error instead of crashing or silently failing.

---

## 17. Security and Reliability

Local networks must not automatically be treated as trusted environments.

Requirements:

- Validate incoming payloads.
- Validate message structures.
- Validate file metadata.
- Avoid arbitrary file writes.
- Prevent path traversal.
- Enforce reasonable file limits.
- Handle malformed data safely.
- Avoid duplicate message processing.
- Handle disconnections.
- Protect local data from accidental corruption.
- Prevent unexpected peers from causing application instability.

Security mechanisms should be designed into the communication architecture, even if some advanced protections are deferred for the hackathon.

---

## 18. Agent Development Rules

AI coding agents must follow these rules.

### Before Making Changes

1. Inspect the existing project.
2. Understand its architecture.
3. Review existing implementations.
4. Identify the relevant module.
5. Check interfaces and contracts.
6. Identify dependencies.
7. Avoid duplicating existing functionality.

### During Implementation

- Respect module boundaries.
- Work within the relevant scope.
- Avoid unnecessary refactoring.
- Avoid unrelated file changes.
- Do not introduce circular dependencies.
- Do not overengineer.
- Use mocks where appropriate.
- Handle errors properly.
- Keep code maintainable.
- Do not create fake implementations presented as completed features.
- Do not claim functionality works without testing.

### Testing

Use appropriate testing levels:

- Unit tests.
- Module tests.
- Integration tests.
- Mock tests.
- Real-device network tests.
- Failure and recovery tests.

### Documentation

Update documentation whenever architecture, interfaces, setup, configuration, or functionality changes.

Documentation must describe actual implemented behavior.

### Phase Completion and Handoff

Whenever a phase is completed, before doing anything else, provide a **Phase Completion Report** containing:

- What was implemented.
- Files/modules changed.
- Validation and test results.
- Remaining issues or blockers.
- Commit hash, if applicable.

After completing a phase and presenting its report, **STOP**. Do not automatically begin the next phase, task, or implementation. Wait for explicit approval from the user.

Before starting the next phase, only after explicit approval:

1. Switch to `dev`.
2. Pull the latest `dev` from origin.
3. Create a dedicated feature branch for the next phase from the updated `dev`.
4. Verify the branch and working tree before beginning implementation.

```bash
git switch dev
git pull origin dev
git switch -c feature/<phase-name>
```

In a linked worktree, follow the equivalent safe workflow: start from the updated `dev`, create the dedicated branch there, and verify the branch and working tree before implementation.

### Blocker Rule — Absolutely Mandatory

If the next task, phase, or feature is blocked by another team member, an unfinished module, a missing dependency, an unavailable integration, or any other external prerequisite:

- Do not invent substitute work.
- Do not implement an alternative feature just to remain busy.
- Do not bypass the dependency using mocks unless mocks are explicitly part of the assigned task.
- Do not start unrelated tasks.
- Do not attempt to take over another member's assigned work.
- Do not perform unnecessary audits, refactoring, scaffolding, or tests to fill the gap.
- Clearly report what is blocked, who or what it depends on, and what is needed to unblock it.
- **STOP** and wait for further instructions.

---

## 19. Parallel Module Development Rules

- Modules must represent complete, meaningful capabilities, not artificial subdivisions of a single feature.
- A module must own its internal logic, state, UI where applicable, persistence requirements, validation, and tests.
- Never divide a single module into assignments such as controller, service, repository, UI, and protocol for different team members.
- Do not create redundant modules that duplicate responsibilities or require each other to implement the same capability.
- Modules must be independently implementable, testable, and demonstrable using mocks.
- Cross-module communication must use predefined public contracts, interfaces, and events.
- Modules must not import, manipulate, or depend on another module's internal implementation.
- A module must not require another module's unfinished implementation to begin or complete its own development.
- Use mock providers and adapters wherever real integrations are not yet available.
- Integration work must connect completed modules; it must not reimplement their functionality.
- If two proposed modules cannot function or be tested independently, reconsider their boundaries before assigning them to different developers.
- Do not create additional modules solely to distribute work among team members.
- Prefer fewer, complete, independently owned modules over excessive fragmentation.
- Modules must degrade gracefully if optional integrations are unavailable.

---

## 20. Git Safety

- **Strict rule:** every feature must be implemented on its own separate branch, merged into `dev` after validation, and only then merged into `main`. Never commit a feature directly to `dev` or `main`.
- Never implement directly on `main`.
- `main` is reserved for production-ready code.
- Use feature branches for implementation.
- Every implementation branch must be created from an updated `dev`.
- Use `dev` for integration and testing.
- Integrate into `dev` only after validation.
- Never push unvalidated code directly to `main`.
- Do not overwrite another developer's changes.
- Do not discard existing modifications without permission.
- Never force-push, hard-reset, or otherwise overwrite or discard existing changes.
- Keep commits focused.
- Validate before integration.

When work is performed in a linked worktree, start from the updated `dev`, verify the branch and working tree, then validate the completed feature and merge its feature branch back into `dev` through the integration workflow.

---

## 21. Definition of Done

A feature is complete only when:

- It is implemented.
- It works as intended.
- Its module boundaries are respected.
- Errors are handled.
- It has been tested.
- It does not break existing features.
- It integrates through the defined interfaces.
- Its documentation is updated where necessary.
- It has been validated.

A UI without working functionality is not a completed feature unless explicitly identified as a prototype.

A mock implementation must be clearly identified as a mock.

---

## 22. Final Product Vision

A user should be able to install the application on their device, open it, set a display name, automatically discover nearby users, start a private conversation, create a group, and share files without requiring internet connectivity or centralized infrastructure.

The application should work across supported desktop and mobile devices, adapting to the platform without sacrificing its simplicity.

The complexity of peer-to-peer networking, connection management, synchronization, and storage must remain hidden from the user.

**The final product is a cross-platform, installable, offline-first, serverless LAN messenger that enables direct communication between nearby devices with the simplicity of a modern messaging application.**
