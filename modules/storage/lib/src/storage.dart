import 'dart:io';

import 'package:drift/drift.dart' show QueryExecutor;
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;

import 'config.dart';
import 'database.dart';
import 'errors.dart';
import 'migrations.dart';
import 'schema.dart';
import 'session.dart';
import 'settings.dart';

enum StorageState { uninitialized, ready, closed, failed }

class StorageHealth {
  const StorageHealth({
    required this.state,
    required this.schemaVersion,
    required this.databasePath,
    this.error,
  });

  final StorageState state;
  final int? schemaVersion;
  final String? databasePath;
  final String? error;
}

class Storage {
  Storage([StorageConfig? config])
      : this._(
          config ?? StorageConfig(),
          null,
          null,
        );

  static Future<Storage> inMemory({StorageConfig? config}) {
    final storage = Storage._(
      config ?? StorageConfig(),
      () => NativeDatabase.memory(),
      ':memory:',
    );
    return storage.initialize();
  }

  Storage._(
      this.config, QueryExecutor Function()? executorFactory, String? path)
      : _executorFactory = executorFactory,
        _databasePath = path ?? config.resolvedDatabasePath;

  final StorageConfig config;
  final QueryExecutor Function()? _executorFactory;
  final String _databasePath;

  StorageDatabase? _database;
  SettingsStore? _settings;
  StorageState _state = StorageState.uninitialized;
  String? _error;
  int? _schemaVersion;

  StorageState get state => _state;

  bool get isReady => _state == StorageState.ready;

  String get databasePath => _databasePath;

  Future<Storage> initialize() async {
    if (_state == StorageState.ready) {
      return this;
    }

    StorageDatabase? database;
    try {
      final executor = _executorFactory?.call() ?? _openFileExecutor();
      database = StorageDatabase(executor);
      final migrations = <StorageMigration>[
        ...coreMigrations,
        ...config.additionalMigrations,
      ];
      final report = await MigrationRunner(migrations).run(database);
      _settings = SettingsStore(
        StorageSession(database),
        config.settingDefinitions,
      );
      _database = database;
      _schemaVersion = report.schemaVersion;
      _state = StorageState.ready;
      _error = null;
      return this;
    } on StorageException catch (error) {
      _state = StorageState.failed;
      _error = error.message;
      _database = null;
      _settings = null;
      _schemaVersion = null;
      if (database != null) {
        await _closeQuietly(database);
      }
      rethrow;
    } catch (error) {
      _state = StorageState.failed;
      _error = 'Failed to initialize local storage';
      _database = null;
      _settings = null;
      _schemaVersion = null;
      if (database != null) {
        await _closeQuietly(database);
      }
      throw StorageInitializationException(
        'Failed to initialize local storage',
        cause: error,
      );
    }
  }

  Future<void> close() async {
    final database = _database;
    _database = null;
    _settings = null;
    _state = StorageState.closed;
    _error = null;
    if (database == null) {
      return;
    }
    try {
      await database.close();
    } catch (error) {
      _state = StorageState.failed;
      _error = 'Failed to close local storage';
      throw DatabaseOperationException(
        'Failed to close local storage',
        cause: error,
      );
    }
  }

  SettingsStore get settings {
    _requireReady();
    return _settings!;
  }

  int get schemaVersion {
    _requireReady();
    return _schemaVersion!;
  }

  StorageHealth health() {
    return StorageHealth(
      state: _state,
      schemaVersion: _schemaVersion,
      databasePath: _databasePath,
      error: _error,
    );
  }

  Future<List<AppliedMigration>> appliedMigrations() {
    _requireReady();
    return readAppliedMigrations(_database!);
  }

  Future<MigrationReport> applyMigrations(
    Iterable<StorageMigration> migrations,
  ) async {
    _requireReady();
    final report = await MigrationRunner(migrations).run(_database!);
    _schemaVersion = report.schemaVersion;
    return report;
  }

  Future<void> execute(
    String sql, [
    List<Object?> variables = const [],
  ]) {
    _requireReady();
    return _session.execute(sql, variables);
  }

  Future<int> update(
    String sql, [
    List<Object?> variables = const [],
  ]) {
    _requireReady();
    return _session.update(sql, variables);
  }

  Future<List<Map<String, Object?>>> queryAll(
    String sql, [
    List<Object?> variables = const [],
  ]) {
    _requireReady();
    return _session.queryAll(sql, variables);
  }

  Future<Map<String, Object?>?> queryOne(
    String sql, [
    List<Object?> variables = const [],
  ]) {
    _requireReady();
    return _session.queryOne(sql, variables);
  }

  Future<Object?> scalar(
    String sql, [
    List<Object?> variables = const [],
  ]) {
    _requireReady();
    return _session.scalar(sql, variables);
  }

  Future<T> transaction<T>(
    Future<T> Function(StorageSession session) action,
  ) async {
    _requireReady();
    try {
      return await _database!.transaction(
        () => action(StorageSession(_database!)),
      );
    } on StorageException {
      rethrow;
    } catch (error) {
      throw DatabaseOperationException(
        'A local database transaction failed',
        cause: error,
      );
    }
  }

  StorageSession get _session => StorageSession(_database!);

  void _requireReady() {
    if (_state != StorageState.ready || _database == null) {
      throw StorageNotInitializedException(
        'Storage is not ready (state: ${_state.name})',
      );
    }
  }

  QueryExecutor _openFileExecutor() {
    final path = config.resolvedDatabasePath;
    try {
      Directory(p.dirname(path)).createSync(recursive: true);
    } catch (error) {
      throw StorageInitializationException(
        'Failed to create the local storage directory',
        cause: error,
      );
    }

    return NativeDatabase.createInBackground(
      File(path),
      setup: (database) {
        database.execute('PRAGMA foreign_keys = ON');
        database.execute('PRAGMA busy_timeout = ${config.busyTimeoutMs}');
        if (config.enableWal) {
          database.execute('PRAGMA journal_mode = WAL');
        }
      },
    );
  }

  static Future<void> _closeQuietly(StorageDatabase database) async {
    try {
      await database.close();
    } catch (_) {}
  }
}
