import 'package:flutter_test/flutter_test.dart';
import 'package:payday/core/format.dart';

void main() {
  test('formats rupee values using Indian currency formatting', () {
    expect(formatMoney(12000), contains('12,000'));
    expect(formatMoney(0), contains('0'));
  });
}
