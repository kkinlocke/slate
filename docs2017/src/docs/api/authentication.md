# Authentication

Authentication means proving who you are.
This is typically done by providing your user credentials for verification.
There are two ways that clients can provide credentials (authenticate)
with Cloudant: Basic authentication and Cookie authentication.

Basic authentication is similar to showing an ID at a door for checking every time you want to enter.
Cookie authentication is similar to having a key to the door so that you can let yourself in whenever you want. The key is a cookie named `AuthSession`.

<aside class="notice" role="complementary" aria-label="cookiesaregood">When creating or using performance critical Cloudant applications,
Cookie authentication has benefits compared with Basic authentication.
Therefore,
you should prefer Cookie authentication where possible.</aside>

## Basic Authentication

> Example of using HTTP to provide basic authentication credentials in a request:

	GET /db/document HTTP/1.1
	Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=

> Example of using shell to provide basic authentication credentials in a request:

	curl https://$USERNAME:$PASSWORD@$USERNAME.cloudant.com

> Example of using Python to provide basic authentication credentials in a request:

	import cloudant
	
	url = "https://{0}:{1}@{0}.cloudant.com".format(USERNAME, PASSWORD)
	account = cloudant.Account(url)
	ping = account.get()
	print ping.status_code
	# Expected result code: 200

> Example of using Javascript to provide basic authentication credentials in a request:

	var nano = require('nano');
	var account = nano("https://$USERNAME:$PASSWORD@$USERNAME.cloudant.com");
	
	account.request(function (err, body) {
	  if (!err) {
	    console.log(body);
	  }
	});

With Basic authentication, you pass along your credentials as part of every request by adding an `Authorization` header. The value is the authentication scheme (`Basic`), followed by the base-64 encoding of a string created by concatenating your username, the `:` character, and your password. However, most HTTP libraries do this encoding for you.

## Cookie Authentication

Cookie authentication requires you to supply a valid username and password once, at the start of a series of tasks (the session). The response includes a cookie, generated by the server, that confirms you have successfully authenticated. Once created, you send the cookie with all requests that require you to be authenticated. The presence of a valid cookie is sufficient to ensure that your call request is processed rather than rejected immediately as unauthenticated. You can use the cookie until it expires. Logging out causes the cookie to expire immediately.

Method | Path | Description | Headers | Form Parameters
-------|------|-------------|---------|----------------------
`POST` | `/_session` | Do cookie based user login | `Content-Type: application/x-www-form-urlencoded` | name, password
`GET` | `/_session` | Returns cookie based login user information | AuthSession cookie returned by POST request | —
`DELETE` | `/_session` | Logout cookie based user | AuthSession cookie returned by POST request | —

<div></div>

### Requesting a cookie

> Request a cookie using HTTP

	POST /_session HTTP/1.1
	Content-Length: 32
	Content-Type: application/x-www-form-urlencoded
	Accept: */*
	
	name=YourUserName&password=YourPassword

> Request a cookie using shell

	curl https://$USERNAME.cloudant.com/_session \
	     -X POST \
	     -c /path/to/cookiefile
	     -d "name=$USERNAME&password=$PASSWORD"

> Request a cookie using Python

	import cloudant
	
	account = cloudant.Account(USERNAME)
	login = account.login(USERNAME, PASSWORD)
	print login.status_code
	# Expected result code: 200
	logout = account.logout()
	print logout.status_code
	# Expected result code: 200
	all_dbs = account.all_dbs()
	print all_dbs.status_code
	# Expected result code: 401

> Request a cookie using Javascript

	var nano = require('nano');
	var cloudant = nano("https://"+$USERNAME+".cloudant.com");
	var cookies = {}
	
	cloudant.auth($USERNAME, $PASSWORD, function (err, body, headers) {
		if (!err) {
			cookies[$USERNAME] = headers['set-cookie'];
			cloudant = nano({
				url: "https://"+$USERNAME+".cloudant.com",
				cookie: cookies[$USERNAME] 
			});
	
			// ping to ensure we're logged in
			cloudant.request({
				path: 'test_porter'
				}, function (err, body, headers) {
					if (!err) {
						console.log(body, headers);
					}
				});
		}
	});

With Cookie authentication, you use your credentials to acquire a cookie.
Do this by sending a `POST` request to `/_session`.

<div></div>

> Reply to request for a cookie

```
200 OK
Cache-Control: must-revalidate
Content-Length: 42
Content-Type: text/plain; charset=UTF-8
Date: Mon, 04 Mar 2013 14:06:11 GMT
server: CouchDB/1.0.2 (Erlang OTP/R14B)
Set-Cookie: AuthSession="a2ltc3RlYmVsOjUxMzRBQTUzOtiY2_IDUIdsTJEVNEjObAbyhrgz"; Expires=Tue, 05 Mar 2013 14:06:11 GMT; Max-Age=86400; Path=/; HttpOnly; Version=1
x-couch-request-id: a638431d
```

```json
{
  "ok": true,
  "name": "kimstebel",
  "roles": []
}
```

If your credentials are valid, the response contains a cookie which remains active for twenty-four hours.

<div></div>

### Getting cookie information

> Example request for cookie information:

```http
GET /_session HTTP/1.1
Cookie: AuthSession="a2ltc3RlYmVsOjUxMzRBQTUzOtiY2_IDUIdsTJEVNEjObAbyhrgz"; Expires=Tue, 05 Mar 2013 14:06:11 GMT; Max-Age=86400; Path=/; HttpOnly; Version=1
Accept: application/json
```

```shell
curl https://$USERNAME.cloudant.com/_session \
     -X GET \
     -b /path/to/cookiefile
```

When a cookie has been set, information about the logged in user can be retrieved with a `GET` request.

<div> </div>

> Example response to request for cookie information.

```json
{
  "ok": true,
  "info": {
    "authentication_db": "_users",
    "authentication_handlers": ["cookie", "default"],
    "authenticated":"cookie"
  },
  "userCtx": {
    "name": "username",
    "roles": ["_admin","_reader","_writer"]
  }
}
```

The response contains the username, the user's roles and which authentication mechanism was used.

<div></div>

### Deleting a cookie

> Example cookie `DELETE` request:

```http
DELETE /_session HTTP/1.1
Cookie: AuthSession="a2ltc3RlYmVsOjUxMzRBQTUzOtiY2_IDUIdsTJEVNEjObAbyhrgz"; Expires=Tue, 05 Mar 2013 14:06:11 GMT; Max-Age=86400; Path=/; HttpOnly; Version=1
Accept: application/json
```

```shell
curl https://$USERNAME.cloudant.com/_session \
     -X DELETE \
     -b /path/to/cookiefile
```

You can end the session by sending a `DELETE` request to the same URL used to create the cookie. The `DELETE` request must include the cookie you wish to delete.

<div></div>

> Example response to cookie `DELETE` request:

```
200 OK
Cache-Control: must-revalidate
Content-Length: 12
Content-Type: application/json
Date: Mon, 04 Mar 2013 14:06:12 GMT
server: CouchDB/1.0.2 (Erlang OTP/R14B)
Set-Cookie: AuthSession=""; Expires=Fri, 02 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/; HttpOnly; Version=1
x-couch-request-id: e02e0333
```

```json
{
  "ok": true
}
```

The response confirms deletion of the session and sets the `AuthSession` Cookie to `""`.

