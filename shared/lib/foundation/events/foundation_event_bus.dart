import '../../contracts/contracts.dart';

class FoundationEventBus implements EventBus {
  FoundationEventBus({required this._errorReporter});

  final ErrorReporter _errorReporter;
  final Map<Type, List<_EventSubscription>> _subscriptions =
      <Type, List<_EventSubscription>>{};

  @override
  EventSubscription subscribe<T extends FoundationEvent>(
    void Function(T event) handler,
  ) {
    final subscription = _EventSubscription<T>(handler: handler);
    _subscriptions
        .putIfAbsent(T, () => <_EventSubscription>[])
        .add(subscription);
    return subscription;
  }

  @override
  void publish(FoundationEvent event) {
    final listeners =
        _subscriptions[event.runtimeType]?.toList() ?? <_EventSubscription>[];
    for (final listener in listeners) {
      if (!listener.isActive) {
        continue;
      }
      try {
        listener.invoke(event);
      } catch (error) {
        _errorReporter.report(
          FoundationError.communication(
            'Event delivery failed for ${event.runtimeType}.',
            cause: error,
          ),
        );
      }
    }
  }
}

class _EventSubscription<T extends FoundationEvent> implements EventSubscription {
  _EventSubscription({required this._handler});

  final void Function(T event) _handler;
  bool _isActive = true;

  @override
  bool get isActive => _isActive;

  @override
  void cancel() {
    _isActive = false;
  }

  void invoke(FoundationEvent event) {
    _handler(event as T);
  }
}
