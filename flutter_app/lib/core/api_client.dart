import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
class ApiClient {
 ApiClient._(); static final instance=ApiClient._(); static const _storage=FlutterSecureStorage(); static const _sessionKey='payday_session_cookie';
 static const _baseUrl=String.fromEnvironment('PAYDAY_API_URL',defaultValue:'https://payday-ap.pages.dev');
 late final Dio dio=Dio(BaseOptions(baseUrl:_baseUrl,connectTimeout:const Duration(seconds:20),receiveTimeout:const Duration(seconds:25),headers:{'Accept':'application/json'}));
 String? _cookie; bool get hasSession=>_cookie!=null&&_cookie!.isNotEmpty;
 Future<void> initialize()async{_cookie=await _storage.read(key:_sessionKey);dio.interceptors.add(InterceptorsWrapper(onRequest:(o,h){if(_cookie!=null)o.headers['Cookie']=_cookie;h.next(o);},onResponse:(r,h)async{final raw=r.headers.map['set-cookie'];if(raw!=null)for(final item in raw){if(item.startsWith('payday_session=')){_cookie=item.split(';').first;await _storage.write(key:_sessionKey,value:_cookie);}}h.next(r);}));}
 Future<dynamic> get(String path,[Map<String,dynamic>? query])async=>(await dio.get('/api$path',queryParameters:query)).data;
 Future<dynamic> post(String path,[Map<String,dynamic>? data])async=>(await dio.post('/api$path',data:data??{})).data;
 Future<void> logout()async{try{await post('/auth/logout');}finally{_cookie=null;await _storage.delete(key:_sessionKey);}}
 String message(Object e){if(e is DioException){final d=e.response?.data;if(d is Map&&d['error']!=null)return d['error'].toString();return e.message??'Network error';}return e.toString();}
}
