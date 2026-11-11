import 'package:intl/intl.dart';
final money=NumberFormat.currency(locale:'en_IN',symbol:'₹',decimalDigits:0);
String formatMoney(num? value)=>money.format(value??0);
