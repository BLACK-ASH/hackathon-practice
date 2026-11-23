import 'package:drift/drift.dart';

import 'database.dart';
import 'errors.dart';

class StorageSession {
  StorageSession(this._database);

  final StorageDatabase _database;

  Future<void> execute(
    String sql, [
    List<Object?> variables = const [],
  ]) async {
    try {
      await _database.customStatement(sql, variables);
    } on StorageException {
      rethrow;
    } catch (error) {
      throw DatabaseOperationException(
        'A local database write failed',
        cause: error,
      );
    }
  }

  Future<int> update(
    String sql, [
    List<Object?> variables = const [],
  ]) async {
    try {
      return await _database.customUpdate(
        sql,
        variables: _variables(variables),
      );
    } on StorageException {
      rethrow;
    } catch (error) {
      throw DatabaseOperationException(
        'A local database write failed',
        cause: error,
      );
    }
  }

  Future<List<Map<String, Object?>>> queryAll(
    String sql, [
    List<Object?> variables = const [],
  ]) async {
    try {
      final rows = await _database
          .customSelect(sql, variables: _variables(variables))
          .get();
      return rows
          .map((QueryRow row) => Map<String, Object?>.from(row.data))
          .toList(growable: false);
    } on StorageException {
      rethrow;
    } catch (error) {
      throw DatabaseOperationException(
        'A local database read failed',
        cause: error,
      );
    }
  }

  Future<Map<String, Object?>?> queryOne(
    String sql, [
    List<Object?> variables = const [],
  ]) async {
    final rows = await queryAll(sql, variables);
    if (rows.isEmpty) {
      return null;
    }
    return rows.first;
  }

  Future<Object?> scalar(
    String sql, [
    List<Object?> variables = const [],
  ]) async {
    final row = await queryOne(sql, variables);
    if (row == null || row.isEmpty) {
      return null;
    }
    return row.values.first;
  }
}

List<Variable<Object>> _variables(List<Object?> values) {
  return values
      .map((Object? value) => Variable<Object>(value))
      .toList(growable: false);
}
