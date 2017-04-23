# koa-lazy-multi-session
A lazy koa session and you can get multi session in one request.


### There are many ways to implement session.

- We can store the session data in the client: just simple cookie session or secure jwt session.
- We can store the session data in the server and tell the session_id to the client. And the client can store the session_id in the cookie or the jwt header.


##### Pure client session:
  * Pros:
    1. Simple
    2. Save up the database query
  * Cons:
    1. Cannot store too much data
    2. Consume too much bandwidth

##### Server session:
  * Pros:
    1. Secure
    2. Can save a lot of data
    3. Can implement the function: kick off some other client
  * Cons:
    1. Consume database query

##### Cookie session:
  * Pros:
    1. Simple
  * Cons:
    1. Not secure, can be auto sended by the browser which may easily lead to a CSRF attack

##### Jwt session:
  * Pros:
    1. Secure
  * Cons:
    1. None


They make 4 session implementing ways: **pure client cookie session, pure client jwt session, server session with sid in cookie, server session with sid in jwt header**.


### Best Practice

So I think in normal web application, the best practice of session is `server session with sid in jwt header`, and **the `jwt header` can also store some data which will never be changed like `user_id`**.