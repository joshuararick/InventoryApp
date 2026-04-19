# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Android inventory management app (Java, API 16–23) using SQLite for local persistence. Built with Android Gradle Plugin 2.3.0 and Gradle 3.3.

## Build & Test Commands

```bash
# Assemble debug APK
./gradlew assembleDebug

# Run unit tests (JVM only — no instrumented tests exist)
./gradlew test

# Run a single test class
./gradlew test --tests "com.rarick.inventoryapp.ExampleUnitTest"

# Clean build outputs
./gradlew clean
```

## Architecture

The app has a single module (`app`) with a flat Activity-based structure — no fragments, no ViewModel, no Repository layer.

**Data flow:**
1. `DBContract` defines the SQLite schema (table name, column constants, CREATE/DROP SQL) for the single `inventory` table.
2. `DBHandler` (`SQLiteOpenHelper`) executes all CRUD operations and returns `ArrayList<Inventory>`.
3. `Inventory` is a plain Java model (id, productName, quantity, price). It has a `quantitySale()` method that decrements quantity (floor 0).
4. Activities interact with `DBHandler` directly — there is no intermediate service or repository.

**Activity navigation:**
- `MainActivity` → reads all inventory rows on `onCreate`, populates a `ListView` via `ListViewAdapter`.
- `ListViewAdapter` (extends `BaseAdapter`) handles the "sale" button (decrements quantity inline) and row clicks (launches `ItemFullDisplayActivity` via Intent extras).
- `AddNewItem` → form for inserting a new item; also handles image selection from the gallery and saves the bitmap to internal storage using the row's sequential ID as the filename.
- `ItemFullDisplayActivity` → displays a single item; loads its image from internal storage by path `filesDir/<rowID - 1>`; supports delete (with confirmation dialog) and "order more" (fires a `mailto:` Intent).

**Image storage convention:** Images are saved to `context.getFilesDir()/<nextID>` at add-time, where `nextID = rowCount() + 1`. They are read back as `filesDir/<id - 1>`. This off-by-one must be preserved when modifying item creation or image loading logic.

## Known Issues / Gotchas

- **Package name inconsistency:** The manifest declares `package="com.Rarick.inventoryapp"` (capital R) but `build.gradle` sets `applicationId "com.samsrutidash.inventoryapp"`. The unit test lives under `com.rarick.inventoryapp` (all lowercase). Keep these as-is unless explicitly reconciling them.
- **`image` column exists in `DBContract` but is never written** — `addItem` and `updateHabitRow` omit `KEY_IMAGE`. The column is present in the schema solely for future use.
- **`DATABASE_VERSION` is 1** — any schema change requires a version bump and a proper `onUpgrade` migration (currently `onUpgrade` drops and recreates the table, losing all data).
- **`ListViewAdapter` calls `notifyDataSetChanged()` inside `getView()`** — this is a legacy pattern that causes redundant redraws; avoid worsening it.
- **`ItemFullDisplayActivity.onSubmitMore`** hardcodes a recipient email address (`workOrderMore@gmail.com`) and a sender name (`Samsruti`) — these are placeholders from the original author.
